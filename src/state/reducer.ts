import type { AppState, Card, Country, SessionLog } from './types';
import { ALL_PROMPT_TYPES, cardKey } from './types';
import { createCard, applyAnswer } from '../srs/leitner';
import { todayDateString, todayISO } from '../utils/dates';

export type Action =
  | { type: 'INIT'; countries: Country[]; now?: Date }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'ANSWER_CARD'; key: string; correct: boolean; now?: Date }
  | { type: 'INTRODUCE_CARD'; key: string }
  | { type: 'RECORD_SESSION'; log: SessionLog }
  | { type: 'SET_NEW_CARDS_PER_DAY'; n: number }
  | { type: 'COUNTRIES_REFRESHED'; countries: Country[] }
  | { type: 'RESET' };

export function makeInitialState(now: Date = new Date()): AppState {
  return {
    countries: [],
    cards: {},
    sessions: [],
    newCardsPerDay: 5,
    createdAt: todayISO(now),
    lastSessionDate: null,
    onboardingComplete: false,
  };
}

export function initializeCards(
  countries: Country[],
  now: Date = new Date(),
): Record<string, Card> {
  const out: Record<string, Card> = {};
  for (const country of countries) {
    for (const pt of ALL_PROMPT_TYPES) {
      const key = cardKey(country.code, pt);
      out[key] = createCard(country.code, pt, now);
    }
  }
  return out;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT': {
      const now = action.now ?? new Date();
      const cards =
        Object.keys(state.cards).length > 0
          ? state.cards
          : initializeCards(action.countries, now);
      return {
        ...state,
        countries: action.countries,
        cards,
      };
    }

    case 'COUNTRIES_REFRESHED': {
      // Merge fresher metadata in without disturbing card progress.
      return { ...state, countries: action.countries };
    }

    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true };

    case 'INTRODUCE_CARD': {
      const card = state.cards[action.key];
      if (!card || card.introduced) return state;
      return {
        ...state,
        cards: { ...state.cards, [action.key]: { ...card, introduced: true } },
      };
    }

    case 'ANSWER_CARD': {
      const card = state.cards[action.key];
      if (!card) return state;
      const updated = applyAnswer(card, action.correct, action.now);
      return {
        ...state,
        cards: { ...state.cards, [action.key]: updated },
      };
    }

    case 'RECORD_SESSION': {
      const date = action.log.date;
      const filtered = state.sessions.filter((s) => s.date !== date);
      const merged: SessionLog = (() => {
        const same = state.sessions.find((s) => s.date === date);
        if (!same) return action.log;
        const totalCards = same.cardsReviewed + action.log.cardsReviewed;
        const totalCorrect = same.correctCount + action.log.correctCount;
        const totalNew = same.newCardsIntroduced + action.log.newCardsIntroduced;
        const totalNewCorrect =
          same.newCardAccuracy * same.newCardsIntroduced +
          action.log.newCardAccuracy * action.log.newCardsIntroduced;
        return {
          date,
          cardsReviewed: totalCards,
          correctCount: totalCorrect,
          durationMs: same.durationMs + action.log.durationMs,
          newCardsIntroduced: totalNew,
          newCardAccuracy: totalNew > 0 ? totalNewCorrect / totalNew : 0,
        };
      })();
      const next = [...filtered, merged].slice(-90);
      return { ...state, sessions: next, lastSessionDate: date };
    }

    case 'SET_NEW_CARDS_PER_DAY':
      return { ...state, newCardsPerDay: action.n };

    case 'RESET':
      return makeInitialState();

    default:
      return state;
  }
}

export const computeStreak = (
  sessions: SessionLog[],
  now: Date = new Date(),
): number => {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const cursor = new Date(now);
  while (true) {
    const key = todayDateString(cursor);
    if (!dates.has(key)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
};
