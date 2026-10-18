import dns from 'node:dns/promises';
import net from 'node:net';
import { ApiError, fail, guard } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 1_500_000;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

async function assertPublic(u: URL) {
  if (!['http:', 'https:'].includes(u.protocol)) throw new ApiError(400, 'Only http(s) links are supported.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new ApiError(400, 'That address is not allowed.');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new ApiError(400, 'That address is not allowed.');
    return;
  }
  const addrs = await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new ApiError(400, 'Could not resolve that website.');
  if (addrs.some((a) => isPrivateIp(a.address))) throw new ApiError(400, 'That address is not allowed.');
}

async function fetchPage(start: string) {
  let url = new URL(start);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; CVTailorBot/1.0; +https://vercel.com)',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9,id;q=0.8',
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      continue;
    }
    if (!res.ok) throw new ApiError(422, `The site answered ${res.status}. It may block bots. Paste the description instead.`);
    const type = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) throw new ApiError(415, 'That link is not a web page.');
    const reader = res.body?.getReader();
    if (!reader) throw new ApiError(502, 'Empty response.');
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  throw new ApiError(422, 'Too many redirects.');
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', bull: '•' };
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);

function htmlToText(html: string): string {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/(p|div|h[1-6]|li|ul|ol|section|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function findJobPosting(node: any): any | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findJobPosting(n);
      if (f) return f;
    }
    return null;
  }
  if (typeof node === 'object') {
    const t = node['@type'];
    if (t === 'JobPosting' || (Array.isArray(t) && t.includes('JobPosting'))) return node;
    if (node['@graph']) return findJobPosting(node['@graph']);
  }
  return null;
}

function fromJsonLd(html: string) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const job = findJobPosting(JSON.parse(decode(m[1]).trim()));
      if (job) {
        const loc = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
        const addr = loc?.address;
        const place = [addr?.addressLocality, addr?.addressRegion, addr?.addressCountry?.name || addr?.addressCountry]
          .filter((x) => typeof x === 'string')
          .join(', ');
        const body = [
          job.title && `Job title: ${job.title}`,
          job.hiringOrganization?.name && `Company: ${job.hiringOrganization.name}`,
          place && `Location: ${place}`,
          job.employmentType && `Employment type: ${[].concat(job.employmentType).join(', ')}`,
          job.skills && `Skills: ${[].concat(job.skills).join(', ')}`,
          '',
          htmlToText(String(job.description || '')),
          job.qualifications ? `\nQualifications:\n${htmlToText(String(job.qualifications))}` : '',
          job.responsibilities ? `\nResponsibilities:\n${htmlToText(String(job.responsibilities))}` : '',
        ]
          .filter((x) => x !== undefined && x !== false)
          .join('\n');
        return { title: String(job.title || ''), company: String(job.hiringOrganization?.name || ''), text: body };
      }
    } catch {
      /* try next block */
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    guard(req);
    const { url } = await req.json().catch(() => ({ url: '' }));
    let parsed: URL;
    try {
      parsed = new URL(String(url).trim());
    } catch {
      throw new ApiError(400, 'Enter a valid link, including https://');
    }

    const html = await fetchPage(parsed.toString());
    const ld = fromJsonLd(html);
    if (ld && ld.text.length > 250) {
      return Response.json({ ...ld, text: ld.text.slice(0, 14000), source: 'structured' });
    }

    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const title = decode((og || titleTag || '').trim()).slice(0, 140);
    const main = html.match(/<(main|article)[\s\S]*?<\/\1>/i)?.[0] || html;
    const text = htmlToText(main).slice(0, 14000);

    if (text.length < 300) {
      return Response.json({
        title,
        company: '',
        text,
        source: 'thin',
        warning: 'This page loads its content with JavaScript or needs a login (common on LinkedIn, Glints, Jobstreet). Paste the job description into the box below.',
      });
    }
    return Response.json({ title, company: '', text, source: 'html' });
  } catch (e) {
    if ((e as any)?.name === 'TimeoutError') return fail(new ApiError(504, 'The site took too long to respond. Paste the description instead.'));
    return fail(e);
  }
}
