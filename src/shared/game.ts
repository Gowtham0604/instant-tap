export const TOTAL_ROUNDS = 5;
export const MIN_DELAY_MS = 1500;
export const MAX_DELAY_MS = 4500;
export const CHEAT_THRESHOLD_MS = 100;

export type LeaderboardEntry = {
  name: string;
  avg: number;
  isYou?: boolean;
};

export type Rating = {
  label: string;
  color: string;
};

export function getRating(ms: number): Rating {
  if (ms < 180) return { label: 'Superhuman', color: '#7F77DD' };
  if (ms < 220) return { label: 'Pro gamer', color: '#1D9E75' };
  if (ms < 260) return { label: 'Fast', color: '#3B8BD4' };
  if (ms < 320) return { label: 'Average', color: '#BA7517' };
  return { label: 'Slow poke', color: '#D85A30' };
}

export function averageMs(times: number[]): number {
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}
