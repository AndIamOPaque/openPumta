import { useState, useEffect, useMemo } from 'react';
import { useTimerStore } from '@/store/useTimerStore';
import { useShallow } from 'zustand/react/shallow';

export function useTimerEngine() {
  const {
    status: running,
    phase,
    mode,
    startTimestamp,
    accumulatedMs,
    settings,
    completePhase,
    activeSubjectId,
    completedPomodoros,
  } = useTimerStore(
    useShallow((s) => ({
      status: s.running,
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

  const { workDuration, shortBreakDuration, longBreakDuration } = settings;

  // localNow serves as a ticker to force re-renders for the live time display
  // Using lazy initializer to avoid calling Date.now() during every render
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
    if (!running) {
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
  }, [running, mode, phase, startTimestamp, accumulatedMs, targetDuration, completePhase]);

  const progress =
    mode === 'pomodoro' && targetDuration > 0
      ? Math.min(100, (elapsedMs / targetDuration) * 100)
      : 0;

  const remainingMs = mode === 'pomodoro' ? Math.max(0, targetDuration - elapsedMs) : elapsedMs;

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
