'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_LAYOUT, DEFAULT_OPTS } from '@/lib/types';
import type { CV, Job, Layout, Opts, Version } from '@/lib/types';
import { SAMPLE_CV } from '@/lib/sample';
import { cvToPlainText, normalizeCV, uid } from '@/lib/cv';
import { analyze, atsChecks } from '@/lib/ats';
import { Icon, Logo } from '@/components/Icons';
import SourcePanel from '@/components/SourcePanel';
import EditorPanel from '@/components/EditorPanel';
import MatchPanel from '@/components/MatchPanel';
import PreviewPane from '@/components/PreviewPane';

const LS = 'cvtailor:v1';
type Tab = 'source' | 'editor' | 'match';
type Toast = { kind: 'ok' | 'err'; msg: string } | null;

const EMPTY_JOB: Job = { url: '', title: '', company: '', text: '' };
const STAGES = ['Reading the job description…', 'Mapping the keywords…', 'Matching them to your real experience…', 'Rewriting the summary and bullets…', 'Running the integrity check…'];

async function api<T>(path: string, init: RequestInit, code: string): Promise<T> {
  const res = await fetch(path, { ...init, headers: { ...(init.headers || {}), ...(code ? { 'x-access-code': code } : {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data as T;
}

const slug = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim();

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [baseline, setBaseline] = useState<CV>(SAMPLE_CV);
  const [isSample, setIsSample] = useState(true);
  const [job, setJob] = useState<Job>(EMPTY_JOB);
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [opts, setOpts] = useState<Opts>(DEFAULT_OPTS);
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [tab, setTab] = useState<Tab>('source');
  const [busy, setBusy] = useState<'idle' | 'parse' | 'fetch' | 'tailor'>('idle');
  const [stage, setStage] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const [jobWarning, setJobWarning] = useState('');
  const [code, setCode] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menu, setMenu] = useState<'export' | 'settings' | null>(null);
  const [mobile, setMobile] = useState<'edit' | 'preview'>('edit');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = versions.find((v) => v.id === activeId) || null;
  const cv = active ? active.cv : baseline;

  const setCv = useCallback(
    (next: CV) => {
      if (active) setVersions((vs) => vs.map((v) => (v.id === active.id ? { ...v, cv: next } : v)));
      else {
        setBaseline(next);
        setIsSample(false);
      }
    },
    [active]
  );

  const notify = useCallback((kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), kind === 'err' ? 7000 : 3500);
  }, []);

  /* ---------- persistence ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.baseline) setBaseline(normalizeCV(d.baseline));
        if (typeof d.isSample === 'boolean') setIsSample(d.isSample);
        if (d.job) setJob({ ...EMPTY_JOB, ...d.job });
        if (Array.isArray(d.versions)) setVersions(d.versions.map((v: any) => ({ ...v, cv: normalizeCV(v.cv) })));
        if (d.opts) setOpts({ ...DEFAULT_OPTS, ...d.opts });
        if (d.layout) setLayout({ ...DEFAULT_LAYOUT, ...d.layout });
        if (d.activeId) setActiveId(d.activeId);
      }
      setCode(localStorage.getItem(`${LS}:code`) || '');
    } catch {
      /* corrupted storage — start fresh */
    }
    setTheme((document.documentElement.dataset.theme as 'light' | 'dark') || 'light');
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS, JSON.stringify({ baseline, isSample, job, versions, opts, layout, activeId }));
    } catch {
      /* storage full or blocked */
    }
  }, [hydrated, baseline, isSample, job, versions, opts, layout, activeId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(`${LS}:code`, code);
    } catch {}
  }, [hydrated, code]);

  useEffect(() => {
    if (busy !== 'tailor') return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 5500);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.menu-wrap')) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  /* ---------- derived ---------- */
  const analysis = useMemo(() => analyze(cv, job.text), [cv, job.text]);
  const checks = useMemo(() => atsChecks(cv), [cv]);
  const jobReady = job.text.trim().length >= 150;

  /* ---------- actions ---------- */
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(`${LS}:theme`, next);
    } catch {}
  };

  const onUpload = async (file: File) => {
    setBusy('parse');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { cv: parsed } = await api<{ cv: CV }>('/api/parse', { method: 'POST', body: fd }, code);
      setBaseline(normalizeCV(parsed));
      setIsSample(false);
      setActiveId(null);
      notify('ok', `Baseline updated from ${file.name}`);
      setTab('editor');
    } catch (e) {
      notify('err', (e as Error).message);
    } finally {
      setBusy('idle');
    }
  };

  const onPasteBaseline = async (text: string) => {
    setBusy('parse');
    try {
      const { cv: parsed } = await api<{ cv: CV }>(
        '/api/parse',
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) },
        code
      );
      setBaseline(normalizeCV(parsed));
      setIsSample(false);
      setActiveId(null);
      notify('ok', 'Baseline updated from pasted text');
      setTab('editor');
    } catch (e) {
      notify('err', (e as Error).message);
    } finally {
      setBusy('idle');
    }
  };

  const onFetchJob = async () => {
    setBusy('fetch');
    setJobWarning('');
    try {
      const r = await api<{ title: string; company: string; text: string; warning?: string }>(
        '/api/job',
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: job.url }) },
        code
      );
      setJob((j) => ({ ...j, title: j.title || r.title, company: j.company || r.company, text: r.text }));
      if (r.warning) setJobWarning(r.warning);
      else notify('ok', 'Job description fetched');
    } catch (e) {
      setJobWarning((e as Error).message);
    } finally {
      setBusy('idle');
    }
  };

  const onTailor = async () => {
    if (busy !== 'idle') return;
    setBusy('tailor');
    try {
      const r = await api<{
        cv: CV;
        job: { title: string; company: string };
        changes: string[];
        gaps: string[];
        warnings: string[];
      }>(
        '/api/tailor',
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cv: baseline, job, options: opts }) },
        code
      );
      const nextJob: Job = { ...job, title: job.title || r.job.title, company: job.company || r.job.company };
      setJob(nextJob);
      const v: Version = {
        id: uid(),
        name: [nextJob.company, nextJob.title].filter(Boolean).join(' — ') || 'Tailored CV',
        cv: normalizeCV(r.cv),
        job: nextJob,
        changes: r.changes,
        gaps: r.gaps,
        warnings: r.warnings,
        createdAt: Date.now(),
      };
      setVersions((vs) => [v, ...vs].slice(0, 25));
      setActiveId(v.id);
      setTab('match');
      setMobile('preview');
      notify('ok', 'Tailored CV ready — review it on the right');
    } catch (e) {
      notify('err', (e as Error).message);
    } finally {
      setBusy('idle');
    }
  };

  const onSelectVersion = (id: string | null) => {
    setActiveId(id);
    const v = versions.find((x) => x.id === id);
    if (v) setJob(v.job);
  };

  const onDeleteVersion = (id: string) => {
    setVersions((vs) => vs.filter((v) => v.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const onAddSkill = (kw: string) => {
    const label = 'Additional Skills';
    const has = cv.skills.find((g) => g.label === label);
    const skills = has
      ? cv.skills.map((g) => (g.label === label ? { ...g, items: g.items ? `${g.items}, ${kw}` : kw } : g))
      : [...cv.skills, { id: uid(), label, items: kw }];
    setCv({ ...cv, skills });
    notify('ok', `Added “${kw}” to Additional Skills`);
  };

  const fileBase = () => slug(`${cv.name || 'CV'} - CV${job.company ? ` - ${job.company}` : ''}`);

  const exportPdf = () => {
    setMenu(null);
    const prev = document.title;
    document.title = fileBase();
    const restore = () => {
      document.title = prev;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => window.print(), 50);
  };

  const exportDocx = async () => {
    setMenu(null);
    try {
      const { buildDocx } = await import('@/lib/exportDocx');
      const blob = await buildDocx(cv, layout);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${fileBase()}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      notify('ok', 'Word file downloaded');
    } catch (e) {
      notify('err', `Could not build the DOCX: ${(e as Error).message}`);
    }
  };

  const copyText = async () => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(cvToPlainText(cv, layout));
      notify('ok', 'Plain-text CV copied to clipboard');
    } catch {
      notify('err', 'Clipboard is blocked by the browser.');
    }
  };

  const tailorLabel =
    busy === 'tailor' ? STAGES[stage] : activeId ? 'Re-tailor from baseline' : 'Tailor CV to this job';

  return (
    <div className="app" data-mobile={mobile}>
      {/* ================= top bar ================= */}
      <header className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <b>Tailor</b>
            <span>ATS CV Studio</span>
          </div>
        </div>

        <div className="top-mid">
          <div className="ver">
            <Icon name="layout" size={14} />
            <select aria-label="Active CV version" value={activeId ?? ''} onChange={(e) => onSelectVersion(e.target.value || null)}>
              <option value="">Baseline · master CV</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="top-right">
          <div className="mobile-switch">
            <button className={mobile === 'edit' ? 'on' : ''} onClick={() => setMobile('edit')}>
              Edit
            </button>
            <button className={mobile === 'preview' ? 'on' : ''} onClick={() => setMobile('preview')}>
              Preview
            </button>
          </div>

          <button className="icon-btn lg" onClick={toggleTheme} aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>

          <div className="menu-wrap">
            <button className="icon-btn lg" aria-label="Settings" onClick={() => setMenu(menu === 'settings' ? null : 'settings')}>
              <Icon name="settings" size={16} />
            </button>
            {menu === 'settings' && (
              <div className="menu menu-wide" role="dialog" aria-label="Settings">
                <div className="menu-h">
                  <Icon name="lock" size={13} /> Access code
                </div>
                <p className="menu-p">Only needed if the owner set an ACCESS_CODE on this deployment. Stored in this browser.</p>
                <input className="input" type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Leave empty if not required" />
                <div className="menu-sep" />
                <button
                  className="menu-item danger"
                  onClick={() => {
                    if (confirm('Delete all saved versions and reset the baseline to the sample CV?')) {
                      setVersions([]);
                      setActiveId(null);
                      setBaseline(SAMPLE_CV);
                      setIsSample(true);
                      setJob(EMPTY_JOB);
                      setMenu(null);
                    }
                  }}
                >
                  <Icon name="trash" size={14} /> Reset everything
                </button>
              </div>
            )}
          </div>

          <div className="menu-wrap">
            <button className="btn btn-dark" onClick={() => setMenu(menu === 'export' ? null : 'export')} aria-haspopup="menu" aria-expanded={menu === 'export'}>
              <Icon name="download" size={15} /> Export
            </button>
            {menu === 'export' && (
              <div className="menu" role="menu">
                <button className="menu-item" role="menuitem" onClick={exportPdf}>
                  <Icon name="file" size={14} />
                  <span>
                    PDF <small>Text-based, ATS-readable</small>
                  </span>
                </button>
                <button className="menu-item" role="menuitem" onClick={exportDocx}>
                  <Icon name="file" size={14} />
                  <span>
                    Word (.docx) <small>Editable</small>
                  </span>
                </button>
                <button className="menu-item" role="menuitem" onClick={copyText}>
                  <Icon name="copy" size={14} />
                  <span>
                    Copy as plain text <small>For application forms</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= main split ================= */}
      <main className="main">
        <aside className="left">
          <nav className="tabs" role="tablist">
            {(
              [
                ['source', 'Source', 'upload'],
                ['editor', 'Editor', 'pen'],
                ['match', 'Match', 'target'],
              ] as const
            ).map(([id, label, icon]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                <Icon name={icon} size={14} />
                {label}
                {id === 'match' && jobReady && analysis.total > 0 && <em className={`score-dot ${analysis.score >= 75 ? 'good' : analysis.score >= 50 ? 'mid' : 'low'}`}>{analysis.score}</em>}
              </button>
            ))}
          </nav>

          <div className="left-scroll">
            {tab === 'source' && (
              <SourcePanel
                baselineName={baseline.name}
                isSample={isSample}
                busy={busy}
                job={job}
                setJob={setJob}
                opts={opts}
                setOpts={setOpts}
                versions={versions}
                activeId={activeId}
                onUpload={onUpload}
                onPasteBaseline={onPasteBaseline}
                onResetSample={() => {
                  setBaseline(SAMPLE_CV);
                  setIsSample(true);
                  setActiveId(null);
                }}
                onFetchJob={onFetchJob}
                onSelectVersion={onSelectVersion}
                onDeleteVersion={onDeleteVersion}
                jobWarning={jobWarning}
              />
            )}
            {tab === 'editor' && (
              <>
                {active && (
                  <div className="note">
                    <Icon name="pen" size={14} />
                    <span>
                      Editing <b>{active.name}</b>. Your baseline stays untouched.
                    </span>
                  </div>
                )}
                <EditorPanel cv={cv} setCv={setCv} layout={layout} setLayout={setLayout} />
              </>
            )}
            {tab === 'match' && (
              <MatchPanel
                analysis={analysis}
                checks={checks}
                hasJob={jobReady}
                changes={active?.changes || []}
                gaps={active?.gaps || []}
                warnings={active?.warnings || []}
                onAddSkill={onAddSkill}
                onGoSource={() => setTab('source')}
              />
            )}
          </div>

          <div className="left-foot">
            <button className="btn btn-primary btn-xl" disabled={!jobReady || busy !== 'idle'} onClick={onTailor}>
              {busy === 'tailor' ? <span className="spinner spinner-light" /> : <Icon name="sparkles" size={16} />}
              <span>{tailorLabel}</span>
            </button>
            <p className="foot-note">
              {!jobReady ? 'Add a job description to unlock tailoring.' : 'The AI rewrites from your baseline. Employers, dates, skills and awards are verified against it.'}
            </p>
          </div>
        </aside>

        <PreviewPane cv={cv} layout={layout} pageLimit={opts.pages} />
      </main>

      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status" onClick={() => setToast(null)}>
          <Icon name={toast.kind === 'ok' ? 'check' : 'alert'} size={15} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
