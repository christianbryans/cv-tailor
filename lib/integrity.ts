import type { CV } from './types';
import { cvToText, normalizeCV } from './cv';

/**
 * Safety net applied to every tailored CV.
 * The model may reword, reorder and trim — but it may never change facts:
 * employers, titles, dates, schools, awards, certifications and skills must exist in the baseline.
 */

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordSet = (x: string) => new Set(norm(x).split(' ').filter((w) => w.length > 2));

function jaccard(a: string, b: string) {
  const A = wordSet(a);
  const B = wordSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return inter / (A.size + B.size - inter);
}

function best<T>(items: T[], text: (t: T) => string, query: string) {
  let hit: T | undefined;
  let score = 0;
  for (const it of items) {
    const sc = jaccard(text(it), query);
    if (sc > score) {
      score = sc;
      hit = it;
    }
  }
  return { hit, score };
}

const nums = (x: string) => new Set((x.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.')));

export function enforceIntegrity(baseline: CV, rawOut: unknown) {
  const out = normalizeCV(rawOut);
  const notes: string[] = [];

  // --- identity & contact: always from baseline
  const cv: CV = {
    ...out,
    name: baseline.name,
    email: baseline.email,
    phone: baseline.phone,
    location: baseline.location,
    links: baseline.links,
  };

  // --- experience: baseline order, baseline facts, model-written bullets
  const usedExp = new Set<string>();
  const expOut = new Map<string, string[]>();
  for (const e of out.experience) {
    const { hit, score } = best(baseline.experience, (b) => `${b.company} ${b.role}`, `${e.company} ${e.role}`);
    if (!hit || score < 0.34 || usedExp.has(hit.id)) {
      notes.push(`Dropped an experience entry that could not be matched to your baseline (${e.company || e.role}).`);
      continue;
    }
    usedExp.add(hit.id);
    expOut.set(hit.id, e.bullets.length ? e.bullets : hit.bullets);
  }
  cv.experience = baseline.experience.map((b) => ({ ...b, bullets: expOut.get(b.id) ?? b.bullets }));
  if (usedExp.size < baseline.experience.length) {
    notes.push('Restored experience entries the model tried to remove — jobs are never deleted.');
  }

  // --- education: baseline facts, model-written details
  const eduOut = new Map<string, string[]>();
  for (const e of out.education) {
    const { hit, score } = best(baseline.education, (b) => `${b.school} ${b.degree}`, `${e.school} ${e.degree}`);
    if (hit && score >= 0.34 && !eduOut.has(hit.id)) eduOut.set(hit.id, e.details.length ? e.details : hit.details);
  }
  cv.education = baseline.education.map((b) => ({ ...b, details: eduOut.get(b.id) ?? b.details }));

  // --- skills: only those that exist somewhere in the baseline
  const baseText = norm(cvToText(baseline));
  const removed: string[] = [];
  cv.skills = out.skills
    .map((g) => {
      const kept = g.items
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((item) => {
          const ok = baseText.includes(norm(item));
          if (!ok) removed.push(item);
          return ok;
        });
      return { ...g, items: kept.join(', ') };
    })
    .filter((g) => g.items);
  if (!cv.skills.length) cv.skills = baseline.skills;
  if (removed.length) notes.push(`Removed skills not found in your baseline: ${removed.join(', ')}.`);

  // --- awards & certifications: restore the baseline wording of whatever the model kept
  const pick = (outList: string[], baseList: string[]) => {
    const seen = new Set<string>();
    const res: string[] = [];
    for (const a of outList) {
      const { hit, score } = best(baseList, (x) => x, a);
      if (hit && score >= 0.5 && !seen.has(hit)) {
        seen.add(hit);
        res.push(hit);
      }
    }
    return res;
  };
  cv.awards = pick(out.awards, baseline.awards);
  cv.certifications = pick(out.certifications, baseline.certifications);

  // --- organizations: baseline facts, model-written description
  const seenOrg = new Set<string>();
  cv.organizations = [];
  for (const o of out.organizations) {
    const { hit, score } = best(baseline.organizations, (b) => `${b.org} ${b.role}`, `${o.org} ${o.role}`);
    if (!hit || score < 0.34 || seenOrg.has(hit.id)) continue;
    seenOrg.add(hit.id);
    cv.organizations.push({ ...hit, description: o.description || hit.description });
  }

  // --- numbers that never appeared in the baseline need a human check
  const baseNums = nums(cvToText(baseline) + ' ' + baseline.education.map((e) => `${e.start} ${e.end}`).join(' '));
  const outNums = nums(
    [cv.summary, cv.headline, ...cv.experience.flatMap((e) => e.bullets), ...cv.organizations.map((o) => o.description)].join(' ')
  );
  const warnings: string[] = [];
  outNums.forEach((n) => {
    if (!baseNums.has(n)) warnings.push(`The number "${n}" does not appear in your baseline CV — verify or remove it.`);
  });

  return { cv, notes, warnings };
}
