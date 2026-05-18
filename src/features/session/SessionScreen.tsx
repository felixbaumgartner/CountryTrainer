import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { buildSession, requeueFailed, type QueueItem } from '../../srs/scheduler';
import { recomputeNewCardsPerDay } from '../../srs/adaptive';
import { chooseDistractors, buildOptions } from '../../srs/distractors';
import { cardKey } from '../../state/types';
import type { Card, SessionLog } from '../../state/types';
import { countryByCode } from '../../data/countries';
import { todayDateString } from '../../utils/dates';
import { Prompt } from './Prompt';

type Props = {
  focusOnWeakest: boolean;
  onFinish: (log: SessionLog) => void;
  onAbort: () => void;
};

type ResultEntry = {
  countryCode: string;
  promptType: string;
  correct: boolean;
  wasNew: boolean;
};

export function SessionScreen({ focusOnWeakest, onFinish, onAbort }: Props) {
  const { state, dispatch } = useStore();
  const startedAtRef = useRef<number>(Date.now());
  const initialBuildRef = useRef(false);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [results, setResults] = useState<ResultEntry[]>([]);
  // Refresh the prompt options when item changes; key by index.
  const [tick, setTick] = useState(0);

  // Adaptive recompute (once at session start) + initial build.
  useEffect(() => {
    if (initialBuildRef.current) return;
    initialBuildRef.current = true;
    const today = todayDateString(new Date());
    const lastSessionDate = state.lastSessionDate;
    let newN = state.newCardsPerDay;
    if (lastSessionDate !== today) {
      newN = recomputeNewCardsPerDay(
        state.newCardsPerDay,
        state.sessions,
        state.cards,
        new Date(),
      );
      if (newN !== state.newCardsPerDay) {
        dispatch({ type: 'SET_NEW_CARDS_PER_DAY', n: newN });
      }
    }
    let built = buildSession(state.cards, newN, new Date());
    if (focusOnWeakest) {
      const weakSet = new Set(weakestCountryCodes(state.cards, 3));
      built = [...built].sort((a, b) => {
        const aw = weakSet.has(a.card.countryCode) ? 0 : 1;
        const bw = weakSet.has(b.card.countryCode) ? 0 : 1;
        return aw - bw;
      });
    }
    setQueue(built);
    setCursor(0);
    setResults([]);
    startedAtRef.current = Date.now();
    // Mark new cards as introduced as they enter the queue
    for (const item of built) {
      if (item.isNew) {
        dispatch({
          type: 'INTRODUCE_CARD',
          key: cardKey(item.card.countryCode, item.card.promptType),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = queue[cursor];
  const country = current ? countryByCode(state.countries, current.card.countryCode) : undefined;

  const options = useMemo(() => {
    if (!current || !country) return [];
    const distractors = chooseDistractors(
      country,
      current.card.promptType,
      state.countries,
      state.cards,
    );
    return buildOptions(country.code, distractors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, tick, country?.code, current?.card.promptType, state.countries.length]);

  useEffect(() => {
    if (queue.length > 0 && cursor >= queue.length) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, queue.length]);

  function handleAnswer(correct: boolean) {
    if (!current) return;
    const key = cardKey(current.card.countryCode, current.card.promptType);
    dispatch({ type: 'ANSWER_CARD', key, correct });
    setResults((r) => [
      ...r,
      {
        countryCode: current.card.countryCode,
        promptType: current.card.promptType,
        correct,
        wasNew: current.isNew,
      },
    ]);
    if (!correct) {
      // Re-queue at cursor + 1 + cooldown (skip ahead 4)
      setQueue((q) => {
        const head = q.slice(0, cursor + 1);
        const tail = q.slice(cursor + 1);
        const restitched: QueueItem[] = [
          ...head,
          ...requeueFailed(tail, { card: current.card, isNew: false }, 4),
        ];
        return restitched;
      });
    }
  }

  function handleNext() {
    setCursor((c) => c + 1);
    setTick((t) => t + 1);
  }

  function finish() {
    const durationMs = Date.now() - startedAtRef.current;
    const cardsReviewed = results.length;
    const correctCount = results.filter((r) => r.correct).length;
    const newOnly = results.filter((r) => r.wasNew);
    const newCardsIntroduced = new Set(
      newOnly.map((r) => `${r.countryCode}:${r.promptType}`),
    ).size;
    const newCorrect = newOnly.filter((r) => r.correct).length;
    const log: SessionLog = {
      date: todayDateString(new Date()),
      cardsReviewed,
      correctCount,
      durationMs,
      newCardsIntroduced,
      newCardAccuracy: newOnly.length > 0 ? newCorrect / newOnly.length : 0,
    };
    if (cardsReviewed > 0) {
      dispatch({ type: 'RECORD_SESSION', log });
    }
    onFinish(log);
  }

  function abort() {
    if (results.length === 0) {
      onAbort();
      return;
    }
    finish();
  }

  if (!current || !country) {
    return (
      <div className="card animate-fade-in p-8 text-center">
        <p className="text-slate-300">No cards to review right now.</p>
        <button onClick={onAbort} className="btn-ghost mt-4">
          Back to home
        </button>
      </div>
    );
  }

  const total = queue.length;
  const position = cursor + 1;
  const correctSoFar = results.filter((r) => r.correct).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {position} <span className="text-slate-600">of</span> {total}
        </span>
        <span className="font-mono text-slate-400">
          {correctSoFar}/{results.length || 0}
          <span className="ml-2 text-slate-600">correct</span>
        </span>
        <button onClick={abort} className="btn-ghost text-xs">
          End session
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/60">
        <div
          className="h-full bg-gradient-to-r from-sky-400 to-violet-400 transition-all duration-300"
          style={{ width: `${(position / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      <Prompt
        key={`${cursor}-${tick}`}
        country={country}
        promptType={current.card.promptType}
        options={options}
        allCountries={state.countries}
        onAnswer={handleAnswer}
        onNext={handleNext}
      />
    </div>
  );
}

function weakestCountryCodes(cards: Record<string, Card>, n: number): string[] {
  const byCountry: Record<string, { miss: number; total: number }> = {};
  for (const c of Object.values(cards)) {
    if (c.totalAttempts === 0) continue;
    const e = byCountry[c.countryCode] ?? { miss: 0, total: 0 };
    e.miss += c.totalAttempts - c.correctAttempts;
    e.total += c.totalAttempts;
    byCountry[c.countryCode] = e;
  }
  return Object.entries(byCountry)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => b[1].miss / b[1].total - a[1].miss / a[1].total)
    .slice(0, n)
    .map(([code]) => code);
}
