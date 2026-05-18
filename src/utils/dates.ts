const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const todayISO = (now: Date = new Date()): string =>
  startOfDay(now).toISOString();

export const todayDateString = (now: Date = new Date()): string => {
  const d = startOfDay(now);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export const startOfDay = (d: Date): Date => {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
};

export const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};

export const isOnOrBefore = (a: string, b: string): boolean =>
  new Date(a).getTime() <= new Date(b).getTime();

export const daysBetween = (later: string, earlier: string): number =>
  Math.floor(
    (new Date(later).getTime() - new Date(earlier).getTime()) / MS_PER_DAY,
  );

export const formatNextReview = (iso: string, now: Date = new Date()): string => {
  const t = new Date(iso).getTime() - now.getTime();
  if (t <= 0) return 'now';
  const hours = Math.round(t / (60 * 60 * 1000));
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days}d`;
};

const pad = (n: number): string => String(n).padStart(2, '0');
