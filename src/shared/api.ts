import type { LeaderboardEntry } from './game';
import type { DailyChallengeConfig } from './daily';
import type { LevelProgress } from './progression';

export type DailyChallengeInfo = DailyChallengeConfig & {
  isExpired: boolean;
  expiresIn: { hours: number; minutes: number };
  playerCount: number;
};

export type GameInitResponse = {
  type: 'init';
  postId: string;
  username: string;
  personalBest: number | null;
  streak: number;
  leaderboard: LeaderboardEntry[];
  dailyLeaderboard: LeaderboardEntry[];
  dailyChallenge: DailyChallengeInfo;
  progression: LevelProgress;
};

export type SubmitScoreRequest = {
  average: number;
  times: number[];
};

export type SubmitScoreResponse = {
  type: 'submit';
  personalBest: number;
  streak: number;
  isNewPB: boolean;
  leaderboard: LeaderboardEntry[];
  dailyLeaderboard: LeaderboardEntry[];
  xpEarned: number;
  progression: LevelProgress;
  shareText: string;
};

export type ShareScoreRequest = {
  text: string;
};

export type ShareScoreResponse = {
  type: 'share';
  success: boolean;
};
