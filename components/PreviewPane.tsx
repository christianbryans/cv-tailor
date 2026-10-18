'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CV, Layout, SectionKey } from '@/lib/types';
import { SECTION_LABELS } from '@/lib/types';
import { dateRange, linkText } from '@/lib/cv';
import { Icon } from './Icons';

const MM = 3.7795;
const PAPER_W = 210 * MM;
const PAGE_H = 297 * MM;
const MARGIN_Y = 12 * MM;
const USABLE_H = PAGE_H - MARGIN_Y * 2;

function Section({ k, children }: { k: SectionKey; children: React.ReactNode }) {
  return (
    <section className="cv-sec">
      <h2 className="cv-h">{SECTION_LABELS[k]}</h2>
      {children}
    </section>
  );
}

export function CVPaper({ cv, layout }: { cv: CV; layout: Layout }) {
  const contact = [cv.phone, cv.email, cv.location].filter(Boolean);
  const render = (k: SectionKey) => {
    switch (k) {
      case 'summary':
        return cv.summary ? (
          <Section k={k} key={k}>
            <p className="cv-p">{cv.summary}</p>
          </Section>
        ) : null;
      case 'experience':
        return cv.experience.length ? (
          <Section k={k} key={k}>
            {cv.experience.map((e) => (
              <div className="cv-entry" key={e.id}>
                <div className="cv-row">
                  <div>
                    <strong>{e.role}</strong>
                    {e.company ? <span> — {e.company}</span> : null}
                    {e.location ? <span className="cv-muted">, {e.location}</span> : null}
                  </div>
                  <div className="cv-date">{dateRange(e.start, e.end)}</div>
                </div>
                {e.bullets.length > 0 && (
                  <ul className="cv-ul">
                    {e.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        ) : null;
      case 'education':
        return cv.education.length ? (
          <Section k={k} key={k}>
            {cv.education.map((e) => (
              <div className="cv-entry" key={e.id}>
                <div className="cv-row">
                  <div>
                    <strong>{e.school}</strong>
                    {e.location ? <span className="cv-muted"> — {e.location}</span> : null}
                  </div>
                  <div className="cv-date">{dateRange(e.start, e.end)}</div>
                </div>
                {e.degree && <div className="cv-sub">{e.degree}</div>}
                {e.details.length > 0 && (
                  <ul className="cv-ul">
                    {e.details.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        ) : null;
      case 'skills':
        return cv.skills.length ? (
          <Section k={k} key={k}>
            <ul className="cv-skills">
              {cv.skills.map((g) => (
                <li key={g.id}>
                  <strong>{g.label}:</strong> {g.items}
                </li>
              ))}
            </ul>
          </Section>
        ) : null;
      case 'awards':
        return cv.awards.length ? (
          <Section k={k} key={k}>
            <ul className="cv-ul">
              {cv.awards.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Section>
        ) : null;
      case 'certifications':
        return cv.certifications.length ? (
          <Section k={k} key={k}>
            <ul className="cv-ul">
              {cv.certifications.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Section>
        ) : null;
      case 'organizations':
        return cv.organizations.length ? (
          <Section k={k} key={k}>
            {cv.organizations.map((o) => (
              <div className="cv-entry" key={o.id}>
                <div className="cv-row">
                  <div>
                    <strong>{o.role}</strong>
                    {o.org ? <span> — {o.org}</span> : null}
                  </div>
                  <div className="cv-date">{o.period}</div>
                </div>
                {o.description && <p className="cv-p cv-tight">{o.description}</p>}
              </div>
            ))}
          </Section>
        ) : null;
    }
  };

  return (
    <>
      <header className="cv-head">
        <h1>{cv.name || 'Your Name'}</h1>
        {cv.headline && <div className="cv-headline">{cv.headline}</div>}
        <div className="cv-contact">
          {contact.map((c, i) => (
            <span key={`c${i}`}>
              {i > 0 && <i> | </i>}
              {c}
            </span>
          ))}
          {cv.links.map((l, i) => (
            <span key={`l${i}`}>
              {(contact.length > 0 || i > 0) && <i> | </i>}
              {l.url ? <a href={l.url.startsWith('http') ? l.url : `https://${l.url}`}>{linkText(l)}</a> : linkText(l)}
            </span>
          ))}
        </div>
      </header>
      {layout.order.filter((k) => !layout.hidden.includes(k)).map(render)}
    </>
  );
}

export default function PreviewPane({ cv, layout, pageLimit }: { cv: CV; layout: Layout; pageLimit: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [hostW, setHostW] = useState(900);
  const [paperH, setPaperH] = useState(PAGE_H);
  const [zoom, setZoom] = useState<'fit' | number>('fit');

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHostW(el.clientWidth));
    ro.observe(el);
    setHostW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPaperH(el.offsetHeight));
    ro.observe(el);
    setPaperH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  const fit = Math.max(0.35, Math.min(1.25, (hostW - 56) / PAPER_W));
  const scale = zoom === 'fit' ? fit : zoom;
  const contentH = Math.max(0, paperH - MARGIN_Y * 2);
  const pages = Math.max(1, Math.ceil(contentH / (USABLE_H * 0.97)));
  const over = pages > pageLimit;
  const guides = Array.from({ length: pages - 1 }, (_, i) => MARGIN_Y + (i + 1) * USABLE_H * 0.97);

  const step = (d: number) => setZoom(Math.max(0.4, Math.min(1.6, +(scale + d).toFixed(2))));

  return (
    <div className="preview">
      <div className="preview-bar">
        <div className="preview-title">
          <span className="dot-live" /> Live preview
          <span className={`pill ${over ? 'pill-warn' : 'pill-good'}`}>
            {over ? <Icon name="alert" size={12} /> : <Icon name="check" size={12} />} ≈ {pages} page{pages > 1 ? 's' : ''}
            {over ? ` · target ${pageLimit}` : ''}
          </span>
        </div>
        <div className="zoom">
          <button className="icon-btn" onClick={() => step(-0.1)} aria-label="Zoom out">
            <Icon name="minus" size={14} />
          </button>
          <button className="zoom-val" onClick={() => setZoom('fit')} title="Fit to width">
            {Math.round(scale * 100)}%
          </button>
          <button className="icon-btn" onClick={() => step(0.1)} aria-label="Zoom in">
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>

      <div className="canvas" ref={hostRef}>
        <div className="scale-box" style={{ width: PAPER_W * scale, height: paperH * scale }}>
          <div className="paper-scale" style={{ width: PAPER_W, transform: `scale(${scale})` }}>
            <div className="paper" id="cv-paper" ref={paperRef}>
              <CVPaper cv={cv} layout={layout} />
              {guides.map((top, i) => (
                <div className="page-guide" key={i} style={{ top }}>
                  <span>Page {i + 2}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="canvas-foot">ATS-safe layout · single column · selectable text · standard headings</div>
      </div>
    </div>
  );
}
