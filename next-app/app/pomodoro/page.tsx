'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTimerStore } from '@/store/useTimerStore';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import ClockCircle from '../components/pomodoro/ClockCircle';
import { ConvertSecsToTimer, pad } from '@/lib/utils';
import {
  IoIosPause,
  IoIosPlay,
  IoIosRefresh,
  IoIosSkipForward,
  IoIosArrowBack,
} from 'react-icons/io';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubjects, useSubjectTimer } from '@/hooks/useSubjects';

function PomodoroPage() {
  const { data: Subjects = [], isLoading } = useSubjects();
  const { startTimer, endTimer } = useSubjectTimer();
  const store = useTimerStore();
  const {
    remainingMs,
    elapsedMs,
    progress,
    phase,
    mode,
    running,
    activeSubjectId,
    completedPomodoros,
  } = useTimerEngine();
  const router = useRouter();

  const runningSubject = Subjects.find((subject) => subject.id === activeSubjectId);

  const handleToggleTimer = async () => {
    if (running) {
      if (activeSubjectId && phase === 'work') {
        try {
          await endTimer.mutateAsync(activeSubjectId);
        } catch (error) {
          console.error('Failed to end timer:', error);
        }
      }
      store.pause();
    } else {
      if (!activeSubjectId) {
        store.resume();
      } else {
        if (phase === 'work') {
          try {
            await startTimer.mutateAsync(activeSubjectId);
          } catch (error) {
            console.error('Failed to start timer:', error);
          }
        }
        store.resume();
      }
    }
  };

  const handleReset = () => {
    store.reset();
  };

  const handleSkip = () => {
    store.skip();
  };

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <span className="text-2xl font-semibold">Loading timer...</span>
      </div>
    );
  }

  const displayTime = ConvertSecsToTimer({ workSecs: Math.floor(remainingMs / 1000) });

  let totalWorkedSecs = 0;
  let totalBreakSecs = 0;
  let goalWorkSecs = 0;
  let goalBreakSecs = 0;

  if (runningSubject) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const logsToday = [...(runningSubject.subjectLogs || [])]
      .filter((log) => new Date(log.startedAt).getTime() >= startOfToday)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    totalWorkedSecs =
      logsToday.reduce((acc, log) => acc + (log.duration || 0), 0) +
      (phase === 'work' ? Math.floor(elapsedMs / 1000) : 0);

    for (let i = 0; i < logsToday.length - 1; i++) {
      const currentEnd = new Date(logsToday[i].endedAt || logsToday[i].startedAt).getTime();
      const nextStart = new Date(logsToday[i + 1].startedAt).getTime();
      if (nextStart > currentEnd) {
        totalBreakSecs += (nextStart - currentEnd) / 1000;
      }
    }
    if ((phase === 'shortBreak' || phase === 'longBreak') && running) {
      totalBreakSecs += Math.floor(elapsedMs / 1000);
    }

    goalWorkSecs = runningSubject.goalWorkSecs || 0;
    const breakRatio = store.settings.shortBreakDuration / store.settings.workDuration;
    goalBreakSecs = Math.floor(goalWorkSecs * breakRatio);
  }

  const isBreak = phase === 'shortBreak' || phase === 'longBreak';
  const goalProgressPercent = isBreak
    ? goalBreakSecs
      ? Math.min(100, (totalBreakSecs / goalBreakSecs) * 100)
      : 0
    : goalWorkSecs
      ? Math.min(100, (totalWorkedSecs / goalWorkSecs) * 100)
      : 0;

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

  const getPhaseLabel = () => {
    if (mode === 'stopwatch') return 'DEEP WORK';
    switch (phase) {
      case 'work':
        return 'WORK PHASE';
      case 'shortBreak':
        return 'SHORT BREAK';
      case 'longBreak':
        return 'LONG BREAK';
      case 'paused':
        return 'PAUSED';
      default:
        return 'IDLE';
    }
  };

  return (
    <section className="flex flex-col justify-center items-center h-screen w-screen gap-0 relative">
      <Button
        onClick={handleBack}
        variant="ghost"
        className="absolute top-8 left-8 rounded-full h-12 w-12 p-0"
      >
        <IoIosArrowBack size={24} />
      </Button>

      {runningSubject && <h1 className="text-5xl font-bold mb-4">{runningSubject.name}</h1>}

      <ClockCircle percent={progress} size="lg" color={getPhaseColor()}>
        <div className="flex flex-col items-center">
          <div
            className="text-7xl font-bold mb-2 transition-colors duration-500"
            style={{ color: getPhaseColor() }}
          >
            {pad(displayTime.hours)}:{pad(displayTime.minutes)}:{pad(displayTime.seconds)}
          </div>
          <div className="text-2xl font-semibold text-muted-foreground uppercase tracking-widest">
            {getPhaseLabel()}
          </div>
          <div className="text-lg font-medium text-muted-foreground/60 mt-1">
            {mode === 'pomodoro'
              ? `Completed: ${completedPomodoros}`
              : `Session: ${pad(Math.floor(elapsedMs / 3600000))}:${pad(Math.floor((elapsedMs % 3600000) / 60000))}`}
          </div>
        </div>
      </ClockCircle>

      {runningSubject && store.showProgressBar && (
        <div className="w-1/2 mb-12">
          <Tooltip>
            <TooltipTrigger asChild>
              <Progress
                value={goalProgressPercent}
                className="h-4 transition-all"
                indicatorStyle={{ backgroundColor: getPhaseColor() }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="font-semibold text-lg">
                {isBreak ? 'Daily Break Total: ' : 'Daily Work Goal: '}
                {isBreak
                  ? `${pad(Math.floor(totalBreakSecs / 3600))}:${pad(Math.floor((totalBreakSecs % 3600) / 60))}`
                  : `${pad(Math.floor(goalWorkSecs / 3600))}:${pad(Math.floor((goalWorkSecs % 3600) / 60))}`}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="flex items-center gap-8">
        {(phase !== 'work' || !running) && (
          <Button onClick={handleReset} variant="outline" className="rounded-full w-14 h-14">
            <IoIosRefresh size={24} />
          </Button>
        )}

        <Button
          onClick={handleToggleTimer}
          variant="secondary"
          className="rounded-full w-24 h-24 shadow-lg hover:scale-105 transition-all"
        >
          {running ? <IoIosPause size={48} /> : <IoIosPlay size={48} />}
        </Button>

        {mode === 'pomodoro' && phase !== 'work' && (
          <Button onClick={handleSkip} variant="outline" className="rounded-full w-14 h-14">
            <IoIosSkipForward size={24} />
          </Button>
        )}
      </div>
    </section>
  );
}

export default PomodoroPage;
