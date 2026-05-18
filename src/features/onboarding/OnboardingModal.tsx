import { useState } from 'react';
import { useStore } from '../../state/store';

const SLIDES = [
  {
    title: 'Spaced repetition, built in',
    body: "This app uses spaced repetition. You'll see each country just often enough to remember it.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 4v5h-5" />
      </svg>
    ),
  },
  {
    title: 'Start small. It adjusts.',
    body: 'Five new countries per day to start. The app adjusts the pace based on how well you remember them.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h4l3-9 4 18 3-9h4" />
      </svg>
    ),
  },
  {
    title: 'Ready when you are',
    body: 'No accounts, no setup. Everything saves locally in your browser.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

export function OnboardingModal() {
  const { dispatch } = useStore();
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-5 backdrop-blur-sm"
    >
      <div className="card w-full max-w-md p-7 shadow-2xl">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400/20 to-violet-500/20 text-sky-300">
          {slide.icon}
        </div>
        <h2
          id="onboarding-title"
          className="mb-2 text-2xl font-semibold tracking-tight text-slate-50"
        >
          {slide.title}
        </h2>
        <p className="mb-7 text-slate-400">{slide.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-sky-400' : 'w-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn-ghost text-sm">
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={() => dispatch({ type: 'COMPLETE_ONBOARDING' })}
                className="btn-primary"
                autoFocus
              >
                Let's go
              </button>
            ) : (
              <button onClick={() => setStep(step + 1)} className="btn-primary" autoFocus>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
