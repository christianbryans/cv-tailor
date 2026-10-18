import type { CV } from './types';
import { cvToText } from './cv';

const STOP = new Set(
  (
    'the and for with that this from your you our are will have has not but all can any more other their they them its was were been being into over such than then there these those who whom whose which what when where while about also able etc per via within across including include includes must should would could may might one two three new using use used well strong good great plus role work works working team teams company business looking join help ensure responsible responsibilities requirements required preferred qualifications experience years year skills ability candidate position job apply benefits opportunity opportunities make makes made need needs like both each very just get gets getting part full time own high based related relevant knowledge understanding excellent proven demonstrated ' +
    'yang dan untuk dengan dalam dari pada atau akan kami anda kamu memiliki minimal pengalaman tahun mampu serta sebagai ini itu bisa dapat lebih juga tim kerja bekerja kualifikasi tanggung jawab lowongan posisi perusahaan'
  ).split(' ')
);

const GENERIC = new Set(['through', 'best', 'real', 'complex', 'experiences', 'experience', 'visual', 'organization', 'satisfaction', 'design', 'designer', 'product', 'products', 'user', 'users', 'data', 'digital', 'create', 'build', 'building', 'develop', 'development', 'support', 'customer', 'customers', 'solutions', 'solution', 'process', 'processes', 'projects', 'project', 'management', 'manage']);

const SHORT_TECH = new Set(['sql', 'aws', 'api', 'sdk', 'css', 'git', 'php', 'ios', 'gcp', 'seo', 'crm', 'erp', 'ci/cd', 'rest']);

const PHRASES = [
  'user research', 'ux research', 'usability testing', 'user testing', 'design system', 'design systems', 'information architecture', 'wireframing', 'wireframes', 'prototyping', 'interaction design', 'visual design', 'ui design', 'ux design', 'product design', 'user flows', 'user flow', 'design thinking', 'a/b testing', 'accessibility', 'wcag', 'responsive design', 'mobile app', 'mobile apps', 'web app', 'cross-functional', 'stakeholder', 'stakeholders', 'agile', 'scrum', 'product management', 'product strategy', 'data-driven', 'front-end', 'frontend', 'back-end', 'backend', 'saas', 'b2b', 'b2c', 'mvp', 'user-centered', 'human-centered', 'journey map', 'journey mapping', 'persona', 'personas', 'heuristic evaluation', 'design ops', 'motion design', 'design tokens', 'component library', 'handoff', 'roadmap', 'kpi', 'okr', 'analytics', 'sql', 'python', 'typescript', 'javascript', 'react', 'next.js', 'tailwind', 'swift', 'swiftui', 'ios', 'android', 'kotlin', 'flutter', 'figma', 'figjam', 'sketch', 'framer', 'protopie', 'maze', 'hotjar', 'miro', 'jira', 'notion', 'storybook', 'html', 'css', 'git', 'rest api', 'api', 'firebase', 'node.js', 'mysql', 'postgresql', 'aws', 'machine learning', 'ai', 'llm', 'prompt engineering', 'content design', 'ux writing', 'copywriting', 'branding', 'illustration', 'photoshop', 'illustrator', 'after effects', 'lottie', 'user interviews', 'surveys', 'competitive analysis', 'case study', 'case studies', 'portfolio', 'dashboard', 'enterprise', 'fintech', 'e-commerce', 'healthtech', 'edtech', 'ui', 'ux', 'research', 'collaboration', 'communication', 'problem-solving', 'leadership', 'mentoring', 'presentation', 'documentation', 'quality assurance', 'testing', 'automation', 'security', 'cloud', 'microservices', 'docker', 'kubernetes', 'ci/cd', 'figma variables', 'auto layout', 'micro-interactions', 'animation', 'design critique', 'prototype', 'user-centric', 'end-to-end', 'iterate', 'iteration', 'insights', 'metrics', 'conversion', 'retention', 'onboarding', 'growth',
];

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function hasTerm(text: string, term: string): boolean {
  const t = term.toLowerCase();
  const variants = new Set([t, t.endsWith('s') ? t.slice(0, -1) : t + 's']);
  for (const v of variants) {
    if (new RegExp(`(^|[^a-z0-9])${esc(v)}($|[^a-z0-9])`, 'i').test(text)) return true;
  }
  return false;
}

function countTerm(text: string, term: string): number {
  const m = text.match(new RegExp(`(^|[^a-z0-9])${esc(term)}(?=$|[^a-z0-9])`, 'gi'));
  return m ? m.length : 0;
}

