import type { CountryCode } from '../state/types';

const SIMILARITY_GROUPS: CountryCode[][] = [
  ['TD', 'RO', 'AD', 'MD'],
  ['MC', 'ID', 'PL'],
  ['NL', 'LU', 'RU'],
  ['NE', 'IN', 'IE'],
  ['SN', 'ML', 'GN', 'CM'],
  ['CO', 'EC', 'VE'],
  ['CR', 'TH'],
  ['AU', 'NZ'],
  ['SI', 'SK', 'RU'],
  ['NO', 'IS', 'DK', 'FI', 'SE'],
  ['SV', 'NI', 'AR'],
  ['AE', 'SD', 'EG', 'SY', 'YE'],
  ['EE', 'LV', 'LT'],
  ['ML', 'SN', 'CM', 'CI'],
  ['BE', 'DE'],
  ['HR', 'SK', 'SI'],
  ['HU', 'BG', 'IR'],
  ['ES', 'PT'],
  ['MA', 'AL', 'TR'],
  ['GT', 'HN', 'NI'],
];

const SIMILARITY_MAP: Record<CountryCode, Set<CountryCode>> = {};

for (const group of SIMILARITY_GROUPS) {
  for (const code of group) {
    if (!SIMILARITY_MAP[code]) {
      SIMILARITY_MAP[code] = new Set();
    }
    for (const other of group) {
      if (other !== code) {
        SIMILARITY_MAP[code].add(other);
      }
    }
  }
}

export const similarFlags = (code: CountryCode): CountryCode[] => {
  const set = SIMILARITY_MAP[code];
  return set ? Array.from(set) : [];
};
