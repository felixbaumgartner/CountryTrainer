export type CountryCode = string;

export type Country = {
  code: CountryCode;
  name: string;
  capital: string;
  flagSvgUrl: string;
  region: string;
  subregion: string;
};

export type PromptType =
  | 'flag_to_country'
  | 'flag_to_capital'
  | 'country_to_flag'
  | 'country_to_capital'
  | 'capital_to_country'
  | 'capital_to_flag';

export const ALL_PROMPT_TYPES: PromptType[] = [
  'flag_to_country',
  'flag_to_capital',
  'country_to_flag',
  'country_to_capital',
  'capital_to_country',
  'capital_to_flag',
];

export type Box = 1 | 2 | 3 | 4 | 5 | 'mastered';

export type Card = {
  countryCode: CountryCode;
  promptType: PromptType;
  box: Box;
  nextReview: string;
  lastReview: string | null;
  totalAttempts: number;
  correctAttempts: number;
  consecutiveCorrect: number;
  introduced: boolean;
};

export type SessionLog = {
  date: string;
  cardsReviewed: number;
  correctCount: number;
  durationMs: number;
  newCardsIntroduced: number;
  newCardAccuracy: number;
};

export type AppState = {
  countries: Country[];
  cards: Record<string, Card>;
  sessions: SessionLog[];
  newCardsPerDay: number;
  createdAt: string;
  lastSessionDate: string | null;
  onboardingComplete: boolean;
};

export type View = 'home' | 'session' | 'done';

export const cardKey = (code: CountryCode, prompt: PromptType): string =>
  `${code}:${prompt}`;

export type AnswerKind = 'country' | 'capital' | 'flag';

export const promptShows = (p: PromptType): AnswerKind =>
  p.startsWith('flag')
    ? 'flag'
    : p.startsWith('country')
      ? 'country'
      : 'capital';

export const promptAsks = (p: PromptType): AnswerKind => {
  switch (p) {
    case 'flag_to_country':
    case 'capital_to_country':
      return 'country';
    case 'flag_to_capital':
    case 'country_to_capital':
      return 'capital';
    case 'country_to_flag':
    case 'capital_to_flag':
      return 'flag';
  }
};
