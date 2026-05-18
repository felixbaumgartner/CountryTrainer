import type { Card, SessionLog } from '../state/types';
import { backlogSize } from './scheduler';

/**
 * Adaptive new-cards-per-day per PRD §5.3 and Appendix C:
 *
 *   if backlog > 50: return 0 (until backlog falls under 30 — caller persists 0)
 *   recent = last 3 sessions
 *   if avg new-card accuracy > 0.85: N = min(N + 3, 15)
 *   if avg new-card accuracy < 0.60: N = max(N - 2, 3)
 *   else unchanged
 *
 * Returns the next N. Doesn't mutate state.
 */
export function recomputeNewCardsPerDay(
  currentN: number,
  sessions: SessionLog[],
  cards: Record<string, Card>,
  now: Date = new Date(),
): number {
  const backlog = backlogSize(cards, now);
  if (backlog > 50) return 0;
  if (currentN === 0 && backlog >= 30) return 0;

  const recent = sessions.slice(-3).filter((s) => s.newCardsIntroduced > 0);
  if (recent.length === 0) return currentN;

  const avgAcc =
    recent.reduce((sum, s) => sum + s.newCardAccuracy, 0) / recent.length;

  if (avgAcc > 0.85) return Math.min(currentN + 3, 15);
  if (avgAcc < 0.6) return Math.max(currentN - 2, 3);
  return currentN;
}
