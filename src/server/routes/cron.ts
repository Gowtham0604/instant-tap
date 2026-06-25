import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { createDailyChallengePost } from '../core/daily';
import { generateDailyChallenge } from '../../shared/daily';

export const cron = new Hono();

cron.post('/daily-challenge', async (c) => {
  await c.req.json();

  try {
    const challenge = generateDailyChallenge();
    await createDailyChallengePost(challenge);
    return c.json<TaskResponse>({ status: 'ok' });
  } catch (error) {
    console.error('Daily challenge cron failed:', error);
    return c.json<TaskResponse>({ status: 'error' }, 500);
  }
});
