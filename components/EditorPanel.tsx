'use client';

import { useState } from 'react';
import type { CV, Layout, SectionKey } from '@/lib/types';
import { SECTION_LABELS } from '@/lib/types';
import { uid } from '@/lib/cv';
import { Icon } from './Icons';

type Props = { cv: CV; setCv: (c: CV) => void; layout: Layout; setLayout: (l: Layout) => void };

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      {rows ? (
        <textarea className="textarea" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Acc({
  id,
  title,
  count,
  open,
  toggle,
  children,
  right,
}: {
  id: string;
  title: string;
  count?: number;
  open: boolean;
  toggle: (id: string) => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className={`acc ${open ? 'open' : ''}`}>
      <div className="acc-h">
        <button className="acc-btn" onClick={() => toggle(id)} aria-expanded={open}>
          <Icon name="chevron" size={14} className="chev" />
          <span>{title}</span>
          {count !== undefined && <em>{count}</em>}
        </button>
        {right}
      </div>
      {open && <div className="acc-b">{children}</div>}
    </section>
  );
}

function Bullets({ items, onChange, label = 'Bullet' }: { items: string[]; onChange: (v: string[]) => void; label?: string }) {
  return (
    <div className="bullets">
      {items.map((b, i) => (
        <div className="bullet" key={i}>
          <textarea
            className="textarea"
            rows={Math.max(2, Math.ceil(b.length / 54))}
            value={b}
            aria-label={`${label} ${i + 1}`}
            onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))}
          />
          <div className="bullet-ctl">
            <button className="icon-btn" aria-label="Move up" onClick={() => onChange(move(items, i, -1))} disabled={i === 0}>
              <Icon name="up" size={13} />
            </button>
            <button className="icon-btn" aria-label="Move down" onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1}>
              <Icon name="down" size={13} />
            </button>
            <button className="icon-btn danger" aria-label="Remove" onClick={() => onChange(items.filter((_, k) => k !== i))}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={() => onChange([...items, ''])}>
        <Icon name="plus" size={13} /> Add {label.toLowerCase()}
      </button>
    </div>
  );
}

function EntryHead({ title, i, n, onMove, onRemove }: { title: string; i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className="entry-h">
      <strong className="truncate">{title || 'Untitled'}</strong>
      <div className="row-gap">
        <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)}>
          <Icon name="up" size={13} />
        </button>
        <button className="icon-btn" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(1)}>
          <Icon name="down" size={13} />
        </button>
        <button className="icon-btn danger" aria-label="Remove entry" onClick={onRemove}>
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
}

