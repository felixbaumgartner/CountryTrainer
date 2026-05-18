import { useState } from 'react';
import { StoreProvider, useStore } from './state/store';
import { HomeScreen } from './features/home/HomeScreen';
import { SessionScreen } from './features/session/SessionScreen';
import { DoneScreen } from './features/done/DoneScreen';
import { OnboardingModal } from './features/onboarding/OnboardingModal';
import type { View } from './state/types';
import type { SessionLog } from './state/types';

function Shell() {
  const { state } = useStore();
  const [view, setView] = useState<View>('home');
  const [lastSession, setLastSession] = useState<SessionLog | null>(null);
  const [focusOnWeakest, setFocusOnWeakest] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-10 pt-6 sm:px-8">
      <header className="mb-8 flex items-center justify-between">
        <button
          onClick={() => setView('home')}
          className="group flex items-center gap-2 text-left focus:outline-none"
          aria-label="Country Trainer home"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-lg shadow-lg shadow-sky-500/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-950" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3a14 14 0 0 1 0 18" />
              <path d="M12 3a14 14 0 0 0 0 18" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-slate-100">Country Trainer</div>
            <div className="text-xs text-slate-400">195 countries, spaced repetition</div>
          </div>
        </button>
      </header>

      <main className="flex-1">
        {view === 'home' && (
          <HomeScreen
            onStart={() => {
              setFocusOnWeakest(false);
              setView('session');
            }}
          />
        )}
        {view === 'session' && (
          <SessionScreen
            focusOnWeakest={focusOnWeakest}
            onFinish={(log) => {
              setLastSession(log);
              setView('done');
            }}
            onAbort={() => setView('home')}
          />
        )}
        {view === 'done' && lastSession && (
          <DoneScreen
            log={lastSession}
            onHome={() => setView('home')}
            onFocusWeak={() => {
              setFocusOnWeakest(true);
              setView('session');
            }}
          />
        )}
      </main>

      {!state.onboardingComplete && <OnboardingModal />}

      <footer className="mt-12 pt-4 text-center text-xs text-slate-500">
        Local-first. All progress saved in your browser.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
