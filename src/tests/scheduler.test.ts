import { describe, it, expect } from 'vitest';
import { buildSession, interleave, requeueFailed, backlogSize } from '../srs/scheduler';
import { createCard } from '../srs/leitner';
import type { Card, PromptType } from '../state/types';
import { cardKey, ALL_PROMPT_TYPES } from '../state/types';
import { addDaysISO, todayISO } from '../utils/dates';

const NOW = new Date('2026-05-18T10:00:00Z');

function seedDeck(codes: string[], now: Date = NOW): Record<string, Card> {
  const out: Record<string, Card> = {};
  for (const code of codes) {
    for (const pt of ALL_PROMPT_TYPES) {
      const card = createCard(code, pt, now);
      out[cardKey(code, pt)] = card;
    }
  }
  return out;
}

// Deterministic PRNG so test outcomes are stable.
const seededRng = (seed = 1): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

describe('scheduler.buildSession', () => {
  it('returns only new cards on first run when nothing is introduced', () => {
    const cards = seedDeck(['FR', 'DE', 'IT', 'JP', 'BR']);
    const session = buildSession(cards, 5, NOW, seededRng());
    expect(session.length).toBe(5);
    expect(session.every((s) => s.isNew)).toBe(true);
  });

  it('caps new cards at newCardsPerDay', () => {
    const cards = seedDeck(['FR', 'DE', 'IT', 'JP', 'BR', 'CN', 'IN']);
    const session = buildSession(cards, 3, NOW, seededRng());
    expect(session.filter((s) => s.isNew).length).toBe(3);
  });

  it('includes due review cards plus new cards', () => {
    const cards = seedDeck(['FR', 'DE', 'IT']);
    cards[cardKey('FR', 'flag_to_country')] = {
      ...cards[cardKey('FR', 'flag_to_country')],
      introduced: true,
      box: 2,
      nextReview: addDaysISO(todayISO(NOW), -1),
    };
    const session = buildSession(cards, 2, NOW, seededRng());
    expect(session.some((s) => !s.isNew)).toBe(true);
    expect(session.filter((s) => s.isNew).length).toBe(2);
  });

  it('does NOT include future-due introduced cards', () => {
    const cards = seedDeck(['FR']);
    cards[cardKey('FR', 'flag_to_country')] = {
      ...cards[cardKey('FR', 'flag_to_country')],
      introduced: true,
      box: 2,
      nextReview: addDaysISO(todayISO(NOW), 3),
    };
    const session = buildSession(cards, 0, NOW, seededRng());
    expect(session.length).toBe(0);
  });
});

describe('scheduler.interleave', () => {
  it('never places two cards of the same country in immediate succession when an alternative exists', () => {
    const cards = seedDeck(['FR', 'DE']);
    const items = Object.values(cards).map((card) => ({ card, isNew: true }));
    const out = interleave(items);
    let violations = 0;
    for (let i = 1; i < out.length; i++) {
      if (out[i].card.countryCode === out[i - 1].card.countryCode) {
        violations++;
      }
    }
    // Two countries × 6 prompts each: a perfect alternation is possible.
    expect(violations).toBe(0);
  });

  it('does not allow 3+ in a row of the same prompt type when alternatives exist', () => {
    const cards: Record<string, Card> = {};
    for (const code of ['FR', 'DE', 'IT', 'JP', 'BR', 'IN']) {
      const c = createCard(code, 'flag_to_country', NOW);
      cards[cardKey(code, 'flag_to_country')] = c;
      const c2 = createCard(code, 'country_to_capital', NOW);
      cards[cardKey(code, 'country_to_capital')] = c2;
    }
    const items = Object.values(cards).map((card) => ({ card, isNew: true }));
    const out = interleave(items);
    let maxRun = 1;
    let cur = 1;
    let prev: PromptType | null = null;
    for (const { card } of out) {
      if (card.promptType === prev) cur++;
      else cur = 1;
      maxRun = Math.max(maxRun, cur);
      prev = card.promptType;
    }
    expect(maxRun).toBeLessThanOrEqual(2);
  });
});

describe('scheduler.requeueFailed', () => {
  it('inserts the failed card 4 positions ahead when queue is long enough', () => {
    const cards = seedDeck(['FR', 'DE', 'IT', 'JP', 'BR', 'CN']);
    const items = Object.values(cards)
      .slice(0, 6)
      .map((card) => ({ card, isNew: false }));
    const failed = items[0];
    const requeued = requeueFailed(items.slice(1), failed, 4);
    expect(requeued[4]).toBe(failed);
  });

  it('clamps to end if remaining queue is shorter than cooldown', () => {
    const cards = seedDeck(['FR', 'DE']);
    const items = Object.values(cards).slice(0, 2).map((card) => ({ card, isNew: false }));
    const failed = items[0];
    const requeued = requeueFailed(items.slice(1), failed, 4);
    expect(requeued[requeued.length - 1]).toBe(failed);
  });
});

describe('scheduler.backlogSize', () => {
  it('counts cards overdue by more than 1 day', () => {
    const cards = seedDeck(['FR', 'DE']);
    cards[cardKey('FR', 'flag_to_country')] = {
      ...cards[cardKey('FR', 'flag_to_country')],
      introduced: true,
      box: 2,
      nextReview: addDaysISO(todayISO(NOW), -3),
    };
    cards[cardKey('DE', 'flag_to_country')] = {
      ...cards[cardKey('DE', 'flag_to_country')],
      introduced: true,
      box: 2,
      nextReview: addDaysISO(todayISO(NOW), -3),
    };
    expect(backlogSize(cards, NOW)).toBe(2);
  });

  it('does not count non-introduced cards', () => {
    const cards = seedDeck(['FR']);
    expect(backlogSize(cards, NOW)).toBe(0);
  });
});
