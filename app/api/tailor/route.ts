import { ApiError, extractJSON, fail, guard } from '@/lib/server';
import { complete } from '@/lib/llm';
import { normalizeCV } from '@/lib/cv';
import { enforceIntegrity } from '@/lib/integrity';
import { extractKeywords } from '@/lib/ats';
import type { CV } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SYSTEM = `You are a senior resume editor and ATS (applicant tracking system) specialist. You adapt ONE candidate's existing resume to ONE job posting so that it ranks well in ATS keyword screening AND reads convincingly to a human recruiter.

ABSOLUTE RULES (honesty first)
1. Never invent or alter facts: employers, job titles, dates, schools, degrees, GPA, awards, certifications, tools, skills, team sizes, numbers or outcomes must come from the baseline resume. If it is not in the baseline, it does not go in the output.
2. You may reword, reorder, merge and trim, but a reworded bullet must still be true to the original bullet.
3. Mirror the job posting's vocabulary ONLY where the baseline genuinely supports it (e.g. baseline says "usability testing", posting says "user testing" → you may use the posting's term). Never claim experience the candidate lacks.
4. Requirements in the posting that the baseline cannot support go into "gaps". Do not paper over them.

ATS formatting rules
- NEVER use em dashes or en dashes (the characters — and –) anywhere in the output. Use commas, periods, colons or a plain hyphen instead. Date ranges use a plain hyphen, e.g. "Mar 2025 - Dec 2025".
- Plain text only: no emojis, no symbols as decoration, no tables, no markdown, no HTML.
- Keep conventional wording; do not rename sections.
- Start bullets with strong action verbs, lead with the outcome, keep each bullet under ~220 characters.
- Put the posting's most important keywords early (headline, first summary sentence, top skill groups) and spread them naturally, without keyword stuffing.
- Skills: reorder groups and items by relevance to the posting; you may rename group labels; you may drop items that are clearly irrelevant to the role.
- "headline" = a short title line aligned with the posting's role, built only from titles/skills the candidate really has (e.g. "Product Designer | UI/UX | Design Systems").
- "summary" = 2 to 4 sentences, maximum 75 words, written for this role.
- Never remove an experience entry or an education entry. You may trim bullets/awards/certifications/organizations that are least relevant, depending on intensity and length.

Input and output are COMPACT. You only see the editable parts of the resume, addressed by index. Everything you do not return stays exactly as in the baseline.
Return ONLY a JSON object, no prose, no code fences. Include only the keys you actually change:
{
  "job": {"title": "role title from the posting", "company": "company name if stated else empty"},
  "headline": "...",
  "summary": "...",
  "experience": [{"i": 0, "bullets": ["rewritten bullets for experience #0"]}],
  "skills": [{"label": "group label", "items": "item, item, item"}],
  "awards": [indexes of awards to keep, most relevant first],
  "certifications": [indexes of certifications to keep, most relevant first],
  "organizations": [{"i": 0, "description": "rewritten description"}],
  "changes": ["3-8 short, specific notes on what you changed and why"],
  "gaps": ["requirements in the posting the candidate does not evidence yet (empty array if none)"]
}
Omit "experience" and "organizations" entirely when the rewrite intensity says to keep them word-for-word. List organizations in the order they should appear (omit the ones to drop).`;

const INTENSITY: Record<string, string> = {
  light: 'LIGHT: rewrite only "headline" and "summary", and reorder skills. Keep every experience bullet word-for-word (you may reorder bullets by relevance). Keep all awards, certifications and organizations.',
  balanced:
    'BALANCED: rewrite "headline" and "summary"; reorder and lightly rephrase experience bullets to surface the posting\'s themes and vocabulary where truthful; reorder skills; reorder awards/certifications/organizations by relevance and drop only clearly irrelevant ones.',
  bold: 'BOLD: everything in BALANCED, plus merge or trim low-relevance bullets and drop awards, certifications and organizations that do not help for this role, so the strongest evidence is front and centre.',
};

const LENGTH: Record<number, string> = {
  1: 'LENGTH: the result must fit ONE A4 page, at most ~480 words in total, max 3 bullets per role, max 6 awards, max 4 certifications, max 3 organizations, education details limited to GPA and the most relevant 1 to 2 lines.',
  2: 'LENGTH: the result must fit TWO A4 pages, at most ~900 words in total.',
};

