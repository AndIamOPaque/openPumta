'use client';

import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useHabitDashboard,
  useHabitsWithLogs,
  useToggleHabitCompletion,
  useCreateHabit,
  useDeleteHabit,
  useUpdateHabit,
  HabitDifficulty,
} from '@/hooks/useHabits';
import { useHabitRewards } from '@/hooks/useHabitRewards';
import { useSubjects } from '@/hooks/useSubjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Calendar, Activity, Pencil, Flame } from 'lucide-react';
import { toast } from 'sonner';

interface Habit {
  id: number;
  name: string;
  difficulty?: HabitDifficulty;
  subjectId?: number;
}

interface HabitLog {
  id: number;
  habitId: number;
  startedAt: string;
}

interface DetailedHabit extends Habit {
  log?: HabitLog[];
}

type FilterRange = 7 | 14 | 21 | 30 | 'all';

const DIFFICULTY_OPTIONS: { label: string; value: HabitDifficulty; color: string }[] = [
  { label: 'Easy', value: 'LOW', color: 'text-emerald-500' },
  { label: 'Medium', value: 'MID', color: 'text-amber-500' },
  { label: 'Hard', value: 'HIGH', color: 'text-rose-500' },
];

const FILTER_OPTIONS: { label: string; value: FilterRange }[] = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '21 Days', value: 21 },
  { label: '30 Days', value: 30 },
  { label: 'All Time', value: 'all' },
];

function HabitCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex justify-between mb-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-sm" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function HabitsPage() {
  const { user } = useAuthStore();
  const { data: dashboardData, isLoading: dashboardLoading } = useHabitDashboard();

  const [filterRange, setFilterRange] = useState<FilterRange>(21);

  // Build from date based on filter
  const fromDateString = useMemo(() => {
    if (filterRange === 'all') return new Date(2020, 0, 1).toISOString();
    const d = new Date();
    d.setDate(d.getDate() - (filterRange - 1));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [filterRange]);

  const { data: habitsWithLogs } = useHabitsWithLogs(fromDateString);
  const { data: subjects } = useSubjects();

  const toggleHabit = useToggleHabitCompletion();
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();
  const updateHabit = useUpdateHabit();

  // Add habit form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('none');
  const [selectedDifficulty, setSelectedDifficulty] = useState<HabitDifficulty>('MID');

  // Edit habit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState<string>('none');
  const [editDifficulty, setEditDifficulty] = useState<HabitDifficulty>('MID');

  const habits = dashboardData?.habits || [];
  const todayStats = dashboardData?.todayStats || [];
  const completedHabitIds = new Set(todayStats.map((log: HabitLog) => log.habitId));

  useHabitRewards(completedHabitIds.size);

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) return;

    if (habits.length >= 6) {
      toast.error('You can only track up to 6 habits at a time.');
      return;
    }

    createHabit.mutate(
      {
        name: newTaskTitle.trim(),
        difficulty: selectedDifficulty,
        subjectId: selectedSubject !== 'none' ? parseInt(selectedSubject) : undefined,
      },
      {
        onSuccess: () => {
          setNewTaskTitle('');
          setSelectedSubject('none');
          setSelectedDifficulty('MID');
          toast.success('Habit added');
        },
        onError: () => toast.error('Failed to add habit'),
      },
    );
  };

  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit);
    setEditName(habit.name);
    setEditSubject(habit.subjectId ? String(habit.subjectId) : 'none');
    setEditDifficulty(habit.difficulty || 'MID');
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit || !editName.trim()) return;

    updateHabit.mutate(
      {
        id: editingHabit.id,
        name: editName.trim(),
        difficulty: editDifficulty,
        subjectId: editSubject !== 'none' ? parseInt(editSubject) : null,
      },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          setEditingHabit(null);
          toast.success('Habit updated');
        },
        onError: () => toast.error('Failed to update habit'),
      },
    );
  };

  // Build the days array based on filter
  const daysArray = useMemo(() => {
    if (filterRange === 'all') {
      // Find earliest log date
      const allDates: string[] = [];
      habitsWithLogs?.forEach((h: DetailedHabit) => {
        h.log?.forEach((l: HabitLog) => {
          allDates.push(new Date(l.startedAt).toISOString().split('T')[0]);
        });
      });
      if (allDates.length === 0) {
        // fallback 21 days
        const arr = [];
        for (let i = 20; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          arr.push(d.toISOString().split('T')[0]);
        }
        return arr;
      }
      const earliest = allDates.sort()[0];
      const arr = [];
      let cur = new Date(earliest);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      while (cur <= today) {
        arr.push(cur.toISOString().split('T')[0]);
        cur = new Date(cur);
        cur.setDate(cur.getDate() + 1);
      }
      return arr;
    }
    const arr = [];
    for (let i = filterRange - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().split('T')[0]);
    }
    return arr;
  }, [filterRange, habitsWithLogs]);

  const getDifficultyBadge = (difficulty?: HabitDifficulty) => {
    const opt = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty);
    if (!opt) return null;
    return (
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${opt.color}`}>
        {opt.label}
      </span>
    );
  };

  // Grid cols for heatmap based on number of days
  const gridCols =
    daysArray.length <= 7
      ? 'grid-cols-7'
      : daysArray.length <= 14
        ? 'grid-cols-7'
        : daysArray.length <= 21
          ? 'grid-cols-7'
          : daysArray.length <= 30
            ? 'grid-cols-6'
            : 'grid-cols-7';

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/20 p-3 rounded-xl text-primary">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Behavior Tracking</h1>
          <p className="text-muted-foreground">
            Monitor your habit cycles and maintain your perfect days.
          </p>
        </div>
        {completedHabitIds.size >= 4 && (
          <div className="ml-auto bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-in fade-in zoom-in">
            <Flame className="h-4 w-4" />
            <span>Perfect Day!</span>
          </div>
        )}
      </div>

      {/* Add Habit Form */}
      <form onSubmit={handleAddHabit} className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          className="flex-1 bg-background border-border/60 rounded-xl h-12 px-4 shadow-sm"
          placeholder="Install a new habit..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
        <Select
          value={selectedDifficulty}
          onValueChange={(v) => setSelectedDifficulty(v as HabitDifficulty)}
        >
          <SelectTrigger className="w-[140px] h-12 rounded-xl">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className={opt.color}>{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[160px] h-12 rounded-xl">
            <SelectValue placeholder="Link Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Subject</SelectItem>
            {subjects?.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          disabled={!newTaskTitle.trim() || createHabit.isPending || habits.length >= 6}
          className="h-12 px-6 rounded-xl shrink-0"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add ({habits.length}/6)
        </Button>
      </form>

      {/* Filter Options */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground font-medium mr-1">Heatmap:</span>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterRange(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                filterRange === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardLoading ? (
          <>
            <HabitCardSkeleton />
            <HabitCardSkeleton />
            <HabitCardSkeleton />
          </>
        ) : habits.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
            <Calendar className="h-12 w-12 mb-4 opacity-20" />
            <p>Your habit tracker is empty.</p>
            <p className="text-sm">Add up to 6 habits above to begin your journey.</p>
          </div>
        ) : (
          habits.map((habit: Habit) => {
            const isCompletedToday = completedHabitIds.has(habit.id);
            const detailedHabit = habitsWithLogs?.find((h: DetailedHabit) => h.id === habit.id);
            const completionDates = new Set(
              (detailedHabit as DetailedHabit)?.log?.map(
                (l: HabitLog) => new Date(l.startedAt).toISOString().split('T')[0],
              ) || [],
            );

            if (isCompletedToday) completionDates.add(new Date().toISOString().split('T')[0]);

            const linkedSubject = subjects?.find((s) => s.id === habit.subjectId);

            return (
              <Card
                key={habit.id}
                className={`transition-all group ${isCompletedToday ? 'border-primary/50 bg-primary/5' : 'bg-background border-border/40'} flex flex-col`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                  <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-lg leading-tight">{habit.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getDifficultyBadge(habit.difficulty)}
                      {linkedSubject && (
                        <>
                          {habit.difficulty && (
                            <span className="text-muted-foreground/40 text-[10px]">·</span>
                          )}
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {linkedSubject.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Edit button - visible on hover */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(habit)}
                      className="text-muted-foreground hover:text-foreground h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit Habit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Checkbox
                      checked={isCompletedToday}
                      onCheckedChange={() => toggleHabit.mutate(habit.id)}
                      className="h-5 w-5 rounded-md"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteHabit.mutate(habit.id)}
                      className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      title="Delete Habit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-xs text-muted-foreground mb-2 flex justify-between font-medium">
                    <span>
                      {filterRange === 'all'
                        ? 'All Time'
                        : `Last ${filterRange === 21 ? '21' : filterRange} Days`}
                    </span>
                    <span>
                      {completionDates.size} /{' '}
                      {filterRange === 'all' ? daysArray.length : filterRange}
                    </span>
                  </div>
                  <div className={`grid ${gridCols} gap-1`}>
                    {daysArray.map((dateStr, i) => {
                      const done = completionDates.has(dateStr);
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      return (
                        <div
                          key={i}
                          title={dateStr}
                          className={`aspect-square rounded-sm transition-colors ${
                            done ? 'bg-primary' : 'bg-muted/40'
                          } ${isToday && !done ? 'border-2 border-primary/40' : ''}`}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Habit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Habit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-5 mt-2">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Habit Name
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Habit name"
                required
                className="bg-muted/30 border-muted-foreground/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Difficulty
              </Label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditDifficulty(opt.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      editDifficulty === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className={editDifficulty === opt.value ? '' : opt.color}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Linked Subject
              </Label>
              <Select value={editSubject} onValueChange={setEditSubject}>
                <SelectTrigger className="bg-muted/30 border-muted-foreground/20">
                  <SelectValue placeholder="Link to subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Subject</SelectItem>
                  {subjects?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateHabit.isPending || !editName.trim()}
                className="rounded-xl px-8"
              >
                {updateHabit.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
