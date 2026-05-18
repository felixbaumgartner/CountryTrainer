import type { AppState } from './types';

const STORAGE_KEY = 'country_trainer_v1';
const DEBOUNCE_MS = 200;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

export function saveStateDebounced(state: AppState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage may be full or unavailable — silently degrade.
    }
  }, DEBOUNCE_MS);
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
