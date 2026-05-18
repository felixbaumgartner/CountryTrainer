import type { Box, Card, CountryCode, PromptType } from '../state/types';
import { addDaysISO, todayISO } from '../utils/dates';

const INTERVAL_DAYS: Record<Exclude<Box, 'mastered'>, number> = {
  1: 0,
  2: 1,
  3: 3,
  4: 7,
  5: 14,
};

export const intervalFor = (box: Exclude<Box, 'mastered'>): number =>
  INTERVAL_DAYS[box];

export const createCard = (
  countryCode: CountryCode,
  promptType: PromptType,
  now: Date = new Date(),
): Card => ({
  countryCode,
  promptType,
  box: 1,
  nextReview: todayISO(now),
  lastReview: null,
  totalAttempts: 0,
  correctAttempts: 0,
  consecutiveCorrect: 0,
  introduced: false,
});

/**
 * Pure Leitner promotion/demotion. Returns a NEW card; never mutates input.
 *
 * Rules from PRD §5.2:
 *  - Correct: promote one box. Box 5 + 3 consecutive correct ⇒ Mastered.
 *  - Mastered + correct: nextReview = +30d (or +90d after 3+ consecutive).
 *  - Wrong: demote to Box 1 immediately, consecutiveCorrect = 0.
 *  - Box 1 review re-queues in same session (nextReview = now).
 */
export function applyAnswer(card: Card, correct: boolean, now: Date = new Date()): Card {
  const todayIso = todayISO(now);
  const next: Card = {
    ...card,
    totalAttempts: card.totalAttempts + 1,
    lastReview: todayIso,
  };

  if (correct) {
    next.correctAttempts = card.correctAttempts + 1;
    next.consecutiveCorrect = card.consecutiveCorrect + 1;

    if (card.box === 'mastered') {
      const interval = next.consecutiveCorrect > 2 ? 90 : 30;
      next.nextReview = addDaysISO(todayIso, interval);
    } else if (card.box === 5 && next.consecutiveCorrect >= 3) {
      next.box = 'mastered';
      next.nextReview = addDaysISO(todayIso, 30);
    } else {
      const newBox = Math.min(card.box + 1, 5) as Exclude<Box, 'mastered'>;
      next.box = newBox;
      next.nextReview = addDaysISO(todayIso, intervalFor(newBox));
    }
  } else {
    next.consecutiveCorrect = 0;
    next.box = 1;
    next.nextReview = todayIso;
  }

  return next;
}

export const isMastered = (card: Card): boolean => card.box === 'mastered';

export const isDue = (card: Card, now: Date = new Date()): boolean =>
  card.introduced && new Date(card.nextReview).getTime() <= now.getTime();