export type Keyword = { term: string; weight: number };

export function extractKeywords(jd: string, max = 30): Keyword[] {
  const text = jd.toLowerCase();
  if (text.trim().length < 80) return [];
  const found = new Map<string, number>();

  for (const p of new Set(PHRASES)) {
    const c = countTerm(text, p);
    if (c > 0) found.set(p, Math.min(6, c) * 2);
  }

  const counts = new Map<string, number>();
  const tokens = text.match(/[a-z][a-z0-9+#.\-/]{2,}/g) || [];
  for (let tok of tokens) {
    tok = tok.replace(/[.\-/]+$/, '');
    if (tok.length < 4 && !SHORT_TECH.has(tok)) continue;
    if (STOP.has(tok) || GENERIC.has(tok)) continue;
    if (/^\d/.test(tok) || tok.includes('http') || tok.includes('www')) continue;
    counts.set(tok, (counts.get(tok) || 0) + 1);
  }
  counts.forEach((c, tok) => {
    if (c >= 2 && !found.has(tok)) found.set(tok, Math.min(5, c));
  });

  // drop tokens already covered by a chosen phrase ("system" vs "design system")
  const entries = [...found.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  const picked: Keyword[] = [];
  for (const [term, weight] of entries) {
    if (picked.length >= max) break;
    const covered = picked.some((p) => p.term !== term && p.term.includes(' ') && p.term.split(' ').includes(term));
    if (covered) continue;
    picked.push({ term, weight });
  }
  // a bare word that is part of a chosen phrase adds nothing ("testing" vs "usability testing")
  return picked.filter(
    (k) => k.term.includes(' ') || !picked.some((o) => o.term !== k.term && o.term.includes(' ') && o.term.split(' ').includes(k.term))
  );
}

export type Analysis = {
  score: number;
  matched: string[];
  missing: string[];
  total: number;
};

export function analyze(cv: CV, jd: string): Analysis {
  const kws = extractKeywords(jd);
  if (!kws.length) return { score: 0, matched: [], missing: [], total: 0 };
  const text = cvToText(cv).toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  let got = 0;
  let all = 0;
  for (const k of kws) {
    all += k.weight;
    if (hasTerm(text, k.term)) {
      got += k.weight;
      matched.push(k.term);
    } else missing.push(k.term);
  }
  return { score: Math.round((got / all) * 100), matched, missing, total: kws.length };
}

export type Check = { id: string; label: string; ok: boolean; hint: string };

export function atsChecks(cv: CV): Check[] {
  const words = cvToText(cv).split(/\s+/).filter(Boolean).length;
  const bullets = [...cv.experience.flatMap((e) => e.bullets), ...cv.education.flatMap((e) => e.details)];
  const longBullets = bullets.filter((b) => b.length > 260).length;
  const summaryWords = cv.summary.split(/\s+/).filter(Boolean).length;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cv.email);
  const datesOk = cv.experience.every((e) => e.start && e.end);
  const linksOk = cv.links.every((l) => !l.label || l.url);
  return [
    { id: 'contact', label: 'Contact details parse cleanly', ok: emailOk && !!cv.phone, hint: 'Add a valid email and phone number in the header.' },
    { id: 'dates', label: 'Every role has start and end dates', ok: datesOk, hint: 'ATS timelines break when a role has no dates.' },
    { id: 'summary', label: 'Summary is focused (≤ 140 words)', ok: summaryWords > 0 && summaryWords <= 140, hint: `Your summary is ${summaryWords} words. Keep it to one short paragraph.` },
    { id: 'bullets', label: 'Bullets are scannable (≤ 260 characters)', ok: longBullets === 0, hint: `${longBullets} bullet(s) are very long. split or tighten them.` },
    { id: 'length', label: 'Length fits 2 pages (≤ 1,000 words)', ok: words <= 1000, hint: `${words} words in total. Trim the least relevant items.` },
    { id: 'links', label: 'Links include full URLs', ok: linksOk, hint: 'Add the LinkedIn / portfolio URL so it prints as readable text.' },
    { id: 'format', label: 'Single column, standard headings, no images or tables', ok: true, hint: '' },
  ];
}

/** Score tiers: poor / fair / good / excellent (bands mirror the 2-3-3-2 spread of the design system). */
export type Tier = 'poor' | 'fair' | 'good' | 'excellent';
export function tier(score: number): Tier {
  if (score >= 85) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 30) return 'fair';
  return 'poor';
}
