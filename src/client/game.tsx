import './index.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { showToast } from '@devvit/web/client';
import { TOTAL_ROUNDS, averageMs, getRating } from '../shared/game';
import { DIFFICULTY_CONFIG } from '../shared/daily';
import { useReactionGame } from './hooks/useReactionGame';
import type { LeaderboardEntry } from '../shared/game';
import type { SubmitScoreResponse } from '../shared/api';

type Phase = 'intro' | 'waiting' | 'ready' | 'too-early' | 'round-done' | 'submitting' | 'results';

const LeaderboardList = ({
  title,
  entries,
}: {
  title: string;
  entries: LeaderboardEntry[];
}) => (
  <div className="w-full">
    <h3 className="text-sm font-semibold text-gray-400 mb-2">{title}</h3>
    {entries.length === 0 ? (
      <p className="text-sm text-gray-500">No scores yet — be the first!</p>
    ) : (
      <ul className="space-y-1">
        {entries.map((entry, i) => (
          <li
            key={`${entry.name}-${i}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              entry.isYou ? 'bg-orange-900/40 border border-orange-500/50' : 'bg-gray-800/60'
            }`}
          >
            <span className="w-6 text-center font-bold text-gray-400">
              {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
            </span>
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="font-mono font-semibold">{entry.avg}ms</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const App = () => {
  const {
    loading,
    username,
    personalBest,
    streak,
    leaderboard,
    dailyLeaderboard,
    dailyChallenge,
    progression,
    submitScore,
    shareScore,
  } = useReactionGame();

  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [lastRoundMs, setLastRoundMs] = useState(0);
  const [results, setResults] = useState<SubmitScoreResponse | null>(null);
  const [sharing, setSharing] = useState(false);

  const readyAtRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startRound = useCallback(() => {
    clearTimer();
    setPhase('waiting');
    const delay =
      dailyChallenge.minDelayMs +
      Math.random() * (dailyChallenge.maxDelayMs - dailyChallenge.minDelayMs);
    timeoutRef.current = setTimeout(() => {
      readyAtRef.current = performance.now();
      setPhase('ready');
    }, delay);
  }, [clearTimer, dailyChallenge.minDelayMs, dailyChallenge.maxDelayMs]);

  const startGame = useCallback(() => {
    if (dailyChallenge.isExpired) return;
    setRound(1);
    setTimes([]);
    setResults(null);
    startRound();
  }, [dailyChallenge.isExpired, startRound]);

  const finishGame = useCallback(
    async (allTimes: number[]) => {
      setPhase('submitting');
      const avg = averageMs(allTimes);
      try {
        const data = await submitScore(avg, allTimes);
        setResults(data);
        setPhase('results');
      } catch {
        showToast('Failed to save score — try again');
        setPhase('intro');
      }
    },
    [submitScore]
  );

  const handleTap = useCallback(() => {
    if (phase === 'waiting') {
      clearTimer();
      setPhase('too-early');
      return;
    }

    if (phase === 'ready') {
      const reactionMs = Math.round(performance.now() - readyAtRef.current);
      setLastRoundMs(reactionMs);
      const newTimes = [...times, reactionMs];
      setTimes(newTimes);

      if (round >= TOTAL_ROUNDS) {
        void finishGame(newTimes);
        return;
      }

      setPhase('round-done');
    }
  }, [phase, clearTimer, times, round, finishGame]);

  const handleNextRound = useCallback(() => {
    setRound((r) => r + 1);
    startRound();
  }, [startRound]);

  const handleShare = useCallback(async () => {
    if (!results?.shareText || sharing) return;
    setSharing(true);
    try {
      await shareScore(results.shareText);
      showToast('Score shared to comments!');
    } catch {
      showToast('Could not share score');
    } finally {
      setSharing(false);
    }
  }, [results, shareScore, sharing]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <p className="text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  const difficultyLabel = DIFFICULTY_CONFIG[dailyChallenge.difficulty].label;
  const rating = results ? getRating(averageMs(times)) : null;

  return (
    <div
      className="flex flex-col items-center min-h-screen bg-gray-950 text-white px-4 py-6 select-none"
      onClick={phase === 'waiting' || phase === 'ready' ? handleTap : undefined}
    >
      <header className="w-full max-w-md mb-4">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>#{dailyChallenge.dayNumber} · {difficultyLabel}</span>
          {streak > 0 && <span>🔥 {streak} day streak</span>}
        </div>
        {!dailyChallenge.isExpired && (
          <p className="text-xs text-yellow-500/80 mt-1">
            ⏰ {dailyChallenge.expiresIn.hours}h {dailyChallenge.expiresIn.minutes}m left
          </p>
        )}
        <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
          <div
            className="bg-orange-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progression.percent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Lv.{progression.level} · {progression.current}/{progression.required} XP
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        {dailyChallenge.isExpired ? (
          <div className="text-center space-y-4">
            <p className="text-xl text-gray-300">This challenge has ended</p>
            <p className="text-sm text-gray-500">
              {dailyChallenge.playerCount.toLocaleString()} players competed
            </p>
            <p className="text-sm text-gray-400">Find today&apos;s challenge in the feed</p>
          </div>
        ) : phase === 'intro' ? (
          <div className="text-center space-y-6 w-full">
            <div>
              <h1 className="text-3xl font-bold">⚡ Instant Tap</h1>
              <p className="text-gray-400 mt-2">
                Tap when the screen turns green — {TOTAL_ROUNDS} rounds
              </p>
            </div>
            {personalBest !== null && (
              <p className="text-sm text-gray-400">
                Personal best: <span className="text-orange-400 font-mono">{personalBest}ms</span>
              </p>
            )}
            <p className="text-xs text-gray-500">
              {dailyChallenge.playerCount.toLocaleString()} playing today
            </p>
            <button
              type="button"
              onClick={startGame}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 rounded-xl text-lg font-bold transition-colors"
            >
              ▶ Start
            </button>
          </div>
        ) : phase === 'waiting' ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-400">
              Round {round}/{TOTAL_ROUNDS}
            </p>
            <div className="w-48 h-48 rounded-full bg-red-600 flex items-center justify-center">
              <span className="text-2xl font-bold">Wait...</span>
            </div>
            <p className="text-xs text-gray-500">Don&apos;t tap yet!</p>
          </div>
        ) : phase === 'ready' ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-400">
              Round {round}/{TOTAL_ROUNDS}
            </p>
            <div className="w-48 h-48 rounded-full bg-green-500 flex items-center justify-center animate-pulse cursor-pointer">
              <span className="text-3xl font-bold">TAP!</span>
            </div>
          </div>
        ) : phase === 'too-early' ? (
          <div className="text-center space-y-4">
            <p className="text-xl text-red-400">Too early!</p>
            <button
              type="button"
              onClick={startRound}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold"
            >
              Try again
            </button>
          </div>
        ) : phase === 'round-done' ? (
          <div className="text-center space-y-4">
            <p className="text-4xl font-mono font-bold">{lastRoundMs}ms</p>
            <p className="text-sm" style={{ color: getRating(lastRoundMs).color }}>
              {getRating(lastRoundMs).label}
            </p>
            <button
              type="button"
              onClick={handleNextRound}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-semibold"
            >
              Next round →
            </button>
          </div>
        ) : phase === 'submitting' ? (
          <p className="text-lg animate-pulse">Saving score...</p>
        ) : results && rating ? (
          <div className="w-full space-y-5">
            <div className="text-center">
              <p className="text-4xl font-mono font-bold">{averageMs(times)}ms</p>
              <p className="text-lg mt-1" style={{ color: rating.color }}>
                {rating.label}
              </p>
              {results.isNewPB && (
                <p className="text-yellow-400 font-semibold mt-2">🏆 New personal best!</p>
              )}
              <p className="text-sm text-green-400 mt-2">+{results.xpEarned} XP</p>
            </div>

            <LeaderboardList title="Today's leaderboard" entries={dailyLeaderboard} />
            <LeaderboardList title="All-time best" entries={leaderboard} />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-semibold text-sm"
              >
                {sharing ? 'Sharing...' : 'Share score'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase('intro');
                  setRound(0);
                  setTimes([]);
                  setResults(null);
                }}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-semibold text-sm"
              >
                Play again
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="mt-4 text-xs text-gray-600">
        {username ? `Playing as ${username}` : ''}
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
