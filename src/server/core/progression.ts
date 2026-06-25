import { redis } from '@devvit/web/server';
import { getDateString } from '../../shared/daily';
import {
  calculateXpEarned,
  getProgressToNextLevel,
  type LevelProgress,
} from '../../shared/progression';

function xpKey(username: string): string {
  return `user:${username.toLowerCase()}:xp`;
}

function lastPlayedKey(username: string): string {
  return `user:${username.toLowerCase()}:lastPlayed`;
}

export async function getXp(username: string): Promise<number> {
  const value = await redis.get(xpKey(username));
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getProgression(username: string): Promise<LevelProgress> {
  const xp = await getXp(username);
  return getProgressToNextLevel(xp);
}

export async function isFirstGameToday(username: string): Promise<boolean> {
  const lastPlayed = await redis.get(lastPlayedKey(username));
  return lastPlayed !== getDateString();
}

export async function awardXp(
  username: string,
  params: {
    isNewPB: boolean;
    isDailyChallenge: boolean;
  }
): Promise<{ xpEarned: number; progression: LevelProgress }> {
  const firstGameToday = await isFirstGameToday(username);
  const xpEarned = calculateXpEarned({
    isNewPB: params.isNewPB,
    isFirstGameToday: firstGameToday,
    isDailyChallenge: params.isDailyChallenge,
  });

  const newXp = await redis.incrBy(xpKey(username), xpEarned);
  await redis.set(lastPlayedKey(username), getDateString());

  return {
    xpEarned,
    progression: getProgressToNextLevel(newXp),
  };
}
