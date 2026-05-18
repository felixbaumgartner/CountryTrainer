import { useMemo } from 'react';
import { useStore } from '../../state/store';
import type { Card, SessionLog } from '../../state/types';
import { isDue } from '../../srs/leitner';
import { countryByCode } from '../../data/countries';

type Props = {
  log: SessionLog;
  onHome: () => void;
  onFocusWeak: () => void;
};

export function DoneScreen({ log, onHome, onFocusWeak }: Props) {
  const { state } = useStore();
  const now = new Date();

  const minutes = Math.max(1, Math.round(log.durationMs / 60_000));
  const accuracy = log.cardsReviewed > 0 ? log.correctCount / log.cardsReviewed : 0;

  const nextReviewAt = useMemo(() => {
    let earliest: number | null = null;
    for (const c of Object.values(state.cards)) {
      if (!c.introduced) continue;
      if (isDue(c, now)) continue;
      const t = new Date(c.nextReview).getTime();
      if (earliest === null || t < earliest) earliest = t;
    }
    return earliest ? new Date(earliest) : null;
  }, [state.cards]);

  const weakest = useMemo(() => weakestCountries(state.cards, 3), [state.cards]);

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <section className="card relative overflow-hidden p-7 sm:p-9">
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-300">
          Session complete
        </p>
        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
          Nice work
        </h1>
        <div className="grid grid-cols-3 gap-3">
          <SummaryStat
            label="Reviewed"
            value={log.cardsReviewed.toString()}
            sub="cards"
          />
          <SummaryStat
            label="Accuracy"
            value={`${Math.round(accuracy * 100)}%`}
            sub={`${log.correctCount}/${log.cardsReviewed}`}
            tone={accuracy >= 0.8 ? 'good' : accuracy >= 0.6 ? 'mid' : 'low'}
          />
          <SummaryStat
            label="Time"
            value={`${minutes}`}
            sub={minutes === 1 ? 'min' : 'mins'}
          />
        </div>
      </section>

      {nextReviewAt && (
        <section className="card p-5">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Next review
          </div>
          <div className="mt-1 text-slate-200">
            {nextReviewAt.toLocaleString(undefined, {
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </section>
      )}

      {weakest.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Three weakest countries
          </h2>
          <ul className="mb-4 space-y-2 text-sm">
            {weakest.map((w) => {
              const country = countryByCode(state.countries, w.code);
              if (!country) return null;
              return (
                <li
                  key={w.code}
                  className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2"
                >
                  <span className="flex items-center gap-3">
                    <img
                      src={country.flagSvgUrl}
                      alt=""
                      className="h-5 w-auto rounded-sm border border-slate-700"
                    />
                    <span className="text-slate-200">{country.name}</span>
                  </span>
                  <span className="font-mono text-rose-300">
                    {Math.round(w.missRate * 100)}% miss
                  </span>
                </li>
              );
            })}
          </ul>
          <button onClick={onFocusWeak} className="btn-ghost text-sm">
            Focus on these next →
          </button>
        </section>
      )}

      <button onClick={onHome} className="btn-primary self-center">
        Back to home
      </button>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'good' | 'mid' | 'low';
}) {
  const color =
    tone === 'good'
      ? 'text-emerald-300'
      : tone === 'mid'
        ? 'text-amber-300'
        : tone === 'low'
          ? 'text-rose-300'
          : 'text-slate-50';
  return (
    <div className="rounded-xl bg-slate-800/40 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function weakestCountries(
  cards: Record<string, Card>,
  n: number,
): { code: string; missRate: number }[] {
  const byCountry: Record<string, { miss: number; total: number }> = {};
  for (const c of Object.values(cards)) {
    if (c.totalAttempts === 0) continue;
    const e = byCountry[c.countryCode] ?? { miss: 0, total: 0 };
    e.miss += c.totalAttempts - c.correctAttempts;
    e.total += c.totalAttempts;
    byCountry[c.countryCode] = e;
  }
  return Object.entries(byCountry)
    .filter(([, v]) => v.miss > 0 && v.total >= 2)
    .map(([code, v]) => ({ code, missRate: v.miss / v.total }))
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, n);
}