export default function EditorPanel({ cv, setCv, layout, setLayout }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({ basics: true, summary: true, experience: true });
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const up = (patch: Partial<CV>) => setCv({ ...cv, ...patch });

  const hide = (k: SectionKey) =>
    setLayout({ ...layout, hidden: layout.hidden.includes(k) ? layout.hidden.filter((x) => x !== k) : [...layout.hidden, k] });
  const eye = (k: SectionKey) => (
    <button className="icon-btn" aria-label={layout.hidden.includes(k) ? `Show ${SECTION_LABELS[k]}` : `Hide ${SECTION_LABELS[k]}`} onClick={() => hide(k)} title="Show / hide on CV">
      <Icon name={layout.hidden.includes(k) ? 'eyeoff' : 'eye'} size={14} />
    </button>
  );

  return (
    <div className="stack tight">
      <Acc id="layout" title="Section order & visibility" open={!!open.layout} toggle={toggle}>
        <ul className="order">
          {layout.order.map((k, i) => (
            <li key={k} className={layout.hidden.includes(k) ? 'off' : ''}>
              <span>{SECTION_LABELS[k]}</span>
              <div className="row-gap">
                <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => setLayout({ ...layout, order: move(layout.order, i, -1) })}>
                  <Icon name="up" size={13} />
                </button>
                <button className="icon-btn" aria-label="Move down" disabled={i === layout.order.length - 1} onClick={() => setLayout({ ...layout, order: move(layout.order, i, 1) })}>
                  <Icon name="down" size={13} />
                </button>
                {eye(k)}
              </div>
            </li>
          ))}
        </ul>
      </Acc>

      <Acc id="basics" title="Header & contact" open={!!open.basics} toggle={toggle}>
        <div className="grid-2">
          <Field label="Full name" value={cv.name} onChange={(v) => up({ name: v })} />
          <Field label="Headline" value={cv.headline} onChange={(v) => up({ headline: v })} placeholder="Product Designer | UI/UX" />
          <Field label="Email" value={cv.email} onChange={(v) => up({ email: v })} />
          <Field label="Phone" value={cv.phone} onChange={(v) => up({ phone: v })} />
          <Field label="Location" value={cv.location} onChange={(v) => up({ location: v })} placeholder="Jakarta, Indonesia" />
        </div>
        <div className="sub-h">Links</div>
        {cv.links.map((l, i) => (
          <div className="link-row" key={i}>
            <input className="input" value={l.label} placeholder="Label" onChange={(e) => up({ links: cv.links.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} />
            <input className="input" value={l.url} placeholder="https://linkedin.com/in/…" onChange={(e) => up({ links: cv.links.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)) })} />
            <button className="icon-btn danger" aria-label="Remove link" onClick={() => up({ links: cv.links.filter((_, k) => k !== i) })}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        ))}
        <button className="add-btn" onClick={() => up({ links: [...cv.links, { label: '', url: '' }] })}>
          <Icon name="plus" size={13} /> Add link
        </button>
      </Acc>

      <Acc id="summary" title="Professional summary" open={!!open.summary} toggle={toggle} right={eye('summary')}>
        <Field value={cv.summary} onChange={(v) => up({ summary: v })} rows={6} />
        <div className="hint">{cv.summary.split(/\s+/).filter(Boolean).length} words · aim for 40–75</div>
      </Acc>

      <Acc id="experience" title="Work experience" count={cv.experience.length} open={!!open.experience} toggle={toggle} right={eye('experience')}>
        {cv.experience.map((e, i) => {
          const set = (patch: Partial<typeof e>) => up({ experience: cv.experience.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
          return (
            <div className="entry" key={e.id}>
              <EntryHead
                title={`${e.role}${e.company ? ` · ${e.company}` : ''}`}
                i={i}
                n={cv.experience.length}
                onMove={(d) => up({ experience: move(cv.experience, i, d) })}
                onRemove={() => up({ experience: cv.experience.filter((_, k) => k !== i) })}
              />
              <div className="grid-2">
                <Field label="Role" value={e.role} onChange={(v) => set({ role: v })} />
                <Field label="Company" value={e.company} onChange={(v) => set({ company: v })} />
                <Field label="Location" value={e.location} onChange={(v) => set({ location: v })} />
                <div className="grid-2">
                  <Field label="Start" value={e.start} onChange={(v) => set({ start: v })} />
                  <Field label="End" value={e.end} onChange={(v) => set({ end: v })} />
                </div>
              </div>
              <Bullets items={e.bullets} onChange={(b) => set({ bullets: b })} />
            </div>
          );
        })}
        <button
          className="add-btn"
          onClick={() => up({ experience: [...cv.experience, { id: uid(), role: '', company: '', location: '', start: '', end: '', bullets: [''] }] })}
        >
          <Icon name="plus" size={13} /> Add experience
        </button>
      </Acc>

      <Acc id="education" title="Education" count={cv.education.length} open={!!open.education} toggle={toggle} right={eye('education')}>
        {cv.education.map((e, i) => {
          const set = (patch: Partial<typeof e>) => up({ education: cv.education.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
          return (
            <div className="entry" key={e.id}>
              <EntryHead
                title={e.school}
                i={i}
                n={cv.education.length}
                onMove={(d) => up({ education: move(cv.education, i, d) })}
                onRemove={() => up({ education: cv.education.filter((_, k) => k !== i) })}
              />
              <div className="grid-2">
                <Field label="School" value={e.school} onChange={(v) => set({ school: v })} />
                <Field label="Location" value={e.location} onChange={(v) => set({ location: v })} />
              </div>
              <Field label="Degree" value={e.degree} onChange={(v) => set({ degree: v })} />
              <div className="grid-2">
                <Field label="Start" value={e.start} onChange={(v) => set({ start: v })} />
                <Field label="End" value={e.end} onChange={(v) => set({ end: v })} />
              </div>
              <Bullets items={e.details} onChange={(b) => set({ details: b })} label="Detail" />
            </div>
          );
        })}
        <button className="add-btn" onClick={() => up({ education: [...cv.education, { id: uid(), school: '', degree: '', location: '', start: '', end: '', details: [] }] })}>
          <Icon name="plus" size={13} /> Add education
        </button>
      </Acc>

      <Acc id="skills" title="Skills" count={cv.skills.length} open={!!open.skills} toggle={toggle} right={eye('skills')}>
        {cv.skills.map((g, i) => {
          const set = (patch: Partial<typeof g>) => up({ skills: cv.skills.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
          return (
            <div className="entry" key={g.id}>
              <EntryHead
                title={g.label}
                i={i}
                n={cv.skills.length}
                onMove={(d) => up({ skills: move(cv.skills, i, d) })}
                onRemove={() => up({ skills: cv.skills.filter((_, k) => k !== i) })}
              />
              <Field label="Group label" value={g.label} onChange={(v) => set({ label: v })} />
              <Field label="Skills (comma-separated)" value={g.items} onChange={(v) => set({ items: v })} rows={Math.max(2, Math.ceil(g.items.length / 54))} />
            </div>
          );
        })}
        <button className="add-btn" onClick={() => up({ skills: [...cv.skills, { id: uid(), label: '', items: '' }] })}>
          <Icon name="plus" size={13} /> Add skill group
        </button>
      </Acc>

      <Acc id="awards" title="Awards & achievements" count={cv.awards.length} open={!!open.awards} toggle={toggle} right={eye('awards')}>
        <Bullets items={cv.awards} onChange={(v) => up({ awards: v })} label="Award" />
      </Acc>

      <Acc id="certs" title="Certifications" count={cv.certifications.length} open={!!open.certs} toggle={toggle} right={eye('certifications')}>
        <Bullets items={cv.certifications} onChange={(v) => up({ certifications: v })} label="Certification" />
      </Acc>

      <Acc id="orgs" title="Organization & volunteering" count={cv.organizations.length} open={!!open.orgs} toggle={toggle} right={eye('organizations')}>
        {cv.organizations.map((o, i) => {
          const set = (patch: Partial<typeof o>) => up({ organizations: cv.organizations.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
          return (
            <div className="entry" key={o.id}>
              <EntryHead
                title={o.role}
                i={i}
                n={cv.organizations.length}
                onMove={(d) => up({ organizations: move(cv.organizations, i, d) })}
                onRemove={() => up({ organizations: cv.organizations.filter((_, k) => k !== i) })}
              />
              <div className="grid-2">
                <Field label="Role" value={o.role} onChange={(v) => set({ role: v })} />
                <Field label="Period" value={o.period} onChange={(v) => set({ period: v })} />
              </div>
              <Field label="Organization" value={o.org} onChange={(v) => set({ org: v })} />
              <Field label="Description" value={o.description} onChange={(v) => set({ description: v })} rows={3} />
            </div>
          );
        })}
        <button className="add-btn" onClick={() => up({ organizations: [...cv.organizations, { id: uid(), role: '', org: '', period: '', description: '' }] })}>
          <Icon name="plus" size={13} /> Add organization
        </button>
      </Acc>
    </div>
  );
}
