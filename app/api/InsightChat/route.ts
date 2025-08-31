// app/api/InsightChat/route.ts
import type { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01';

function json(data: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extra },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // messaggio usato dal tuo fallback client
    return json({ error: 'ANTHROPIC_API_KEY not configured' }, 200);
  }

  let body: { question?: string; projectId?: string; history?: {role:'user'|'assistant';content:string}[] } = {};
  try {
    body = await req.json();
  } catch (e) {
    console.error('InsightChat: invalid JSON body', e);
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const q = (body.question || '').trim();
  const projectId = (body.projectId || '').trim();
  if (!q) return json({ error: 'Missing "question"' }, 400);

  const messages: Array<{role:'user'|'assistant';content:string}> = [];
  if (Array.isArray(body.history)) {
    for (const m of body.history) {
      if ((m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content) {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }
  messages.push({ role: 'user', content: projectId ? `Project: ${projectId}\nUser question: ${q}` : q });

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': API_VERSION, // richiesto dalla Messages API
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 512, messages,
        system: 'You are an assistant for InsightSuite. Answer concisely referencing data when possible.' }),
    });

    if (!r.ok) {
      const text = await r.text().catch(()=>'');
      console.error('InsightChat: Anthropic non-200', r.status, text.slice(0,800));
      return json({ error: 'LLM request failed', status: r.status, details: text.slice(0,2000) }, 502);
    }

    const data = await r.json().catch(()=> ({}));
    // tipica struttura: { content: [{type:'text', text:'...'}], ... }
    const answer = Array.isArray(data?.content)
      ? data.content.find((c:any)=>c?.type==='text')?.text ?? ''
      : '';

    return json({ answer, model: MODEL }, 200);
  } catch (e: any) {
    console.error('InsightChat: request error', e?.stack || e);
    return json({ error: 'LLM request error', details: e?.message || 'unknown' }, 500);
  }
}
