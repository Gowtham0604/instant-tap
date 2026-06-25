export type LevelProgress = {
  level: number;
  xp: number;
  current: number;
  required: number;
  percent: number;
};

export const XP_REWARDS = {
  GAME_COMPLETE: 10,
  NEW_PB: 50,
  FIRST_GAME_TODAY: 15,
  DAILY_CHALLENGE: 30,
} as const;

export const xpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.floor(100 * (level - 1) ** 1.5);
};

export const getLevelFromXp = (xp: number): number => {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
};

export const getProgressToNextLevel = (xp: number): LevelProgress => {
  const level = getLevelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progress = xp - currentLevelXp;
  const required = nextLevelXp - currentLevelXp;
  return {
    level,
    xp,
    current: progress,
    required,
    percent: required > 0 ? Math.floor((progress / required) * 100) : 100,
  };
};

export const calculateXpEarned = (params: {
  isNewPB: boolean;
  isFirstGameToday: boolean;
  isDailyChallenge: boolean;
}): number => {
  let xp = XP_REWARDS.GAME_COMPLETE;
  if (params.isNewPB) xp += XP_REWARDS.NEW_PB;
  if (params.isFirstGameToday) xp += XP_REWARDS.FIRST_GAME_TODAY;
  if (params.isDailyChallenge) xp += XP_REWARDS.DAILY_CHALLENGE;
  return xp;
};
