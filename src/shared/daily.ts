export type Difficulty = 'easy' | 'medium' | 'hard';

export type DailyChallengeConfig = {
  date: string;
  dayNumber: number;
  difficulty: Difficulty;
  minDelayMs: number;
  maxDelayMs: number;
};

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; minDelayMs: number; maxDelayMs: number }
> = {
  easy: { label: 'Easy', minDelayMs: 2000, maxDelayMs: 5000 },
  medium: { label: 'Medium', minDelayMs: 1500, maxDelayMs: 4500 },
  hard: { label: 'Hard', minDelayMs: 800, maxDelayMs: 3000 },
};

const WEEKLY_DIFFICULTY_PATTERN: Difficulty[] = [
  'easy',
  'medium',
  'medium',
  'hard',
  'medium',
  'easy',
  'hard',
];

const LAUNCH_DATE = '2025-01-01';

export const getDateString = (date: Date = new Date()): string =>
  date.toISOString().slice(0, 10);

export const getDayNumber = (date: Date = new Date()): number => {
  const launch = new Date(`${LAUNCH_DATE}T00:00:00Z`);
  const diff = date.getTime() - launch.getTime();
  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
};

export const getDifficultyForDate = (date: Date = new Date()): Difficulty => {
  const dayOfWeek = date.getUTCDay();
  const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return WEEKLY_DIFFICULTY_PATTERN[index] ?? 'medium';
};

export const generateDailyChallenge = (date: Date = new Date()): DailyChallengeConfig => {
  const dateString = getDateString(date);
  const difficulty = getDifficultyForDate(date);
  const config = DIFFICULTY_CONFIG[difficulty];

  return {
    date: dateString,
    dayNumber: getDayNumber(date),
    difficulty,
    minDelayMs: config.minDelayMs,
    maxDelayMs: config.maxDelayMs,
  };
};

export const getTimeUntilExpiry = (
  date: Date = new Date()
): { hours: number; minutes: number; totalMs: number } => {
  const midnight = new Date(date);
  midnight.setUTCHours(24, 0, 0, 0);
  const diff = midnight.getTime() - date.getTime();
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    totalMs: diff,
  };
};

export const isChallengeExpired = (challengeDate: string, now: Date = new Date()): boolean =>
  challengeDate !== getDateString(now);

export const generateShareText = (params: {
  dayNumber: number;
  averageMs: number;
  ratingLabel: string;
  streak: number;
  isNewPB: boolean;
}): string => {
  const pbLine = params.isNewPB ? '🏆 New personal best!\n' : '';
  const streakLine = params.streak >= 2 ? `🔥 ${params.streak}-day streak\n` : '';
  return (
    `⚡ Instant Tap — Daily Challenge #${params.dayNumber}\n` +
    `${params.ratingLabel} · ${params.averageMs}ms avg\n` +
    pbLine +
    streakLine +
    `\nCan you beat my time?`
  );
};
