import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type { GameInitResponse, ShareScoreResponse, SubmitScoreResponse } from '../../shared/api';
import { generateShareText } from '../../shared/daily';
import { getRating } from '../../shared/game';
import {
  buildDailyChallengeInfo,
  getChallengeForContext,
  getTodayPlayerCount,
  shareScoreToThread,
} from '../core/daily';
import { getProgression } from '../core/progression';
import {
  getDailyLeaderboard,
  getLeaderboard,
  getPersonalBest,
  getStreak,
  submitScore,
  validateScoreSubmission,
} from '../core/game';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required but missing from context' },
      400
    );
  }

  try {
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const challenge = getChallengeForContext(context.postData);
    const playerCount = await getTodayPlayerCount(challenge.date);

    const [personalBest, streak, leaderboard, dailyLeaderboard, progression] =
      await Promise.all([
        getPersonalBest(username),
        getStreak(username),
        getLeaderboard(username),
        getDailyLeaderboard(username, challenge.date),
        getProgression(username),
      ]);

    return c.json<GameInitResponse>({
      type: 'init',
      postId,
      username,
      personalBest,
      streak,
      leaderboard,
      dailyLeaderboard,
      dailyChallenge: buildDailyChallengeInfo(challenge, playerCount),
      progression,
    });
  } catch (error) {
    console.error('Game init failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/submit', async (c) => {
  const { postId } = context;

  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }

  try {
    const body = await c.req.json<{ average?: number; times?: number[] }>();
    const average = body.average;
    const times = body.times;

    if (typeof average !== 'number' || !Array.isArray(times)) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid score payload' }, 400);
    }

    if (!validateScoreSubmission(times, average)) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid score data' }, 400);
    }

    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const challenge = getChallengeForContext(context.postData);

    const result = await submitScore(username, average, {
      isDailyChallenge: !buildDailyChallengeInfo(challenge, 0).isExpired,
      challengeDate: challenge.date,
    });

    const [leaderboard, dailyLeaderboard] = await Promise.all([
      getLeaderboard(username),
      getDailyLeaderboard(username, challenge.date),
    ]);

    const rating = getRating(average);
    const shareText = generateShareText({
      dayNumber: challenge.dayNumber,
      averageMs: average,
      ratingLabel: rating.label,
      streak: result.streak,
      isNewPB: result.isNewPB,
    });

    return c.json<SubmitScoreResponse>({
      type: 'submit',
      personalBest: result.personalBest,
      streak: result.streak,
      isNewPB: result.isNewPB,
      leaderboard,
      dailyLeaderboard,
      xpEarned: result.xpEarned,
      progression: result.progression,
      shareText,
    });
  } catch (error) {
    console.error('Score submit failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/share', async (c) => {
  const { postId } = context;

  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }

  try {
    const body = await c.req.json<{ text?: string }>();
    if (!body.text || body.text.trim().length === 0) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Share text is required' }, 400);
    }

    const success = await shareScoreToThread(postId, body.text.trim());
    if (!success) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Score thread not found for this post' },
        400
      );
    }

    return c.json<ShareScoreResponse>({ type: 'share', success: true });
  } catch (error) {
    console.error('Share score failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});
