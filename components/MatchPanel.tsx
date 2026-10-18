'use client';

import { tier } from '@/lib/ats';
import type { Analysis, Check } from '@/lib/ats';
import { Icon } from './Icons';

type Props = {
  analysis: Analysis;
  checks: Check[];
  hasJob: boolean;
  changes: string[];
  gaps: string[];
  warnings: string[];
  onAddSkill: (kw: string) => void;
  onGoSource: () => void;
};

const TIER_LABEL = { poor: 'Low', fair: 'Fair', good: 'Good', excellent: 'Excellent' } as const;

export default function MatchPanel(p: Props) {
  const { analysis: a } = p;
  const t = tier(a.score);
  return (
    <div className="stack">
      {p.hasJob && a.total > 0 ? (
        <>
          <section className="kpis" aria-label="Keyword match summary">
            <div className="kpi">
              <span className="kpi-l">Keyword match</span>
              <div className="kpi-row">
                <span className="t-kpi">{a.score}%</span>
              </div>
              <span className={`trend tier-${t}`}>
                <Icon name={a.score >= 50 ? 'trendup' : 'trenddown'} size={16} />
                {TIER_LABEL[t]}
              </span>
            </div>
            <div className="kpi">
              <span className="kpi-l">In your CV</span>
              <div className="kpi-row">
                <span className="t-kpi">{a.matched.length}</span>
              </div>
              <span className="kpi-sub">of {a.total} terms</span>
            </div>
            <div className="kpi">
              <span className="kpi-l">Not found</span>
              <div className="kpi-row">
                <span className="t-kpi">{a.missing.length}</span>
              </div>
              <span className="kpi-sub">to review</span>
            </div>
          </section>
          <p className="score-note">Estimated from the posting text. Not an official ATS score.</p>

          <section className="card">
            <div className="kw-block">
              <div className="kw-h">
                <Icon name="check" size={16} /> In your CV <em>{a.matched.length}</em>
              </div>
              <div className="chips">
                {a.matched.map((k) => (
                  <span className="chip chip-good" key={k}>
                    {k}
                  </span>
                ))}
              </div>
            </div>

            {a.missing.length > 0 && (
              <div className="kw-block">
                <div className="kw-h">
                  <Icon name="alert" size={16} /> Not found <em>{a.missing.length}</em>
                </div>
                <div className="chips">
                  {a.missing.map((k) => (
                    <button className="chip chip-warn" key={k} onClick={() => p.onAddSkill(k)} title="Add to your skills, only if it is true">
                      <Icon name="plus" size={12} /> {k}
                    </button>
                  ))}
                </div>
                <small className="hint">Click a term to add it to “Additional Skills”, only if you genuinely have it.</small>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="card">
          <div className="empty">
            <div className="empty-ico">
              <Icon name="target" size={20} />
            </div>
            <h3>No job to compare yet</h3>
            <p>Add a job link or paste a description to see how well this CV matches.</p>
            <button className="btn btn-sm" onClick={p.onGoSource}>
              Add a job
            </button>
          </div>
        </section>
      )}

      {p.changes.length > 0 && (
        <section className="card">
          <div className="card-h">
            <Icon name="sparkles" size={16} />
            <div>
              <h3>What changed</h3>
              <p>Edits the AI made for this role.</p>
            </div>
          </div>
          <ul className="notes">
            {p.changes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {p.gaps.length > 0 && (
        <section className="card">
          <div className="card-h">
            <Icon name="target" size={16} />
            <div>
              <h3>Gaps to be aware of</h3>
              <p>Asked for in the posting, but not evidenced in your baseline.</p>
            </div>
          </div>
          <ul className="notes">
            {p.gaps.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {p.warnings.length > 0 && (
        <section className="card card-warn">
          <div className="card-h">
            <Icon name="alert" size={16} />
            <div>
              <h3>Please verify</h3>
              <p>Things the integrity check could not confirm.</p>
            </div>
          </div>
          <ul className="notes">
            {p.warnings.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="card-h">
          <Icon name="file" size={16} />
          <div>
            <h3>ATS readiness</h3>
            <p>Formatting and structure checks.</p>
          </div>
        </div>
        <ul className="checks">
          {p.checks.map((c) => (
            <li key={c.id} className={c.ok ? 'ok' : 'bad'}>
              <span className="check-ico">
                <Icon name={c.ok ? 'check' : 'alert'} size={12} />
              </span>
              <div>
                <b>{c.label}</b>
                {!c.ok && c.hint && <small>{c.hint}</small>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
