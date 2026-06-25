import './index.css';

import { useEffect, useState } from 'react';
import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameInitResponse } from '../shared/api';
import { DIFFICULTY_CONFIG } from '../shared/daily';

type SplashData = {
  dayNumber: number;
  difficulty: keyof typeof DIFFICULTY_CONFIG;
  playerCount: number;
  expiresIn: { hours: number; minutes: number };
};

export const Splash = () => {
  const [data, setData] = useState<SplashData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) return;
        const json: GameInitResponse = await res.json();
        if (json.type !== 'init') return;
        setData({
          dayNumber: json.dailyChallenge.dayNumber,
          difficulty: json.dailyChallenge.difficulty,
          playerCount: json.dailyChallenge.playerCount,
          expiresIn: json.dailyChallenge.expiresIn,
        });
      } catch {
        // Splash works without data
      }
    };
    void load();
  }, []);

  const difficultyLabel = data ? DIFFICULTY_CONFIG[data.difficulty].label : 'Medium';

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 bg-gray-950 text-white px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-5xl">⚡</span>
        <h1 className="text-2xl font-bold">Instant Tap</h1>
        {data ? (
          <>
            <p className="text-orange-400 font-semibold">
              Daily Challenge #{data.dayNumber} — {difficultyLabel}
            </p>
            <p className="text-sm text-gray-400">
              {data.playerCount.toLocaleString()} playing today
            </p>
            <p className="text-xs text-yellow-500/80">
              ⏰ {data.expiresIn.hours}h {data.expiresIn.minutes}m remaining
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">Test your reaction speed</p>
        )}
      </div>

      <button
        type="button"
        className="mt-4 px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-lg transition-colors cursor-pointer"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        ▶ Play Now
      </button>

      <p className="text-xs text-gray-600 mt-2">Tap when green — 5 rounds</p>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
