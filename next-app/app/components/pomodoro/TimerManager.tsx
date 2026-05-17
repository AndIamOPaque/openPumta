'use client';

import { useEffect, useState } from 'react';
import { useTimerEngine } from '@/hooks/useTimerEngine';

/**
 * TimerManager is a headless component mounted at the root of the application (in Providers).
 * It ensures that the useTimerEngine hook is always active, allowing the timer to
 * auto-transition between phases (work/break) even when the user is not on the
 * Pomodoro or Home pages.
 */
export function TimerManager() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Setting state in a microtask to avoid synchronous cascading renders
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // We only render the component that calls useTimerEngine after mounting on the client.
  // This prevents hydration mismatches and server-side infinite loops.
  if (!mounted) return null;

  return <TimerEngineRunner />;
}

function TimerEngineRunner() {
  // useTimerEngine contains the setInterval logic for auto-transitioning phases
  useTimerEngine();
  return null;
}