/** Apply the model's compact edits onto the baseline; anything missing or out of range falls back to the baseline. */
function mergeEdits(base: CV, p: any): CV {
  const txt = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);
  const idx = (v: unknown, len: number) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < len) : null);
  const pickList = (v: unknown, list: string[]) => {
    const ids = idx(v, list.length);
    return ids ? [...new Set(ids)].map((i) => list[i]) : list;
  };

  const bullets = new Map<number, string[]>();
  for (const e of Array.isArray(p.experience) ? p.experience : []) {
    const i = Number(e?.i);
    if (Number.isInteger(i) && Array.isArray(e?.bullets) && e.bullets.length) bullets.set(i, e.bullets.map(String));
  }

  const orgs = Array.isArray(p.organizations)
    ? p.organizations
        .map((o: any) => ({ i: Number(o?.i), description: o?.description }))
        .filter((o: any) => Number.isInteger(o.i) && o.i >= 0 && o.i < base.organizations.length)
        .map((o: any) => ({ ...base.organizations[o.i], description: txt(o.description, base.organizations[o.i].description) }))
    : base.organizations;

  return {
    ...base,
    headline: txt(p.headline, base.headline),
    summary: txt(p.summary, base.summary),
    experience: base.experience.map((e, i) => ({ ...e, bullets: bullets.get(i) ?? e.bullets })),
    skills: Array.isArray(p.skills) && p.skills.length ? p.skills : base.skills,
    awards: pickList(p.awards, base.awards),
    certifications: pickList(p.certifications, base.certifications),
    organizations: orgs,
  };
}

export async function POST(req: Request) {
  try {
    guard(req);
    const body = await req.json().catch(() => null);
    if (!body) throw new ApiError(400, 'Invalid request.');
    const baseline = normalizeCV(body.cv);
    const jobText = String(body.job?.text || '').trim();
    const opts = body.options || {};
    if (!baseline.name && !baseline.experience.length) throw new ApiError(400, 'Upload or paste a baseline CV first.');
    if (jobText.length < 150) throw new ApiError(400, 'The job description is too short. Paste the full posting or fetch it from a link.');

    const language = opts.language === 'Bahasa Indonesia' ? 'Bahasa Indonesia' : 'English';
    const intensity = ['light', 'balanced', 'bold'].includes(opts.intensity) ? opts.intensity : 'balanced';
    const pages = opts.pages === 1 ? 1 : 2;

    const keywords = extractKeywords(jobText, 15).map((k) => k.term);

    // only the editable parts go to the model; facts (contact, dates, schools) never leave the server
    const compact = {
      headline: baseline.headline,
      summary: baseline.summary,
      experience: baseline.experience.map((e, i) => ({ i, role: e.role, company: e.company, bullets: e.bullets })),
      skills: baseline.skills.map((g) => ({ label: g.label, items: g.items })),
      awards: baseline.awards.map((text, i) => ({ i, text })),
      certifications: baseline.certifications.map((text, i) => ({ i, text })),
      organizations: baseline.organizations.map((o, i) => ({ i, role: o.role, org: o.org, description: o.description })),
    };

    const user = `OUTPUT LANGUAGE: write all rewritten text in ${language}. Do not translate proper nouns, company names, award names or tool names.
REWRITE INTENSITY: ${INTENSITY[intensity]}
${LENGTH[pages]}
PRIORITY KEYWORDS (pre-extracted from the posting; use only where the resume truthfully supports them): ${keywords.join(', ') || 'none'}

<job_posting title="${String(body.job?.title || '').replace(/"/g, "'").slice(0, 160)}" company="${String(body.job?.company || '').replace(/"/g, "'").slice(0, 160)}">
${jobText.slice(0, 6000)}
</job_posting>

<resume_editable_parts>
${JSON.stringify(compact)}
</resume_editable_parts>

Tailor the resume to the posting following all rules. Return the JSON object only.`;

    const raw = await complete({ system: SYSTEM, user, maxTokens: 3500 });
    const parsed = extractJSON(raw);
    if (!parsed || typeof parsed !== 'object') throw new ApiError(502, 'The model returned an unexpected structure. Please try again.');

    const merged = mergeEdits(baseline, parsed);
    const { cv, notes, warnings } = enforceIntegrity(baseline, merged);
    const strs = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);

    return Response.json({
      cv,
      job: { title: String(parsed.job?.title || ''), company: String(parsed.job?.company || '') },
      keywords,
      changes: [...strs(parsed.changes), ...notes],
      gaps: strs(parsed.gaps),
      warnings,
    });
  } catch (e) {
    return fail(e);
  }
}
