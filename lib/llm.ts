import type Anthropic from '@anthropic-ai/sdk';
import { ApiError, MODEL as CLAUDE_MODEL, getClient, textOf } from './server';

export type Provider = 'groq' | 'gemini' | 'openrouter' | 'claude';

/** AI_PROVIDER wins; otherwise whichever key is present (Groq first). */
export function provider(): Provider {
  const p = (process.env.AI_PROVIDER || '').toLowerCase();
  if (p === 'claude' || p === 'groq' || p === 'gemini' || p === 'openrouter') return p;
  return configured()[0] ?? 'groq';
}

/** Providers that have a key, in preference order. The first is primary, the rest are fallbacks. */
function configured(): Provider[] {
  const list: Provider[] = [];
  if (process.env.GROQ_API_KEY) list.push('groq');
  if (process.env.GEMINI_API_KEY) list.push('gemini');
  if (process.env.OPENROUTER_API_KEY) list.push('openrouter');
  if (process.env.ANTHROPIC_API_KEY) list.push('claude');
  return list;
}

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-super-vl:free';
const GROQ_URL = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1') + '/chat/completions';

type Req = {
  system: string;
  user: string;
  maxTokens: number;
  /** Only honoured by the Claude provider (native PDF reading). */
  pdfBase64?: string;
};

async function groq(r: Req): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new ApiError(500, 'GROQ_API_KEY is not set. Add it in Vercel → Project Settings → Environment Variables, then redeploy.');
  }
  const body = JSON.stringify({
    model: GROQ_MODEL,
    temperature: 0.2,
    max_tokens: r.maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: r.system },
      { role: 'user', content: r.user },
    ],
  });
  let res: Response;
  // Groq's per-minute token limit usually frees up within seconds: wait and retry.
  for (let attempt = 0; ; attempt++) {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(100_000),
      body,
    });
    if (res.status !== 429 || attempt >= 2) break;
    const msg: any = await res.clone().json().catch(() => ({}));
    const m = /try again in ([\d.]+)(ms|s)/i.exec(String(msg?.error?.message || ''));
    const wait = m ? parseFloat(m[1]) * (m[2].toLowerCase() === 'ms' ? 1 : 1000) : 5000;
    if (wait > 15_000) break;
    await new Promise((ok) => setTimeout(ok, wait + 500));
  }
  if (!res.ok) {
    const body: any = await res.json().catch(() => ({}));
    const detail = String(body?.error?.message || '').slice(0, 220);
    if (res.status === 401) throw new ApiError(500, 'Groq rejected the API key (401). Check GROQ_API_KEY.');
    if (res.status === 429) throw new ApiError(429, `Groq free-tier limit reached. Wait a minute and try again. ${detail}`.trim());
    if (res.status === 413) throw new ApiError(413, 'The request is too large for Groq’s free tier. Shorten the job description and try again.');
    throw new ApiError(502, `Groq error ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new ApiError(502, 'Groq returned an empty answer. Please try again.');
  return String(text);
}

async function gemini(r: Req): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ApiError(500, 'GEMINI_API_KEY is not set.');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(100_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: r.system }] },
      contents: [{ role: 'user', parts: [{ text: r.user }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: r.maxTokens, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    const body: any = await res.json().catch(() => ({}));
    const detail = String(body?.error?.message || '').slice(0, 220);
    if (res.status === 429) throw new ApiError(429, `Gemini free-tier limit reached. ${detail}`.trim());
    throw new ApiError(502, `Gemini error ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  const data: any = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
  if (!text) throw new ApiError(502, 'Gemini returned an empty answer. Please try again.');
  return text;
}

async function openrouter(r: Req): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new ApiError(500, 'OPENROUTER_API_KEY is not set.');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(100_000),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.2,
      max_tokens: r.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: r.system },
        { role: 'user', content: r.user },
      ],
    }),
  });
  if (!res.ok) {
    const body: any = await res.json().catch(() => ({}));
    const detail = String(body?.error?.message || '').slice(0, 220);
    if (res.status === 429) throw new ApiError(429, `OpenRouter free-tier limit reached. ${detail}`.trim());
    throw new ApiError(502, `OpenRouter error ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new ApiError(502, 'OpenRouter returned an empty answer. Please try again.');
  return String(text);
}

async function claude(r: Req): Promise<string> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (r.pdfBase64) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: r.pdfBase64 } });
  content.push({ type: 'text', text: r.user });
  const msg = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: r.maxTokens,
    system: r.system,
    messages: [{ role: 'user', content }],
  });
  return textOf(msg);
}

const RUN: Record<Provider, (r: Req) => Promise<string>> = { groq, gemini, openrouter, claude };

/** Try the primary provider, then every other configured one, so a rate limit on one never blocks the user. */
export async function complete(r: Req): Promise<string> {
  const primary = provider();
  const order = [primary, ...configured().filter((p) => p !== primary)];
  let first: unknown;
  for (const p of order) {
    try {
      return await RUN[p](r.pdfBase64 && p !== 'claude' ? { ...r, pdfBase64: undefined } : r);
    } catch (e) {
      first ??= e;
    }
  }
  throw first;
}

export async function pdfToText(buf: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(doc, { mergePages: true });
  return String(text || '');
}
