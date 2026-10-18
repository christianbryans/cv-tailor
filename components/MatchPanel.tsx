'use client';

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

function Ring({ value }: { value: number }) {
  const R = 38;
  const C = 2 * Math.PI * R;
  const tone = value >= 75 ? 'good' : value >= 50 ? 'mid' : 'low';
  return (
    <div className={`ring ring-${tone}`} role="img" aria-label={`Keyword match ${value} percent`}>
      <svg viewBox="0 0 100 100" width="104" height="104">
        <circle cx="50" cy="50" r={R} className="ring-bg" />
        <circle
          cx="50"
          cy="50"
          r={R}
          className="ring-fg"
          strokeDasharray={`${(value / 100) * C} ${C}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="ring-n">
        <b>{value}</b>
        <span>%</span>
      </div>
    </div>
  );
}

export default function MatchPanel(p: Props) {
  const { analysis: a } = p;
  return (
    <div className="stack">
      <section className="card">
        {p.hasJob && a.total > 0 ? (
          <>
            <div className="score">
              <Ring value={a.score} />
              <div>
                <h3>Keyword match</h3>
                <p>
                  {a.matched.length} of {a.total} key terms from the posting appear in this CV.
                </p>
                <small>Estimated from the posting text — not an official ATS score.</small>
              </div>
            </div>

            <div className="kw-block">
              <div className="kw-h">
                <Icon name="check" size={13} /> In your CV <em>{a.matched.length}</em>
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
                <div className="kw-h warn">
                  <Icon name="alert" size={13} /> Not found <em>{a.missing.length}</em>
                </div>
                <div className="chips">
                  {a.missing.map((k) => (
                    <button className="chip chip-warn" key={k} onClick={() => p.onAddSkill(k)} title="Add to your skills — only if it is true">
                      <Icon name="plus" size={11} /> {k}
                    </button>
                  ))}
                </div>
                <small className="hint">Click a term to add it to “Additional Skills” — only if you genuinely have it.</small>
              </div>
            )}
          </>
        ) : (
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
        )}
      </section>

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
