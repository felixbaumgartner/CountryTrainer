import { describe, it, expect } from 'vitest';
import { recomputeNewCardsPerDay } from '../srs/adaptive';
import { createCard } from '../srs/leitner';
import type { Card, SessionLog } from '../state/types';
import { cardKey } from '../state/types';
import { addDaysISO, todayISO } from '../utils/dates';

const NOW = new Date('2026-05-18T10:00:00Z');

const mkSession = (date: string, acc: number, introduced = 5): SessionLog => ({
  date,
  cardsReviewed: 20,
  correctCount: Math.round(20 * acc),
  durationMs: 5 * 60_000,
  newCardsIntroduced: introduced,
  newCardAccuracy: acc,
});

describe('adaptive.recomputeNewCardsPerDay', () => {
  it('keeps N unchanged with no session history', () => {
    expect(recomputeNewCardsPerDay(5, [], {}, NOW)).toBe(5);
  });

  it('increases N by 3 when last 3 sessions average > 0.85', () => {
    const sessions = [mkSession('d1', 0.9), mkSession('d2', 0.88), mkSession('d3', 0.95)];
    expect(recomputeNewCardsPerDay(5, sessions, {}, NOW)).toBe(8);
  });

  it('caps N at 15 on the high end', () => {
    const sessions = [mkSession('d1', 0.9), mkSession('d2', 0.9), mkSession('d3', 0.9)];
    expect(recomputeNewCardsPerDay(14, sessions, {}, NOW)).toBe(15);
  });

  it('decreases N by 2 when avg < 0.60', () => {
    const sessions = [mkSession('d1', 0.5), mkSession('d2', 0.4), mkSession('d3', 0.55)];
    expect(recomputeNewCardsPerDay(7, sessions, {}, NOW)).toBe(5);
  });

  it('floors N at 3 on the low end', () => {
    const sessions = [mkSession('d1', 0.3), mkSession('d2', 0.3), mkSession('d3', 0.3)];
    expect(recomputeNewCardsPerDay(4, sessions, {}, NOW)).toBe(3);
  });

  it('returns 0 when backlog > 50', () => {
    const cards: Record<string, Card> = {};
    for (let i = 0; i < 60; i++) {
      const code = `X${i}`;
      const c = createCard(code, 'flag_to_country', NOW);
      cards[cardKey(code, 'flag_to_country')] = {
        ...c,
        introduced: true,
        nextReview: addDaysISO(todayISO(NOW), -3),
      };
    }
    expect(recomputeNewCardsPerDay(5, [], cards, NOW)).toBe(0);
  });

  it('ignores sessions with no new cards introduced', () => {
    const sessions = [
      mkSession('d1', 0.9, 0),
      mkSession('d2', 0.9, 0),
      mkSession('d3', 0.9, 0),
    ];
    expect(recomputeNewCardsPerDay(5, sessions, {}, NOW)).toBe(5);
  });
});
