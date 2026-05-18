import type { Country } from '../state/types';
import { STATIC_COUNTRIES } from './countries';

const API_URL =
  'https://restcountries.com/v3.1/independent?status=true&fields=name,capital,cca2,flags,region,subregion';

type RawCountry = {
  name?: { common?: string };
  capital?: string[];
  cca2?: string;
  flags?: { svg?: string };
  region?: string;
  subregion?: string;
};

const ALLOWED = new Set(STATIC_COUNTRIES.map((c) => c.code));

export async function fetchCountriesFresh(): Promise<Country[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(API_URL, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: RawCountry[] = await res.json();

    const remote: Country[] = [];
    for (const r of raw) {
      const code = r.cca2;
      if (!code || !ALLOWED.has(code)) continue;
      const name = r.name?.common;
      const capital = r.capital?.[0];
      const flag = r.flags?.svg;
      const region = r.region;
      const subregion = r.subregion;
      if (!name || !capital || !flag || !region || !subregion) continue;
      remote.push({ code, name, capital, flagSvgUrl: flag, region, subregion });
    }

    if (remote.length < 150) {
      return STATIC_COUNTRIES;
    }

    const byCode = new Map(remote.map((c) => [c.code, c]));
    return STATIC_COUNTRIES.map((local) => byCode.get(local.code) ?? local);
  } catch {
    return STATIC_COUNTRIES;
  }
}
