'use client';

import { useRef, useState } from 'react';
import type { Job, Opts, Version } from '@/lib/types';
import { Icon } from './Icons';

type Props = {
  baselineName: string;
  isSample: boolean;
  busy: string;
  job: Job;
  setJob: (j: Job) => void;
  opts: Opts;
  setOpts: (o: Opts) => void;
  versions: Version[];
  activeId: string | null;
  onUpload: (f: File) => void;
  onPasteBaseline: (t: string) => void;
  onResetSample: () => void;
  onFetchJob: () => void;
  onSelectVersion: (id: string | null) => void;
  onDeleteVersion: (id: string) => void;
  jobWarning: string;
};

function Seg<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SourcePanel(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const parsing = p.busy === 'parse';
  const fetching = p.busy === 'fetch';
  const jdLen = p.job.text.trim().length;

  return (
    <div className="stack">
      {/* ---------- Baseline ---------- */}
      <section className="card">
        <div className="card-h">
          <span className="step">1</span>
          <div>
            <h3>Baseline CV</h3>
            <p>Your master CV. It is never overwritten by tailoring.</p>
          </div>
        </div>

        <div
          className={`drop ${drag ? 'drag' : ''} ${parsing ? 'busy' : ''}`}
          onClick={() => !parsing && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !parsing) p.onUpload(f);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) p.onUpload(f);
              e.target.value = '';
            }}
          />
          <div className="drop-ico">{parsing ? <span className="spinner" /> : <Icon name="upload" size={18} />}</div>
          <div>
            <strong>{parsing ? 'Reading your CV…' : 'Drop your CV or click to upload'}</strong>
            <span>PDF, DOCX, TXT · up to 4 MB</span>
          </div>
        </div>

        <div className="row-between">
          <div className="current">
            <Icon name="file" size={14} />
            <span className="truncate">{p.baselineName || 'Untitled'}</span>
            {p.isSample && <em className="tag">sample</em>}
          </div>
          <div className="row-gap">
            <button className="link-btn" onClick={() => setPasteOpen((v) => !v)}>
              {pasteOpen ? 'Hide paste' : 'Paste text'}
            </button>
            {!p.isSample && (
              <button className="link-btn" onClick={p.onResetSample}>
                Reset to sample
              </button>
            )}
          </div>
        </div>

        {pasteOpen && (
          <div className="paste">
            <textarea
              className="textarea"
              rows={6}
              placeholder="Paste the text of your CV here…"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <button
              className="btn btn-sm"
              disabled={pasted.trim().length < 80 || parsing}
              onClick={() => {
                p.onPasteBaseline(pasted);
                setPasted('');
                setPasteOpen(false);
              }}
            >
              Use this text
            </button>
          </div>
        )}
      </section>

      {/* ---------- Job ---------- */}
      <section className="card">
        <div className="card-h">
          <span className="step">2</span>
          <div>
            <h3>Target job</h3>
            <p>Paste the job link, or the description itself.</p>
          </div>
        </div>

        <div className="url-row">
          <div className="input-ico">
            <Icon name="link" size={15} />
            <input
              className="input"
              placeholder="https://company.com/careers/product-designer"
              value={p.job.url}
              onChange={(e) => p.setJob({ ...p.job, url: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && p.job.url && p.onFetchJob()}
            />
          </div>
          <button className="btn" disabled={!p.job.url.trim() || fetching} onClick={p.onFetchJob}>
            {fetching ? <span className="spinner" /> : 'Fetch'}
          </button>
        </div>

        {p.jobWarning && (
          <div className="note note-warn">
            <Icon name="alert" size={14} />
            <span>{p.jobWarning}</span>
          </div>
        )}

        <div className="grid-2">
          <label className="field">
            <span>Role</span>
            <input className="input" value={p.job.title} onChange={(e) => p.setJob({ ...p.job, title: e.target.value })} placeholder="Product Designer" />
          </label>
          <label className="field">
            <span>Company</span>
            <input className="input" value={p.job.company} onChange={(e) => p.setJob({ ...p.job, company: e.target.value })} placeholder="Acme Inc." />
          </label>
        </div>

        <label className="field">
          <span>
            Job description <em className={jdLen < 150 ? 'muted' : 'ok'}>{jdLen.toLocaleString()} chars</em>
          </span>
          <textarea
            className="textarea"
            rows={9}
            placeholder="Paste the full job posting — responsibilities, requirements, nice-to-haves…"
            value={p.job.text}
            onChange={(e) => p.setJob({ ...p.job, text: e.target.value })}
          />
        </label>
      </section>

      {/* ---------- Options ---------- */}
      <section className="card">
        <div className="card-h">
          <span className="step">3</span>
          <div>
            <h3>Tailoring</h3>
            <p>How far should the AI go? Facts are never changed.</p>
          </div>
        </div>

        <div className="opt">
          <span>Rewrite intensity</span>
          <Seg
            value={p.opts.intensity}
            onChange={(v) => p.setOpts({ ...p.opts, intensity: v })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'bold', label: 'Bold' },
            ]}
          />
        </div>
        <div className="opt">
          <span>Length</span>
          <Seg
            value={p.opts.pages}
            onChange={(v) => p.setOpts({ ...p.opts, pages: v })}
            options={[
              { value: 1, label: '1 page' },
              { value: 2, label: '2 pages' },
            ]}
          />
        </div>
        <div className="opt">
          <span>Output language</span>
          <Seg
            value={p.opts.language}
            onChange={(v) => p.setOpts({ ...p.opts, language: v })}
            options={[
              { value: 'English', label: 'English' },
              { value: 'Bahasa Indonesia', label: 'Indonesia' },
            ]}
          />
        </div>
      </section>

      {/* ---------- Versions ---------- */}
      {p.versions.length > 0 && (
        <section className="card">
          <div className="card-h">
            <Icon name="history" size={16} />
            <div>
              <h3>Saved versions</h3>
              <p>Every tailored CV is saved in this browser.</p>
            </div>
          </div>
          <ul className="versions">
            <li className={p.activeId === null ? 'on' : ''}>
              <button onClick={() => p.onSelectVersion(null)}>
                <strong>Baseline</strong>
                <span>Master CV</span>
              </button>
            </li>
            {p.versions.map((v) => (
              <li key={v.id} className={p.activeId === v.id ? 'on' : ''}>
                <button onClick={() => p.onSelectVersion(v.id)}>
                  <strong className="truncate">{v.name}</strong>
                  <span>{new Date(v.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                </button>
                <button className="icon-btn" aria-label={`Delete ${v.name}`} onClick={() => p.onDeleteVersion(v.id)}>
                  <Icon name="trash" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
