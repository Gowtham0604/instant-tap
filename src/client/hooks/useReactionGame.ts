import { useCallback, useEffect, useState } from 'react';
import type { GameInitResponse, SubmitScoreResponse } from '../../shared/api';
import type { DailyChallengeInfo } from '../../shared/api';
import type { LeaderboardEntry } from '../../shared/game';
import type { LevelProgress } from '../../shared/progression';
import { generateDailyChallenge } from '../../shared/daily';

type ReactionGameState = {
  loading: boolean;
  username: string;
  personalBest: number | null;
  streak: number;
  leaderboard: LeaderboardEntry[];
  dailyLeaderboard: LeaderboardEntry[];
  dailyChallenge: DailyChallengeInfo;
  progression: LevelProgress;
};

const defaultChallenge = (): DailyChallengeInfo => {
  const challenge = generateDailyChallenge();
  return {
    ...challenge,
    isExpired: false,
    expiresIn: { hours: 0, minutes: 0 },
    playerCount: 0,
  };
};

const defaultProgression = (): LevelProgress => ({
  level: 1,
  xp: 0,
  current: 0,
  required: 100,
  percent: 0,
});

export const useReactionGame = () => {
  const [state, setState] = useState<ReactionGameState>({
    loading: true,
    username: 'anonymous',
    personalBest: null,
    streak: 0,
    leaderboard: [],
    dailyLeaderboard: [],
    dailyChallenge: defaultChallenge(),
    progression: defaultProgression(),
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: GameInitResponse = await res.json();
        if (data.type !== 'init') throw new Error('Unexpected response');
        setState({
          loading: false,
          username: data.username,
          personalBest: data.personalBest,
          streak: data.streak,
          leaderboard: data.leaderboard,
          dailyLeaderboard: data.dailyLeaderboard,
          dailyChallenge: data.dailyChallenge,
          progression: data.progression,
        });
      } catch (error) {
        console.error('Failed to init reaction game', error);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    void init();
  }, []);

  const submitScore = useCallback(async (average: number, times: number[]) => {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ average, times }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: SubmitScoreResponse = await res.json();
    if (data.type !== 'submit') throw new Error('Unexpected response');

    setState((prev) => ({
      ...prev,
      personalBest: data.personalBest,
      streak: data.streak,
      leaderboard: data.leaderboard,
      dailyLeaderboard: data.dailyLeaderboard,
      progression: data.progression,
    }));

    return data;
  }, []);

  const shareScore = useCallback(async (text: string) => {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  return { ...state, submitScore, shareScore };
};
