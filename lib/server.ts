import Anthropic from '@anthropic-ai/sdk';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

export function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      500,
      'ANTHROPIC_API_KEY is not set. Add it in Vercel → Project Settings → Environment Variables, then redeploy.'
    );
  }
  return new Anthropic({ apiKey });
}

/** Optional shared secret so a public deployment can't burn your API credits. */
export function guard(req: Request) {
  const code = process.env.ACCESS_CODE;
  if (!code) return;
  if (req.headers.get('x-access-code') !== code) {
    throw new ApiError(401, 'Access code is missing or incorrect. Open Settings and enter it.');
  }
}

export function fail(e: unknown) {
  if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
  const anyErr = e as { status?: number; message?: string };
  if (anyErr?.status === 401) return Response.json({ error: 'Anthropic rejected the API key (401). Check ANTHROPIC_API_KEY.' }, { status: 500 });
  if (anyErr?.status === 429) return Response.json({ error: 'Rate limit reached on the Anthropic API. Try again in a moment.' }, { status: 429 });
  console.error(e);
  return Response.json({ error: anyErr?.message || 'Unexpected server error.' }, { status: 500 });
}

export function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

/** Pull the first balanced JSON object out of a model response. */
export function extractJSON(raw: string): any {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new ApiError(502, 'The model did not return JSON. Please try again.');
  const slice = raw.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1'));
    } catch {
      throw new ApiError(502, 'The model returned malformed JSON. Please try again.');
    }
  }
}
