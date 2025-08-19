import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import fs from "node:fs";
import type { ProjectData } from "@/lib/types";

const MODEL_ALIAS = process.env.ANTHROPIC_MODEL?.trim() || "claude-4-sonnet";
const MODEL_MAP: Record<string, string> = {
  "claude-4-sonnet": "claude-sonnet-4-20250514",
  "claude-3-5-haiku": "claude-3-5-haiku-latest",
  "claude-3-7-sonnet": "claude-3-7-sonnet-latest",
};
const MODEL = MODEL_MAP[MODEL_ALIAS] ?? MODEL_ALIAS;

function findProjectFile(projectId: string): string | null {
  const dir = path.join(process.cwd(), "public", "demo", "projects");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const byName = files.find((f) => f.toLowerCase().includes(projectId.toLowerCase()));
  if (byName) return path.join(dir, byName);
  for (const f of files) {
    try {
      const p = path.join(dir, f);
      const j = JSON.parse(fs.readFileSync(p, "utf8")) as ProjectData;
      if (j?.meta?.project_id?.toLowerCase() === projectId.toLowerCase()) return p;
    } catch {}
  }
  return null;
}

function buildContext(doc: ProjectData) {
  const clusters = doc.clusters ?? [];
  const personas = doc.personas ?? [];
  const meta = doc.meta ?? {};

  const topClusters = clusters
    .slice()
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      label: c.label,
      share: c.share ?? 0,
      sentiment: c.sentiment ?? 0,
      summary: c.summary ?? "",
      strengths: c.strengths ?? [],
      weaknesses: c.weaknesses ?? [],
      keywords: c.keywords ?? [],
      sampleQuotes: (c.quotes ?? []).slice(0, 3).map((q) => q.text),
    }));

  // 👇 fix: titoli tolleranti alle varianti
  const personasBrief = personas.map((p: any) => ({
    title: p?.title ?? p?.name ?? p?.label ?? "",
    share: p?.share ?? 0,
    goals: (p?.goals ?? []).slice(0, 5),
    pains: (p?.pains ?? p?.pain_points ?? []).slice(0, 5),
  }));

  return { meta, topClusters, personas: personasBrief };
}

const SYSTEM = `You are InsightSuite's analyst assistant.
Answer ONLY using the provided dataset facts. If you cannot find an answer in the context, say so.
Avoid stereotypes and sensitive attributes. Keep it concise and actionable.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { question?: string; projectId?: string };
    if (!body?.question || !body?.projectId) {
      return NextResponse.json({ error: "Missing 'question' or 'projectId'." }, { status: 400 });
    }

    const file = findProjectFile(body.projectId);
    if (!file) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const json = JSON.parse(fs.readFileSync(file, "utf8")) as ProjectData;
    const ctx = buildContext(json);

    if (!process.env.ANTHROPIC_API_KEY) {
      const bullets = ctx.topClusters
        .map((c) => `• ${c.label} — share ${(c.share * 100).toFixed(1)}%, sentiment ${c.sentiment.toFixed(2)}`)
        .join("\n");
      return NextResponse.json({ answer: `**DEMO (no LLM)**\n\nTop cluster:\n${bullets}`, usedModel: "demo-fallback" });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const prompt =
      `PROJECT META:\n${JSON.stringify(ctx.meta, null, 2)}\n\n` +
      `TOP CLUSTERS:\n${JSON.stringify(ctx.topClusters, null, 2)}\n\n` +
      `PERSONAS:\n${JSON.stringify(ctx.personas, null, 2)}\n\n` +
      `QUESTION:\n${body.question}`;

    const msg = await client.messages.create({
      model: MODEL,
      system: SYSTEM,
      max_tokens: 900,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const answer =
      (Array.isArray((msg as any)?.content)
        ? (msg as any).content.map((p: any) => p?.text ?? "").join("")
        : (msg as any)?.content?.[0]?.text) || "Nessuna risposta disponibile.";

    return NextResponse.json({ answer, usedModel: MODEL_ALIAS });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
