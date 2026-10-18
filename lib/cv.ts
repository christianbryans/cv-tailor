import type { CV, Layout, SectionKey } from './types';
import { SECTION_LABELS } from './types';

export const uid = () => Math.random().toString(36).slice(2, 9);

/** Em/en dashes read as machine-written, so they never enter the CV. */
export const noDash = (x: string) => x.replace(/\s*[\u2014\u2013]\s*/g, ' - ');
const s = (v: unknown): string => noDash(typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] => arr(v).map(s).filter(Boolean);

/** Coerce anything (LLM output, localStorage, user JSON) into a valid CV. */
export function normalizeCV(raw: unknown): CV {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  return {
    name: s(r.name),
    headline: s(r.headline),
    email: s(r.email),
    phone: s(r.phone),
    location: s(r.location),
    links: arr(r.links)
      .map((l: any) => ({ label: s(l?.label), url: s(l?.url) }))
      .filter((l) => l.label || l.url),
    summary: s(r.summary),
    experience: arr(r.experience).map((e: any, i) => ({
      id: s(e?.id) || `exp${i}`,
      role: s(e?.role),
      company: s(e?.company),
      location: s(e?.location),
      start: s(e?.start),
      end: s(e?.end),
      bullets: strs(e?.bullets),
    })),
    education: arr(r.education).map((e: any, i) => ({
      id: s(e?.id) || `edu${i}`,
      school: s(e?.school),
      degree: s(e?.degree),
      location: s(e?.location),
      start: s(e?.start),
      end: s(e?.end),
      details: strs(e?.details),
    })),
    skills: arr(r.skills)
      .map((g: any, i) => ({
        id: s(g?.id) || `sk${i}`,
        label: s(g?.label),
        items: Array.isArray(g?.items) ? g.items.map(s).filter(Boolean).join(', ') : s(g?.items),
      }))
      .filter((g) => g.label || g.items),
    awards: strs(r.awards),
    certifications: strs(r.certifications),
    organizations: arr(r.organizations).map((o: any, i) => ({
      id: s(o?.id) || `org${i}`,
      role: s(o?.role),
      org: s(o?.org),
      period: s(o?.period),
      description: s(o?.description),
    })),
  };
}

export function dateRange(start: string, end: string) {
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
}

export function linkText(l: { label: string; url: string }) {
  return l.url ? l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : l.label;
}

/** Flat text used for keyword matching and word counts. */
export function cvToText(cv: CV): string {
  const parts: string[] = [cv.headline, cv.summary];
  cv.experience.forEach((e) => parts.push(e.role, e.company, ...e.bullets));
  cv.education.forEach((e) => parts.push(e.school, e.degree, ...e.details));
  cv.skills.forEach((g) => parts.push(g.label, g.items));
  parts.push(...cv.awards, ...cv.certifications);
  cv.organizations.forEach((o) => parts.push(o.role, o.org, o.description));
  return parts.filter(Boolean).join('\n');
}

/** Clean plain text version, handy for pasting into portals that ask for text. */
export function cvToPlainText(cv: CV, layout: Layout): string {
  const out: string[] = [];
  out.push(cv.name.toUpperCase());
  if (cv.headline) out.push(cv.headline);
  out.push([cv.phone, cv.email, cv.location, ...cv.links.map(linkText)].filter(Boolean).join(' | '));
  const heading = (k: SectionKey) => out.push('', SECTION_LABELS[k].toUpperCase(), '-'.repeat(SECTION_LABELS[k].length));
  for (const k of layout.order) {
    if (layout.hidden.includes(k)) continue;
    if (k === 'summary' && cv.summary) {
      heading(k);
      out.push(cv.summary);
    }
    if (k === 'experience' && cv.experience.length) {
      heading(k);
      cv.experience.forEach((e) => {
        out.push(`${e.role}, ${e.company}${e.location ? `, ${e.location}` : ''} (${dateRange(e.start, e.end)})`);
        e.bullets.forEach((b) => out.push(`- ${b}`));
        out.push('');
      });
    }
    if (k === 'education' && cv.education.length) {
      heading(k);
      cv.education.forEach((e) => {
        out.push(`${e.degree}, ${e.school}${e.location ? `, ${e.location}` : ''} (${dateRange(e.start, e.end)})`);
        e.details.forEach((b) => out.push(`- ${b}`));
        out.push('');
      });
    }
    if (k === 'skills' && cv.skills.length) {
      heading(k);
      cv.skills.forEach((g) => out.push(`${g.label}: ${g.items}`));
    }
    if (k === 'awards' && cv.awards.length) {
      heading(k);
      cv.awards.forEach((a) => out.push(`- ${a}`));
    }
    if (k === 'certifications' && cv.certifications.length) {
      heading(k);
      cv.certifications.forEach((a) => out.push(`- ${a}`));
    }
    if (k === 'organizations' && cv.organizations.length) {
      heading(k);
      cv.organizations.forEach((o) => {
        out.push(`${o.role}, ${o.org} (${o.period})`);
        if (o.description) out.push(o.description);
        out.push('');
      });
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
