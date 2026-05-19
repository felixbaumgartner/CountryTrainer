import { useEffect, useMemo, useRef, useState } from 'react';
import type { Country, PromptType } from '../../state/types';
import { promptAsks, promptShows } from '../../state/types';
import type { AnswerOption } from '../../srs/distractors';
import { countryByCode } from '../../data/countries';

type Props = {
  country: Country;
  promptType: PromptType;
  options: AnswerOption[];
  allCountries: Country[];
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
};

export function Prompt({
  country,
  promptType,
  options,
  allCountries,
  onAnswer,
  onNext,
}: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const asks = promptAsks(promptType);
  const shows = promptShows(promptType);

  // Reset pick state when prompt changes
  useEffect(() => {
    setPicked(null);
  }, [country.code, promptType]);

  // Keyboard support
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Enter' && picked) {
        onNext();
        return;
      }
      if (picked) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0 && idx < options.length) {
        choose(options[idx].countryCode);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, options]);

  useEffect(() => {
    if (picked) {
      // Focus Next button so Enter advances
      setTimeout(() => nextBtn.current?.focus(), 50);
    }
  }, [picked]);

  function choose(code: string) {
    if (picked) return;
    setPicked(code);
    const correct = code === country.code;
    onAnswer(correct);
  }

  const promptLabel = useMemo(() => {
    switch (shows) {
      case 'flag':
        return asks === 'country'
          ? 'Which country has this flag?'
          : "What is this country's capital?";
      case 'country':
        return asks === 'capital'
          ? "What is this country's capital?"
          : "What is this country's flag?";
      case 'capital':
        return asks === 'country'
          ? 'Which country has this capital?'
          : 'Which flag belongs to this capital?';
    }
  }, [shows, asks]);

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div className="text-center">
        <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">
          {promptLabel}
        </p>
        <PromptDisplay country={country} kind={shows} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt, idx) => {
          const c = countryByCode(allCountries, opt.countryCode);
          if (!c) return null;
          return (
            <AnswerButton
              key={opt.countryCode}
              country={c}
              showAs={asks}
              keyHint={idx + 1}
              picked={picked}
              correctCode={country.code}
              onClick={() => choose(opt.countryCode)}
            />
          );
        })}
      </div>

      <div className="flex justify-center pt-1">
        <button
          ref={nextBtn}
          onClick={onNext}
          disabled={!picked}
          className="btn-primary"
        >
          Next
          <kbd className="ml-2 hidden rounded bg-slate-950/30 px-1.5 py-0.5 font-mono text-xs sm:inline">
            ↵
          </kbd>
        </button>
      </div>
    </div>
  );
}

function PromptDisplay({ country, kind }: { country: Country; kind: 'flag' | 'country' | 'capital' }) {
  if (kind === 'flag') {
    return (
      <div className="mx-auto mt-2 flex w-full justify-center">
        <img
          src={country.flagSvgUrl}
          alt=""
          className="block max-h-[200px] w-auto min-w-[240px] max-w-[360px] rounded-lg border border-slate-800 shadow-2xl shadow-slate-950/50"
          loading="eager"
          draggable={false}
        />
      </div>
    );
  }
  if (kind === 'country') {
    return (
      <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
        {country.name}
      </h2>
    );
  }
  return (
    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
      {country.capital}
    </h2>
  );
}

function AnswerButton({
  country,
  showAs,
  keyHint,
  picked,
  correctCode,
  onClick,
}: {
  country: Country;
  showAs: 'flag' | 'country' | 'capital';
  keyHint: number;
  picked: string | null;
  correctCode: string;
  onClick: () => void;
}) {
  const isPicked = picked === country.code;
  const isCorrect = country.code === correctCode;
  const reveal = !!picked;
  let stateClass = '';
  if (reveal) {
    if (isPicked && isCorrect) stateClass = 'answer-btn-correct';
    else if (isPicked && !isCorrect) stateClass = 'answer-btn-wrong';
    else if (!isPicked && isCorrect) stateClass = 'answer-btn-reveal';
    else stateClass = 'opacity-50';
  }

  const label =
    showAs === 'flag' ? (
      <img
        src={country.flagSvgUrl}
        alt={country.name}
        className="h-14 w-auto rounded-sm border border-slate-700"
        loading="lazy"
        draggable={false}
      />
    ) : showAs === 'country' ? (
      <span>{country.name}</span>
    ) : (
      <span>{country.capital}</span>
    );

  return (
    <button
      onClick={onClick}
      disabled={!!picked}
      className={`answer-btn ${stateClass} min-h-[64px] gap-3`}
    >
      <span className="absolute left-3 top-2 text-xs font-mono text-slate-500">
        {keyHint}
      </span>
      <span className="flex items-center justify-center gap-3 text-center text-base sm:text-lg">
        {label}
      </span>
    </button>
  );
}
