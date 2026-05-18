import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import type { AppState } from './types';
import { reducer, makeInitialState, type Action } from './reducer';
import { loadState, saveStateDebounced } from './persistence';
import { STATIC_COUNTRIES } from '../data/countries';
import { fetchCountriesFresh } from '../data/api';

type Ctx = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const loaded = loadState();
    if (loaded && loaded.countries.length > 0 && Object.keys(loaded.cards).length > 0) {
      return loaded;
    }
    const base = loaded ?? makeInitialState();
    const countries = base.countries.length > 0 ? base.countries : STATIC_COUNTRIES;
    return reducer(base, { type: 'INIT', countries });
  });

  const initial = useRef(true);
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    saveStateDebounced(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    fetchCountriesFresh().then((fresh) => {
      if (cancelled) return;
      if (fresh.length >= 150) {
        dispatch({ type: 'COUNTRIES_REFRESHED', countries: fresh });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
