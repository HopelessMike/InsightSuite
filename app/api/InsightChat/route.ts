import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import fs from "node:fs";
import type { ProjectData } from "@/lib/types";

const MODEL_ALIAS = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20250106";
const MODEL_MAP: Record<string, string> = {
  "claude-3-5-sonnet": "claude-3-5-sonnet-20250106",
  "claude-3-5-haiku": "claude-3-5-haiku-20241022", 
  "claude-3-opus": "claude-3-opus-20240229",
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
  const aggregates = doc.aggregates ?? {};
  const timeseries = doc.timeseries ?? {};

  // Prepare comprehensive context for LLM
  const topClusters = clusters
    .slice()
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      label: c.label,
      share: c.share ?? 0,
      sentiment: c.sentiment ?? 0,
      opportunity_score: c.opportunity_score ?? 0,
      summary: c.summary ?? "",
      strengths: c.strengths ?? [],
      weaknesses: c.weaknesses ?? [],
      keywords: c.keywords ?? [],
      trend: c.trend ?? [],
      size: c.size ?? 0,
      sampleQuotes: (c.quotes ?? []).slice(0, 3).map((q) => q.text),
    }));

  // Fix: Handle personas title variations
  const personasBrief = personas.map((p: any) => ({
    title: p?.title ?? p?.name ?? p?.label ?? "",
    share: p?.share ?? 0,
    goals: (p?.goals ?? []).slice(0, 5),
    pains: (p?.pains ?? p?.pain_points ?? []).slice(0, 5),
    behaviors: p?.behaviors ?? [],
    demographics: p?.demographics ?? {},
  }));

  // Calculate trends and insights
  const trendingNegative = clusters.filter(c => {
    if (!c.trend || c.trend.length < 2) return false;
    const recent = c.trend[c.trend.length - 1].count;
    const old = c.trend[0].count;
    return recent < old && c.sentiment < 0;
  });

  const trendingPositive = clusters.filter(c => {
    if (!c.trend || c.trend.length < 2) return false;
    const recent = c.trend[c.trend.length - 1].count;
    const old = c.trend[0].count;
    return recent > old && c.sentiment > 0;
  });


  // Fix: Handle timeseries data safely with proper optional chaining
  const latestSentiment = timeseries && timeseries.monthly && timeseries.monthly.length > 0
    ? timeseries.monthly[timeseries.monthly.length - 1].sentiment_mean
    : undefined;
    
  const sentimentTrend = timeseries && timeseries.monthly && timeseries.monthly.length > 1
    ? (timeseries.monthly[timeseries.monthly.length - 1]?.sentiment_mean ?? 0) - (timeseries.monthly[0]?.sentiment_mean ?? 0)
    : 0;

  return { 
    meta, 
    aggregates,
    topClusters, 
    allClusters: clusters.length,
    personas: personasBrief,
    trendingNegative: trendingNegative.slice(0, 3),
    trendingPositive: trendingPositive.slice(0, 3),
    timeseries: {
      hasData: !!timeseries?.monthly && timeseries.monthly.length > 0,
      latestSentiment,
      sentimentTrend
    }
  };
}

export async function POST(req: NextRequest) {
  console.log("InsightChat API called");
  try {
    const body = await req.json();
    const { question, projectId } = body;
    
    console.log("Request:", { question: question?.substring(0, 50) + "...", projectId });

    if (!question || !projectId) {
      console.log("Missing required parameters");
      return NextResponse.json(
        { error: "Missing question or projectId" },
        { status: 400 }
      );
    }

    // Find and load project data
    const projectFile = findProjectFile(projectId);
    if (!projectFile) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData: ProjectData = JSON.parse(fs.readFileSync(projectFile, "utf8"));
    const context = buildContext(projectData);

    // Initialize Anthropic client
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("ANTHROPIC_API_KEY not found in environment variables");
      return NextResponse.json(
        { 
          error: "ANTHROPIC_API_KEY not configured",
          answer: "ANTHROPIC_API_KEY not configured - using fallback mode" 
        },
        { status: 200 } // Changed to 200 so frontend can handle gracefully
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Create comprehensive prompt for LLM
    const systemPrompt = `Sei un esperto analista di customer insights per ${projectId.toUpperCase()}. 
Rispondi in italiano in modo professionale e dettagliato. 

CONTESTO DEL PROGETTO:
- Progetto: ${(context.meta as any).project_name || projectId}
- Dataset: ${(context.aggregates as any).total_reviews?.toLocaleString() || "N/A"} recensioni
- Sentiment medio: ${context.aggregates.sentiment_mean?.toFixed(2) || "N/A"}
- Cluster identificati: ${context.allClusters}
- Personas identificate: ${context.personas.length}

TOP CLUSTER (ordinati per impatto):
${context.topClusters.map((c, i) => `${i+1}. ${c.label} - Impact: ${(c.share*100).toFixed(1)}% - Sentiment: ${c.sentiment.toFixed(2)} - Opportunity: ${c.opportunity_score.toFixed(2)}
   Punti di forza: ${c.strengths.join(", ")}
   Criticità: ${c.weaknesses.join(", ")}
   Keywords: ${c.keywords.join(", ")}
   Quotes esempio: "${c.sampleQuotes.join('", "')}"
`).join("\n")}

PERSONAS:
${context.personas.map((p, i) => `${i+1}. ${p.title} (${(p.share*100).toFixed(1)}% utenti)
   Obiettivi: ${p.goals.join(", ")}
   Pain Points: ${p.pains.join(", ")}
   Comportamenti: ${p.behaviors.join(", ")}
`).join("\n")}

TREND ANALYSIS:
- Cluster in miglioramento: ${context.trendingPositive.map(c => c.label).join(", ") || "Nessuno identificato"}
- Cluster in peggioramento: ${context.trendingNegative.map(c => c.label).join(", ") || "Nessuno identificato"}
- Sentiment trend: ${context.timeseries.sentimentTrend > 0 ? "Positivo" : context.timeseries.sentimentTrend < 0 ? "Negativo" : "Stabile"} (${context.timeseries.sentimentTrend?.toFixed(3) || "N/A"})

Rispondi alla domanda dell'utente usando questi dati. Fornisci insights dettagliati, numeri specifici, e raccomandazioni concrete quando appropriato.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: question
        }
      ],
    });

    const answer = response.content[0].type === "text" ? response.content[0].text : "Errore nel processare la risposta";

    return NextResponse.json({ answer });

  } catch (error) {
    console.error("InsightChat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}