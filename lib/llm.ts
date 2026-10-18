import type Anthropic from '@anthropic-ai/sdk';
import { ApiError, MODEL as CLAUDE_MODEL, getClient, textOf } from './server';

export type Provider = 'groq' | 'claude';

/** AI_PROVIDER wins; otherwise whichever key is present (Groq first). */
export function provider(): Provider {
  const p = (process.env.AI_PROVIDER || '').toLowerCase();
  if (p === 'claude' || p === 'groq') return p;
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  return 'groq';
}

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
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
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(100_000),
    body: JSON.stringify({
      model: GROQ_MODEL,
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

export function complete(r: Req): Promise<string> {
  return provider() === 'claude' ? claude(r) : groq(r);
}

export async function pdfToText(buf: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(doc, { mergePages: true });
  return String(text || '');
}
