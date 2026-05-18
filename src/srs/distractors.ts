import type { Card, Country, CountryCode, PromptType } from '../state/types';
import { promptAsks } from '../state/types';
import { similarFlags } from '../data/distractors';
import { pickOne, sample, shuffle } from '../utils/shuffle';

export type AnswerOption = {
  countryCode: CountryCode;
  isAnswer: boolean;
};

const N_DISTRACTORS = 3;

/**
 * Choose 3 distractor country codes per PRD §5.4.
 *  - country / capital prompts: same subregion → region fallback
 *  - flag prompts: similarity table → same region fallback
 *  - prefer countries the user has "encountered" (any attempts).
 */
export function chooseDistractors(
  answerCountry: Country,
  promptType: PromptType,
  countries: Country[],
  cards: Record<string, Card>,
  rng: () => number = Math.random,
): CountryCode[] {
  const asks = promptAsks(promptType);
  const pool = countries.filter((c) => c.code !== answerCountry.code);

  let candidates: Country[];
  if (asks === 'flag') {
    const simCodes = similarFlags(answerCountry.code);
    const sim = pool.filter((c) => simCodes.includes(c.code));
    if (sim.length >= N_DISTRACTORS) {
      return sample(sim, N_DISTRACTORS, rng).map((c) => c.code);
    }
    const regionPool = pool.filter((c) => c.region === answerCountry.region);
    candidates = mergeUnique(sim, regionPool);
  } else {
    candidates = pool.filter((c) => c.subregion === answerCountry.subregion);
    if (candidates.length < N_DISTRACTORS) {
      const regionPool = pool.filter((c) => c.region === answerCountry.region);
      candidates = mergeUnique(candidates, regionPool);
    }
  }

  if (candidates.length < N_DISTRACTORS) {
    candidates = mergeUnique(candidates, pool);
  }

  const encountered = candidates.filter((c) => {
    return Object.values(cards).some(
      (k) => k.countryCode === c.code && k.totalAttempts > 0,
    );
  });

  const picks: CountryCode[] = [];
  const encounteredShuffled = shuffle(encountered, rng);
  for (const c of encounteredShuffled) {
    if (picks.length >= N_DISTRACTORS) break;
    picks.push(c.code);
  }

  const remainingCandidates = candidates.filter(
    (c) => !picks.includes(c.code),
  );
  for (const c of shuffle(remainingCandidates, rng)) {
    if (picks.length >= N_DISTRACTORS) break;
    picks.push(c.code);
  }

  while (picks.length < N_DISTRACTORS) {
    const fallback = pickOne(pool.filter((p) => !picks.includes(p.code)), rng);
    if (!fallback) break;
    picks.push(fallback.code);
  }

  return picks;
}

export function buildOptions(
  answerCode: CountryCode,
  distractorCodes: CountryCode[],
  rng: () => number = Math.random,
): AnswerOption[] {
  const all: AnswerOption[] = [
    { countryCode: answerCode, isAnswer: true },
    ...distractorCodes.map((code) => ({ countryCode: code, isAnswer: false })),
  ];
  return shuffle(all, rng);
}

function mergeUnique<T extends { code: string }>(a: T[], b: T[]): T[] {
  const seen = new Set(a.map((x) => x.code));
  const out = [...a];
  for (const x of b) {
    if (!seen.has(x.code)) {
      out.push(x);
      seen.add(x.code);
    }
  }
  return out;
}
