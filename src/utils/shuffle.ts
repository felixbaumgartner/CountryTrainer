export function shuffle<T>(input: T[], rng: () => number = Math.random): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sample<T>(input: T[], n: number, rng: () => number = Math.random): T[] {
  return shuffle(input, rng).slice(0, n);
}

export function pickOne<T>(input: T[], rng: () => number = Math.random): T | undefined {
  if (input.length === 0) return undefined;
  return input[Math.floor(rng() * input.length)];
}
