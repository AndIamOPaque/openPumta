'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimerPhase = 'work' | 'shortBreak' | 'longBreak' | 'idle' | 'paused';
export type TimerMode = 'pomodoro' | 'stopwatch';

interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

interface TimerState {
  running: boolean;
  phase: TimerPhase;
  mode: TimerMode;
  startTimestamp: number | null;
  accumulatedMs: number;
  settings: TimerSettings;
  activeSubjectId: number | null;
  completedPomodoros: number;
  showProgressBar: boolean;
  workColor: string;
  shortBreakColor: string;
  longBreakColor: string;

  // Actions
  setMode: (mode: TimerMode) => void;
  setShowProgressBar: (show: boolean) => void;
  setSettings: (settings: Partial<TimerSettings>) => void;
  setColors: (work: string, short: string, long: string) => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  reset: () => void;
  toggleSubject: (
    subjectId: number,
    startApi: (id: number) => Promise<void | unknown>,
    endApi: (id: number) => Promise<void | unknown>,
  ) => Promise<void>;
  completePhase: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      running: false,
      phase: 'idle',
      mode: 'pomodoro',
      startTimestamp: null,
      accumulatedMs: 0,
      settings: {
        workDuration: 25 * 60 * 1000,
        shortBreakDuration: 5 * 60 * 1000,
        longBreakDuration: 15 * 60 * 1000,
        autoStartBreaks: true,
        autoStartWork: true,
      },
      activeSubjectId: null,
      completedPomodoros: 0,
      showProgressBar: true,
      workColor: '#f97316',
      shortBreakColor: '#22c55e',
      longBreakColor: '#3b82f6',

      setMode: (mode) => set({ mode }),
      setShowProgressBar: (showProgressBar) => set({ showProgressBar }),
      setSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      setColors: (work, short, long) =>
        set({ workColor: work, shortBreakColor: short, longBreakColor: long }),

      pause: () => {
        const { running, startTimestamp, accumulatedMs } = get();
        if (running && startTimestamp) {
          set({
            running: false,
            accumulatedMs: accumulatedMs + (Date.now() - startTimestamp),
            startTimestamp: null,
          });
        } else {
          set({ running: false });
        }
      },

      resume: () => {
        const { running, phase } = get();
        if (!running) {
          set({
            running: true,
            startTimestamp: Date.now(),
            phase: phase === 'idle' || phase === 'paused' ? 'work' : phase,
          });
        }
      },

      skip: () => {
        get().completePhase();
      },

      reset: () => {
        set({
          running: false,
          phase: 'idle',
          startTimestamp: null,
          accumulatedMs: 0,
          completedPomodoros: 0,
          activeSubjectId: null,
        });
      },

      toggleSubject: async (subjectId, startApi, endApi) => {
        const state = get();
        const isCurrent = state.activeSubjectId === subjectId;

        if (isCurrent) {
          if (state.running) {
            if (state.phase === 'work') {
              await endApi(subjectId);
            }
            state.pause();
          } else {
            if (state.phase === 'work') {
              await startApi(subjectId);
            }
            state.resume();
          }
        } else {
          // Switching subjects
          if (state.activeSubjectId && state.running && state.phase === 'work') {
            await endApi(state.activeSubjectId);
          }

          set({
            activeSubjectId: subjectId,
            phase: 'work',
            running: true,
            startTimestamp: Date.now(),
            accumulatedMs: 0,
          });

          await startApi(subjectId);
        }
      },

      completePhase: () => {
        const { phase, settings, completedPomodoros, mode } = get();

        if (mode === 'stopwatch') return;

        if (phase === 'work') {
          const nextCompleted = completedPomodoros + 1;
          const nextPhase = nextCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';

          set({
            completedPomodoros: nextCompleted,
            phase: nextPhase,
            startTimestamp: settings.autoStartBreaks ? Date.now() : null,
            running: settings.autoStartBreaks,
            accumulatedMs: 0,
          });
        } else {
          // Transitions from breaks (short or long) back to work
          set({
            phase: 'work',
            startTimestamp: settings.autoStartWork ? Date.now() : null,
            running: settings.autoStartWork,
            accumulatedMs: 0,
          });
        }
      },
    }),
    {
      name: 'timer-storage',
    },
  ),
);
