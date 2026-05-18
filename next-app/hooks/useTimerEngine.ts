import { useState, useEffect, useMemo } from 'react';
import { useTimerStore } from '@/store/useTimerStore';
import { useShallow } from 'zustand/react/shallow';

export function useTimerEngine() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const store = useTimerStore(
    useShallow((s) => ({
      running: s.running,
      phase: s.phase,
      mode: s.mode,
      startTimestamp: s.startTimestamp,
      accumulatedMs: s.accumulatedMs,
      settings: s.settings,
      completePhase: s.completePhase,
      activeSubjectId: s.activeSubjectId,
      completedPomodoros: s.completedPomodoros,
    })),
  );

  const {
    running,
    phase,
    mode,
    startTimestamp,
    accumulatedMs,
    settings,
    completePhase,
    activeSubjectId,
    completedPomodoros,
  } = store;

  const { workDuration, shortBreakDuration, longBreakDuration } = settings;

  // localNow serves as a ticker to force re-renders for the live time display
  const [localNow, setLocalNow] = useState(() => Date.now());

  const targetDuration = useMemo(() => {
    switch (phase) {
      case 'work':
        return workDuration;
      case 'shortBreak':
        return shortBreakDuration;
      case 'longBreak':
        return longBreakDuration;
      default:
        return 0;
    }
  }, [phase, workDuration, shortBreakDuration, longBreakDuration]);

  const elapsedMs = useMemo(() => {
    if (running && startTimestamp) {
      return accumulatedMs + (localNow - startTimestamp);
    }
    return accumulatedMs;
  }, [running, startTimestamp, accumulatedMs, localNow]);

  useEffect(() => {
    if (!running || !hasHydrated) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      setLocalNow(now);

      // Pomodoro Auto-Transition Logic
      if (mode === 'pomodoro' && phase !== 'idle' && phase !== 'paused') {
        const currentElapsed = accumulatedMs + (now - (startTimestamp || now));
        if (currentElapsed >= targetDuration) {
          completePhase();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    running,
    mode,
    phase,
    startTimestamp,
    accumulatedMs,
    targetDuration,
    completePhase,
    hasHydrated,
  ]);

  const progress =
    mode === 'pomodoro' && targetDuration > 0
      ? Math.min(100, (elapsedMs / targetDuration) * 100)
      : 0;

  const remainingMs = mode === 'pomodoro' ? Math.max(0, targetDuration - elapsedMs) : elapsedMs;

  // During SSR and before hydration, we return stable default-ish values
  // based on the initial store state to minimize mismatches.
  if (!hasHydrated) {
    return {
      elapsedMs: 0,
      remainingMs: mode === 'pomodoro' ? workDuration : 0,
      progress: 0,
      running: false,
      phase: 'idle',
      mode: 'pomodoro',
      activeSubjectId: null,
      completedPomodoros: 0,
      settings: settings,
    };
  }

  return {
    elapsedMs,
    remainingMs,
    progress,
    running,
    phase,
    mode,
    activeSubjectId,
    completedPomodoros,
    settings,
  };
}
