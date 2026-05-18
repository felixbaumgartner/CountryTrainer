import { describe, it, expect } from 'vitest';
import { applyAnswer, createCard, intervalFor } from '../srs/leitner';
import type { Card } from '../state/types';
import { daysBetween, todayISO } from '../utils/dates';

const NOW = new Date('2026-05-18T10:00:00Z');
const TODAY = todayISO(NOW);

describe('leitner', () => {
  describe('createCard', () => {
    it('starts in box 1, not introduced, due today', () => {
      const c = createCard('FR', 'flag_to_country', NOW);
      expect(c.box).toBe(1);
      expect(c.introduced).toBe(false);
      expect(c.totalAttempts).toBe(0);
      expect(c.consecutiveCorrect).toBe(0);
    });
  });

  describe('promotion on correct', () => {
    it('Box 1 → Box 2 with +1d interval', () => {
      const c = createCard('FR', 'flag_to_country', NOW);
      const result = applyAnswer(c, true, NOW);
      expect(result.box).toBe(2);
      expect(result.consecutiveCorrect).toBe(1);
      expect(daysBetween(result.nextReview, TODAY)).toBe(intervalFor(2));
    });

    it('Box 2 → Box 3 with +3d interval', () => {
      const c = { ...createCard('FR', 'flag_to_country', NOW), box: 2 as const };
      const result = applyAnswer(c, true, NOW);
      expect(result.box).toBe(3);
      expect(daysBetween(result.nextReview, TODAY)).toBe(3);
    });

    it('Box 3 → Box 4 with +7d interval', () => {
      const c = { ...createCard('FR', 'flag_to_country', NOW), box: 3 as const };
      const result = applyAnswer(c, true, NOW);
      expect(result.box).toBe(4);
      expect(daysBetween(result.nextReview, TODAY)).toBe(7);
    });

    it('Box 4 → Box 5 with +14d interval', () => {
      const c = { ...createCard('FR', 'flag_to_country', NOW), box: 4 as const };
      const result = applyAnswer(c, true, NOW);
      expect(result.box).toBe(5);
      expect(daysBetween(result.nextReview, TODAY)).toBe(14);
    });

    it('Box 5 does NOT graduate until 3 consecutive correct', () => {
      let c: Card = {
        ...createCard('FR', 'flag_to_country', NOW),
        box: 5,
        consecutiveCorrect: 1,
      };
      c = applyAnswer(c, true, NOW);
      expect(c.box).toBe(5);
      expect(c.consecutiveCorrect).toBe(2);
      c = applyAnswer(c, true, NOW);
      expect(c.box).toBe('mastered');
      expect(c.consecutiveCorrect).toBe(3);
      expect(daysBetween(c.nextReview, TODAY)).toBe(30);
    });

    it('Mastered trajectory: graduation = +30, subsequent correct = +90', () => {
      let c: Card = {
        ...createCard('FR', 'flag_to_country', NOW),
        box: 5,
        consecutiveCorrect: 2,
      };
      c = applyAnswer(c, true, NOW);
      expect(c.box).toBe('mastered');
      expect(daysBetween(c.nextReview, TODAY)).toBe(30);
      c = applyAnswer(c, true, NOW);
      expect(c.box).toBe('mastered');
      expect(daysBetween(c.nextReview, TODAY)).toBe(90);
    });
  });

  describe('demotion on wrong', () => {
    it('Box 3 → Box 1 instantly, consecutiveCorrect reset', () => {
      const c = {
        ...createCard('FR', 'flag_to_country', NOW),
        box: 3 as const,
        consecutiveCorrect: 2,
      };
      const result = applyAnswer(c, false, NOW);
      expect(result.box).toBe(1);
      expect(result.consecutiveCorrect).toBe(0);
    });

    it('Mastered + wrong → Box 1, consecutiveCorrect reset', () => {
      const c = {
        ...createCard('FR', 'flag_to_country', NOW),
        box: 'mastered' as const,
        consecutiveCorrect: 5,
      };
      const result = applyAnswer(c, false, NOW);
      expect(result.box).toBe(1);
      expect(result.consecutiveCorrect).toBe(0);
    });

    it('wrong answer makes card immediately due (nextReview <= now)', () => {
      const c = createCard('FR', 'flag_to_country', NOW);
      const result = applyAnswer(c, false, NOW);
      expect(new Date(result.nextReview).getTime()).toBeLessThanOrEqual(NOW.getTime());
    });
  });

  describe('immutability', () => {
    it('does not mutate the input card', () => {
      const c = createCard('FR', 'flag_to_country', NOW);
      const snapshot = JSON.stringify(c);
      applyAnswer(c, true, NOW);
      applyAnswer(c, false, NOW);
      expect(JSON.stringify(c)).toBe(snapshot);
    });
  });

  describe('attempt counters', () => {
    it('totalAttempts increments on every answer', () => {
      let c = createCard('FR', 'flag_to_country', NOW);
      c = applyAnswer(c, true, NOW);
      c = applyAnswer(c, false, NOW);
      c = applyAnswer(c, true, NOW);
      expect(c.totalAttempts).toBe(3);
      expect(c.correctAttempts).toBe(2);
    });
  });
});
