import { redis, reddit, context } from '@devvit/web/server';
import type { JsonObject } from '@devvit/web/shared';
import type { PostData } from '@devvit/shared-types/PostData.js';
import type { T1 } from '@devvit/shared-types/tid.js';
import {
  generateDailyChallenge,
  getDateString,
  getTimeUntilExpiry,
  isChallengeExpired,
  type DailyChallengeConfig,
} from '../../shared/daily';

const DAILY_LATEST_KEY = 'daily:latest';

function dailyPostKey(date: string): string {
  return `daily:${date}:postId`;
}

function dailyLeaderboardKey(date: string): string {
  return `leaderboard:daily:${date}`;
}

function dailyPlayersKey(date: string): string {
  return `daily:${date}:players`;
}

function scoreThreadKey(postId: string): string {
  return `post:${postId}:scoreThread`;
}

export function getDailyLeaderboardKey(date: string = getDateString()): string {
  return dailyLeaderboardKey(date);
}

export async function getTodayPlayerCount(date: string = getDateString()): Promise<number> {
  return redis.zCard(dailyPlayersKey(date));
}

export async function trackPlayerActivity(username: string): Promise<void> {
  const today = getDateString();
  await redis.zAdd(dailyPlayersKey(today), {
    member: username.toLowerCase(),
    score: Date.now(),
  });
}

export async function upsertDailyLeaderboardScore(
  username: string,
  average: number,
  date: string = getDateString()
): Promise<void> {
  const member = username.toLowerCase();
  const key = dailyLeaderboardKey(date);
  const existing = await redis.zScore(key, member);

  if (existing === undefined || average < existing) {
    await redis.zAdd(key, { member, score: average });
  }
}

export async function getLatestDailyPostId(): Promise<string | null> {
  const value = await redis.get(DAILY_LATEST_KEY);
  return value ?? null;
}

export const parseChallengeFromPostData = (
  postData: PostData | undefined
): DailyChallengeConfig | null => {
  if (!postData || postData.type !== 'daily-challenge') return null;

  const date = typeof postData.date === 'string' ? postData.date : getDateString();
  const dayNumber = typeof postData.dayNumber === 'number' ? postData.dayNumber : 1;
  const difficulty =
    postData.difficulty === 'easy' || postData.difficulty === 'hard' || postData.difficulty === 'medium'
      ? postData.difficulty
      : 'medium';
  const minDelayMs = typeof postData.minDelayMs === 'number' ? postData.minDelayMs : 1500;
  const maxDelayMs = typeof postData.maxDelayMs === 'number' ? postData.maxDelayMs : 4500;

  return { date, dayNumber, difficulty, minDelayMs, maxDelayMs };
};

export async function createDailyChallengePost(
  challenge: DailyChallengeConfig = generateDailyChallenge()
): Promise<{ postId: string }> {
  const postData: JsonObject = {
    type: 'daily-challenge',
    date: challenge.date,
    dayNumber: challenge.dayNumber,
    difficulty: challenge.difficulty,
    minDelayMs: challenge.minDelayMs,
    maxDelayMs: challenge.maxDelayMs,
  };

  const post = await reddit.submitCustomPost({
    subredditName: context.subredditName!,
    title: `Daily Challenge #${challenge.dayNumber} — ${challenge.difficulty} ⚡`,
    entry: 'default',
    postData,
  });

  await redis.set(dailyPostKey(challenge.date), post.id);
  await redis.set(DAILY_LATEST_KEY, post.id);

  const scoreComment = await reddit.submitComment({
    id: post.id,
    text: '📊 **Share your score below!**\n\nReply to this comment with your result.',
  });
  await redis.set(scoreThreadKey(post.id), scoreComment.id);

  return { postId: post.id };
}

export async function shareScoreToThread(postId: string, text: string): Promise<boolean> {
  const stickyCommentId = await redis.get(scoreThreadKey(postId));
  if (!stickyCommentId) return false;

  await reddit.submitComment({
    id: stickyCommentId as T1,
    text,
    runAs: 'USER',
  });

  return true;
}

export function buildDailyChallengeInfo(
  challenge: DailyChallengeConfig,
  playerCount: number
): DailyChallengeConfig & {
  isExpired: boolean;
  expiresIn: { hours: number; minutes: number };
  playerCount: number;
} {
  return {
    ...challenge,
    isExpired: isChallengeExpired(challenge.date),
    expiresIn: getTimeUntilExpiry(),
    playerCount,
  };
}

export function getChallengeForContext(
  postData: PostData | undefined
): DailyChallengeConfig {
  return parseChallengeFromPostData(postData) ?? generateDailyChallenge();
}
