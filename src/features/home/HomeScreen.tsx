import { useMemo } from 'react';
import { useStore } from '../../state/store';
import { isDue, isMastered } from '../../srs/leitner';
import { backlogSize } from '../../srs/scheduler';
import { computeStreak } from '../../state/reducer';

const SECONDS_PER_CARD = 8;

function fmtMinutes(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

function nextEarliest(times: string[]): Date | null {
  if (!times.length) return null;
  return new Date(Math.min(...times.map((t) => new Date(t).getTime())));
}

export function HomeScreen({ onStart }: { onStart: () => void }) {
  const { state } = useStore();
  const now = new Date();

  const stats = useMemo(() => {
    const allCards = Object.values(state.cards);
    const dueCount = allCards.filter((c) => isDue(c, now)).length;
    const newAvailable = allCards.filter((c) => !c.introduced).length;
    const newToday = Math.min(state.newCardsPerDay, newAvailable);
    const masteredCards = allCards.filter(isMastered).length;
    const countryMastered = state.countries.filter((country) => {
      // a country is fully mastered if all 6 cards are mastered
      const cards = allCards.filter((c) => c.countryCode === country.code);
      return cards.length === 6 && cards.every(isMastered);
    }).length;
    const streak = computeStreak(state.sessions, now);
    const sessionSize = dueCount + newToday;
    const estimateSec = sessionSize * SECONDS_PER_CARD;
    const futureReviews = allCards
      .filter((c) => c.introduced && !isDue(c, now))
      .map((c) => c.nextReview);
    const nextAt = nextEarliest(futureReviews);
    const backlog = backlogSize(state.cards, now);
    return {
      dueCount,
      newToday,
      newAvailable,
      masteredCards,
      countryMastered,
      streak,
      sessionSize,
      estimateSec,
      nextAt,
      backlog,
      totalCards: allCards.length,
    };
  }, [state.cards, state.countries, state.newCardsPerDay, state.sessions]);

  const isAllDone = stats.sessionSize === 0;

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <section className="card relative overflow-hidden p-7 sm:p-9">
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          {isAllDone ? (
            <AllDone nextAt={stats.nextAt} />
          ) : (
            <StartCTA
              dueCount={stats.dueCount}
              newToday={stats.newToday}
              estimateSec={stats.estimateSec}
              onStart={onStart}
            />
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatCard
          label="Cards mastered"
          value={`${stats.masteredCards}`}
          sub={`of ${stats.totalCards}`}
        />
        <StatCard
          label="Countries done"
          value={`${stats.countryMastered}`}
          sub={`of ${state.countries.length}`}
        />
        <StatCard
          label="Streak"
          value={`${stats.streak}`}
          sub={stats.streak === 1 ? 'day' : 'days'}
        />
      </section>

      {stats.backlog > 30 && (
        <div className="card border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          Heads up: {stats.backlog} cards are overdue. The app has paused new cards
          until you catch up.
        </div>
      )}

      {state.sessions.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Recent sessions
          </h2>
          <ul className="space-y-2 text-sm">
            {state.sessions
              .slice(-5)
              .reverse()
              .map((s) => {
                const acc = s.cardsReviewed > 0 ? s.correctCount / s.cardsReviewed : 0;
                return (
                  <li
                    key={s.date}
                    className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2"
                  >
                    <span className="text-slate-300">{s.date}</span>
                    <span className="flex items-center gap-3 text-slate-400">
                      <span>{s.cardsReviewed} cards</span>
                      <span
                        className={
                          acc >= 0.8
                            ? 'text-emerald-300'
                            : acc >= 0.6
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }
                      >
                        {Math.round(acc * 100)}%
                      </span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      )}
    </div>
  );
}

function StartCTA({
  dueCount,
  newToday,
  estimateSec,
  onStart,
}: {
  dueCount: number;
  newToday: number;
  estimateSec: number;
  onStart: () => void;
}) {
  return (
    <>
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-sky-300">
        Today's session
      </p>
      <h1 className="mb-1 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
        {dueCount} due
        {newToday > 0 && <span className="text-slate-400"> + {newToday} new</span>}
      </h1>
      <p className="mb-6 text-slate-400">
        Estimated time: {fmtMinutes(estimateSec)}
      </p>
      <button onClick={onStart} className="btn-primary text-base" autoFocus>
        Start session
        <svg
          className="ml-2 h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
}

function AllDone({ nextAt }: { nextAt: Date | null }) {
  const nextStr = nextAt
    ? nextAt.toLocaleString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'soon';
  return (
    <>
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-300">
        All caught up
      </p>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
        Nothing due right now
      </h1>
      <p className="text-slate-400">Come back {nextStr} for your next batch.</p>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-slate-50">{value}</span>
        <span className="text-xs text-slate-500">{sub}</span>
      </div>
    </div>
  );
}
