import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import fs from "node:fs";
import type { ProjectData } from "@/lib/types";

const MODEL_ALIAS = process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet";
const MODEL_MAP: Record<string, string> = {
  "claude-3-5-sonnet": "claude-3-5-sonnet-latest",
  "claude-3-5-haiku": "claude-3-5-haiku-latest",
  "claude-3-opus": "claude-3-opus-latest",
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
    ? timeseries.monthly[timeseries.monthly.length - 1].sentiment_mean - timeseries.monthly[0].sentiment_mean
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