import type { Card, CountryCode, PromptType } from '../state/types';
import { isDue } from './leitner';
import { shuffle } from '../utils/shuffle';

export type QueueItem = {
  card: Card;
  isNew: boolean;
};

/**
 * Build the daily queue per PRD §5.3.
 *
 *   queue = all cards where nextReview <= today AND introduced == true
 *   newCards = first N unintroduced (callers mark them introduced when surfaced)
 *   session = interleave(queue, newCards) with constraints:
 *     - no two prompts about the same country in immediate succession
 *     - max 2 in a row of the same prompt type
 *     - failed cards re-enter after >= 4 other cards
 */
export function buildSession(
  cards: Record<string, Card>,
  newCardsPerDay: number,
  now: Date = new Date(),
  rng: () => number = Math.random,
): QueueItem[] {
  const allCards = Object.values(cards);

  const dueReviews = allCards.filter((c) => isDue(c, now));
  const newPool = allCards.filter((c) => !c.introduced);

  const shuffledNew = shuffle(newPool, rng).slice(0, newCardsPerDay);

  const items: QueueItem[] = [
    ...dueReviews.map((card) => ({ card, isNew: false })),
    ...shuffledNew.map((card) => ({ card, isNew: true })),
  ];

  return interleave(shuffle(items, rng));
}

/**
 * Greedy interleaver. At each step, pick a candidate that doesn't violate
 * adjacency rules. Falls back to least-bad if no clean candidate exists
 * (better to surface a card than to get stuck).
 */
export function interleave(items: QueueItem[]): QueueItem[] {
  const remaining = [...items];
  const out: QueueItem[] = [];
  let lastCountry: CountryCode | null = null;
  let lastPrompt: PromptType | null = null;
  let samePromptRun = 0;

  while (remaining.length) {
    let pickIdx = remaining.findIndex(
      ({ card }) =>
        card.countryCode !== lastCountry &&
        !(card.promptType === lastPrompt && samePromptRun >= 2),
    );

    if (pickIdx === -1) {
      pickIdx = remaining.findIndex(({ card }) => card.countryCode !== lastCountry);
    }
    if (pickIdx === -1) pickIdx = 0;

    const [picked] = remaining.splice(pickIdx, 1);
    out.push(picked);

    if (picked.card.promptType === lastPrompt) samePromptRun++;
    else samePromptRun = 1;
    lastCountry = picked.card.countryCode;
    lastPrompt = picked.card.promptType;
  }

  return out;
}

/**
 * Re-queue a failed card. Per PRD §5.3, it must come back only after
 * at least 4 other cards have been shown.
 */
export function requeueFailed(
  queue: QueueItem[],
  failed: QueueItem,
  minCooldown = 4,
): QueueItem[] {
  const insertAt = Math.min(queue.length, minCooldown);
  return [...queue.slice(0, insertAt), failed, ...queue.slice(insertAt)];
}

export const backlogSize = (
  cards: Record<string, Card>,
  now: Date = new Date(),
): number => {
  const today = now.getTime();
  let count = 0;
  for (const c of Object.values(cards)) {
    if (!c.introduced) continue;
    const next = new Date(c.nextReview).getTime();
    if (next < today - 24 * 60 * 60 * 1000) count++;
  }
  return count;
};
