// app/api/insight-chat/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // TODO: integra la tua chiamata al provider LLM qui.
    // Restituisco solo echo per completezza.
    return NextResponse.json({ ok: true, body });
  } catch (err) {
    console.error('InsightChat POST error', err);
    return NextResponse.json({ ok: false, error: 'Bad Request' }, { status: 400 });
  }
}

export async function GET() {
  // opzionale: piccolo health per debugging
  return NextResponse.json({ ok: true, service: 'insight-chat' });
}
