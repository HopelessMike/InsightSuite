// app/api/InsightChat/route.ts
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';            // Evita Edge: alcuni SDK/fetch lato server richiedono Node
export const dynamic = 'force-dynamic';     // Niente cache per le risposte di chat
export const preferredRegion = 'auto';      // lascia a Vercel la scelta migliore

type ChatBody = {
  question?: string;
  projectId?: string;
  // opzionale: storico o contesto futuro
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// CORS (utile quando chiamato attraverso il portfolio su dominio diverso)
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
  // Headers CORS in risposta
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  } as const;

  // 1) Validazione env
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Manteniamo la stringa esatta che fa scattare il tuo fallback lato client
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 200, headers: corsHeaders }
    );
  }

  // 2) Parse del body
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const question = body?.question?.trim();
  const projectId = body?.projectId?.trim();

  if (!question) {
    return new Response(JSON.stringify({ error: 'Missing "question"' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // 3) Costruzione messaggi (utente + eventuale contesto/storico)
  //   NB: Anthropic Messages API richiede una lista di messaggi con role "user"/"assistant".
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Se vuoi personalizzare il prompt con projectId:
  const userPrompt =
    projectId && projectId.length > 0
      ? `Project: ${projectId}\nUser question: ${question}`
      : question;

  // Aggiungi storico se fornito (sanificato)
  if (Array.isArray(body.history)) {
    for (const m of body.history) {
      if (
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0
      ) {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }
  messages.push({ role: 'user', content: userPrompt });

  // 4) Chiamata all’API Anthropic via fetch (no dipendenze extra)
  //    Doc: headers x-api-key & anthropic-version, body con model, max_tokens, messages
  //    https://docs.anthropic.com/en/api/messages
  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages,
        // opzionale: system prompt minimo
        system:
          'You are an assistant for InsightSuite. Be concise and reference data when possible.',
      }),
    });

    if (!resp.ok) {
      const errText = await safeText(resp);
      return new Response(
        JSON.stringify({
          error: 'LLM request failed',
          status: resp.status,
          details: truncate(errText, 2000),
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    type AnthropicMessageContent =
      | { type: 'text'; text: string }
      | { type: string; [k: string]: unknown };

    const data = (await resp.json()) as {
      content?: AnthropicMessageContent[];
    };

    // L’API restituisce un array di "content" (spesso un unico item di type=text)
    const answer =
      Array.isArray(data.content) &&
      data.content.find((c) => (c as any).type === 'text') &&
      (data.content.find((c) => (c as any).type === 'text') as any).text;

    return new Response(
      JSON.stringify({
        answer: typeof answer === 'string' ? answer : '',
        model: MODEL,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'LLM request error',
        details:
          err instanceof Error ? truncate(err.message, 2000) : 'unknown',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helpers
async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return '';
  }
}
function truncate(s: string, max = 2000) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}
