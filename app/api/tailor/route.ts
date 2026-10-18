import { ApiError, MODEL, extractJSON, fail, getClient, guard, textOf } from '@/lib/server';
import { normalizeCV } from '@/lib/cv';
import { enforceIntegrity } from '@/lib/integrity';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SYSTEM = `You are a senior resume editor and ATS (applicant tracking system) specialist. You adapt ONE candidate's existing resume to ONE job posting so that it ranks well in ATS keyword screening AND reads convincingly to a human recruiter.

ABSOLUTE RULES — honesty first
1. Never invent or alter facts: employers, job titles, dates, schools, degrees, GPA, awards, certifications, tools, skills, team sizes, numbers or outcomes must come from the baseline resume. If it is not in the baseline, it does not go in the output.
2. You may reword, reorder, merge and trim — but a reworded bullet must still be true to the original bullet.
3. Mirror the job posting's vocabulary ONLY where the baseline genuinely supports it (e.g. baseline says "usability testing", posting says "user testing" → you may use the posting's term). Never claim experience the candidate lacks.
4. Requirements in the posting that the baseline cannot support go into "gaps" — do not paper over them.

ATS formatting rules
- Plain text only: no emojis, no symbols as decoration, no tables, no markdown, no HTML.
- Keep conventional wording; do not rename sections.
- Start bullets with strong action verbs, lead with the outcome, keep each bullet under ~220 characters.
- Put the posting's most important keywords early (headline, first summary sentence, top skill groups) and spread them naturally — no keyword stuffing.
- Skills: reorder groups and items by relevance to the posting; you may rename group labels; you may drop items that are clearly irrelevant to the role.
- "headline" = a short title line aligned with the posting's role, built only from titles/skills the candidate really has (e.g. "Product Designer | UI/UX | Design Systems").
- "summary" = 2–4 sentences, maximum 75 words, written for this role.
- Never remove an experience entry or an education entry. You may trim bullets/awards/certifications/organizations that are least relevant, depending on intensity and length.

Return ONLY a JSON object, no prose, no code fences, with this shape:
{
  "job": {"title": "role title from the posting", "company": "company name if stated else empty"},
  "cv": { same structure as the input resume JSON },
  "keywords": ["the 10-20 most important ATS keywords from the posting"],
  "changes": ["3-8 short, specific notes on what you changed and why"],
  "gaps": ["requirements in the posting the candidate does not evidence yet (empty array if none)"]
}`;

const INTENSITY: Record<string, string> = {
  light: 'LIGHT: rewrite only "headline" and "summary", and reorder skills. Keep every experience bullet word-for-word (you may reorder bullets by relevance). Keep all awards, certifications and organizations.',
  balanced:
    'BALANCED: rewrite "headline" and "summary"; reorder and lightly rephrase experience bullets to surface the posting\'s themes and vocabulary where truthful; reorder skills; reorder awards/certifications/organizations by relevance and drop only clearly irrelevant ones.',
  bold: 'BOLD: everything in BALANCED, plus merge or trim low-relevance bullets and drop awards, certifications and organizations that do not help for this role, so the strongest evidence is front and centre.',
};

const LENGTH: Record<number, string> = {
  1: 'LENGTH: the result must fit ONE A4 page — at most ~480 words in total, max 3 bullets per role, max 6 awards, max 4 certifications, max 3 organizations, education details limited to GPA and the most relevant 1–2 lines.',
  2: 'LENGTH: the result must fit TWO A4 pages — at most ~900 words in total.',
};

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

    const user = `OUTPUT LANGUAGE: write all rewritten text in ${language}. Do not translate proper nouns, company names, award names or tool names.
REWRITE INTENSITY: ${INTENSITY[intensity]}
${LENGTH[pages]}

<job_posting title="${String(body.job?.title || '').replace(/"/g, "'").slice(0, 160)}" company="${String(body.job?.company || '').replace(/"/g, "'").slice(0, 160)}">
${jobText.slice(0, 14000)}
</job_posting>

<baseline_resume_json>
${JSON.stringify(baseline)}
</baseline_resume_json>

Tailor the resume to the posting following all rules. Return the JSON object only.`;

    const msg = await getClient().messages.create({
      model: MODEL,
      max_tokens: 9000,
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    });

    const parsed = extractJSON(textOf(msg));
    if (!parsed?.cv) throw new ApiError(502, 'The model returned an unexpected structure. Please try again.');

    const { cv, notes, warnings } = enforceIntegrity(baseline, parsed.cv);
    const strs = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);

    return Response.json({
      cv,
      job: { title: String(parsed.job?.title || ''), company: String(parsed.job?.company || '') },
      keywords: strs(parsed.keywords),
      changes: [...strs(parsed.changes), ...notes],
      gaps: strs(parsed.gaps),
      warnings,
    });
  } catch (e) {
    return fail(e);
  }
}
