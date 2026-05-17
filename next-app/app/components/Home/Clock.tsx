'use client';

import React from 'react';
import { useTimerStore } from '@/store/useTimerStore';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import { ConvertSecsToTimer } from '@/lib/utils';
import ClockCircle from '../pomodoro/ClockCircle';
import ClockTime from '../pomodoro/ClockTime';
import ClockDialogBox from '../ClockDialogBox';

function Clock() {
  const store = useTimerStore();
  const { remainingMs, progress, phase, mode } = useTimerEngine();

  const { hours, minutes, seconds } = ConvertSecsToTimer({
    workSecs: Math.floor(remainingMs / 1000),
  });

  const getPhaseColor = () => {
    if (mode === 'stopwatch') return store.workColor;
    switch (phase) {
      case 'work':
        return store.workColor;
      case 'shortBreak':
        return store.shortBreakColor;
      case 'longBreak':
        return store.longBreakColor;
      default:
        return store.workColor;
    }
  };

  return (
    <section className="flex justify-center items-center scale-90 lg:scale-100">
      <ClockDialogBox
        child={
          <div className="relative flex justify-center items-center transition-transform hover:scale-105 duration-300">
            <ClockCircle percent={progress} size={'sm'} color={getPhaseColor()} />
            <div className="absolute">
              <ClockTime hours={hours} minutes={minutes} seconds={seconds} color={'#fff'} />
            </div>
          </div>
        }
      />
    </section>
  );
}

export default Clock;
