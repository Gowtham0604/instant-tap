import { redis } from '@devvit/web/server';
import {
  CHEAT_THRESHOLD_MS,
  TOTAL_ROUNDS,
  averageMs,
  type LeaderboardEntry,
} from '../../shared/game';
import { getDateString } from '../../shared/daily';
import {
  getDailyLeaderboardKey,
  trackPlayerActivity,
  upsertDailyLeaderboardScore,
} from './daily';
import { awardXp } from './progression';
import type { LevelProgress } from '../../shared/progression';

const ALLTIME_LEADERBOARD_KEY = 'leaderboard:reaction';
const LEADERBOARD_SIZE = 10;

function userKey(prefix: string, username: string): string {
  return `${prefix}:${username.toLowerCase()}`;
}

function yesterdayDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function formatUsername(username: string): string {
  return username.startsWith('u/') ? username : `u/${username}`;
}

export function validateScoreSubmission(times: number[], average: number): boolean {
  if (times.length !== TOTAL_ROUNDS) return false;
  if (!times.every((time) => time >= CHEAT_THRESHOLD_MS && time <= 5000)) return false;
  return averageMs(times) === average;
}

export async function getPersonalBest(username: string): Promise<number | null> {
  const value = await redis.get(userKey('pb', username));
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getStreak(username: string): Promise<number> {
  const value = await redis.get(userKey('streak', username));
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function updateStreak(username: string): Promise<number> {
  const streakKey = userKey('streak', username);
  const lastPlayedKey = userKey('streak:last', username);
  const today = getDateString();
  const lastPlayed = await redis.get(lastPlayedKey);

  if (lastPlayed === today) {
    const current = await getStreak(username);
    return current > 0 ? current : 1;
  }

  const current = lastPlayed === yesterdayDate() ? await getStreak(username) : 0;
  const nextStreak = current > 0 ? current + 1 : 1;

  await redis.set(streakKey, String(nextStreak));
  await redis.set(lastPlayedKey, today);

  return nextStreak;
}

async function upsertAlltimeLeaderboardScore(username: string, average: number): Promise<void> {
  const member = username.toLowerCase();
  const existing = await redis.zScore(ALLTIME_LEADERBOARD_KEY, member);

  if (existing === undefined || average < existing) {
    await redis.zAdd(ALLTIME_LEADERBOARD_KEY, { member, score: average });
  }
}

async function getLeaderboardFromKey(
  key: string,
  currentUsername: string
): Promise<LeaderboardEntry[]> {
  const entries = await redis.zRange(key, 0, LEADERBOARD_SIZE - 1, { by: 'rank' });

  return entries.map((entry) => ({
    name: formatUsername(entry.member),
    avg: Math.round(entry.score),
    isYou: entry.member === currentUsername.toLowerCase(),
  }));
}

export async function getLeaderboard(currentUsername: string): Promise<LeaderboardEntry[]> {
  return getLeaderboardFromKey(ALLTIME_LEADERBOARD_KEY, currentUsername);
}

export async function getDailyLeaderboard(
  currentUsername: string,
  date: string = getDateString()
): Promise<LeaderboardEntry[]> {
  return getLeaderboardFromKey(getDailyLeaderboardKey(date), currentUsername);
}

export type SubmitScoreResult = {
  personalBest: number;
  streak: number;
  isNewPB: boolean;
  xpEarned: number;
  progression: LevelProgress;
};

export async function submitScore(
  username: string,
  average: number,
  options: { isDailyChallenge: boolean; challengeDate?: string }
): Promise<SubmitScoreResult> {
  const previousBest = await getPersonalBest(username);
  const isNewPB = previousBest === null || average < previousBest;
  const personalBest = isNewPB ? average : previousBest;

  if (isNewPB) {
    await redis.set(userKey('pb', username), String(average));
  }

  await upsertAlltimeLeaderboardScore(username, average);
  await upsertDailyLeaderboardScore(username, average, options.challengeDate ?? getDateString());
  await trackPlayerActivity(username);

  const streak = await updateStreak(username);
  const { xpEarned, progression } = await awardXp(username, {
    isNewPB,
    isDailyChallenge: options.isDailyChallenge,
  });

  return {
    personalBest: personalBest ?? average,
    streak,
    isNewPB,
    xpEarned,
    progression,
  };
}
