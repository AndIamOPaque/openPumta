'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTimerStore } from '@/store/useTimerStore';
import { ConvertSecsToTimer } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Download,
  Database,
  Settings as SettingsIcon,
  Clock,
  Check,
  Palette,
  Timer,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#f97316', // Orange
  '#ef4444', // Red
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#71717a', // Zinc
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TimeInputGroupProps {
  label: string;
  prefix: string;
  defaultVal: { hours: number; minutes: number; seconds: number };
}

function TimeInputGroup({ label, prefix, defaultVal }: TimeInputGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-1 p-2 rounded-lg bg-muted/30 border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all w-fit">
        <Input
          name={`${prefix}Hr`}
          type="number"
          min={0}
          defaultValue={defaultVal.hours}
          className="w-14 h-9 border-0 bg-transparent text-center text-base focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
          placeholder="00"
        />
        <span className="text-muted-foreground font-semibold text-lg">:</span>
        <Input
          name={`${prefix}Min`}
          type="number"
          min={0}
          max={59}
          defaultValue={defaultVal.minutes}
          className="w-14 h-9 border-0 bg-transparent text-center text-base focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
          placeholder="00"
        />
        <span className="text-muted-foreground font-semibold text-lg">:</span>
        <Input
          name={`${prefix}Sec`}
          type="number"
          min={0}
          max={59}
          defaultValue={defaultVal.seconds}
          className="w-14 h-9 border-0 bg-transparent text-center text-base focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
          placeholder="00"
        />
      </div>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex flex-wrap gap-3">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="group relative h-8 w-8 rounded-full border border-black/10 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
            style={{ backgroundColor: color }}
          >
            {value === color && (
              <Check className="h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
            )}
            <span className="sr-only">Select color {color}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuthStore();
  const store = useTimerStore();

  const [isSaving, setIsSaving] = useState(false);
  const [workColor, setWorkColor] = useState(store.workColor);
  const [shortColor, setShortColor] = useState(store.shortBreakColor);
  const [longColor, setLongColor] = useState(store.longBreakColor);

  // Keep color state in sync if store changes externally
  useEffect(() => {
    setWorkColor(store.workColor);
    setShortColor(store.shortBreakColor);
    setLongColor(store.longBreakColor);
  }, [store.workColor, store.shortBreakColor, store.longBreakColor]);

  const work = ConvertSecsToTimer({ workSecs: Math.floor(store.settings.workDuration / 1000) });
  const shortBreak = ConvertSecsToTimer({
    workSecs: Math.floor(store.settings.shortBreakDuration / 1000),
  });
  const longBreak = ConvertSecsToTimer({
    workSecs: Math.floor(store.settings.longBreakDuration / 1000),
  });

  const handleTimerSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData(e.currentTarget);

      const getMs = (prefix: string) => {
        const h = Number(formData.get(`${prefix}Hr`)) || 0;
        const m = Number(formData.get(`${prefix}Min`)) || 0;
        const s = Number(formData.get(`${prefix}Sec`)) || 0;
        return (h * 3600 + m * 60 + s) * 1000;
      };

      const newWork = getMs('work');
      const newShort = getMs('short');
      const newLong = getMs('long');

      if (newWork < 60000) {
        toast.error('Work duration must be at least 1 minute');
        return;
      }

      store.setSettings({
        workDuration: newWork,
        shortBreakDuration: newShort,
        longBreakDuration: newLong,
      });
      store.setColors(workColor, shortColor, longColor);

      toast.success('Timer settings saved', {
        description: `${Math.floor(newWork / 60000)}m focus / ${Math.floor(newShort / 60000)}m break`,
      });
    } catch (_err) {
      toast.error('Failed to save timer settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: 'json' | 'txt') => {
    if (!user) return;

    try {
      const response = await api.get(`/export/user/${user.id}?format=${format}`, {
        responseType: 'blob',
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openpumta-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Data exported as ${format.toUpperCase()} successfully`);
    } catch (_err) {
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/20 p-3 rounded-xl text-primary">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences.</p>
        </div>
      </div>

      <form onSubmit={handleTimerSave} className="grid gap-6">
        {/* ── General ─────────────────────────────────────────── */}
        <Card className="bg-background border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>General</CardTitle>
            </div>
            <CardDescription>Configure how the timer behaves and what it displays.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="mode-toggle" className="text-sm font-medium">
                  Pomodoro Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cycle between structured work and rest intervals.
                </p>
              </div>
              <Switch
                id="mode-toggle"
                checked={store.mode === 'pomodoro'}
                onCheckedChange={(checked) => store.setMode(checked ? 'pomodoro' : 'stopwatch')}
              />
            </div>
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="progress-toggle" className="text-sm font-medium">
                  Show Progress Bar
                </Label>
                <p className="text-xs text-muted-foreground">
                  Display daily goal progress below the timer.
                </p>
              </div>
              <Switch
                id="progress-toggle"
                checked={store.showProgressBar}
                onCheckedChange={store.setShowProgressBar}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Automation ──────────────────────────────────────── */}
        <Card className="bg-background border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Automation</CardTitle>
            </div>
            <CardDescription>
              Control automatic transitions between work and break sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-break-toggle" className="text-sm font-medium">
                  Auto-start Breaks
                </Label>
                <p className="text-xs text-muted-foreground">
                  Start break timer automatically after work session.
                </p>
              </div>
              <Switch
                id="auto-break-toggle"
                checked={store.settings.autoStartBreaks}
                onCheckedChange={(checked) => store.setSettings({ autoStartBreaks: checked })}
              />
            </div>
            <Separator className="bg-border/40" />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-work-toggle" className="text-sm font-medium">
                  Auto-start Work
                </Label>
                <p className="text-xs text-muted-foreground">
                  Start next work session automatically after break.
                </p>
              </div>
              <Switch
                id="auto-work-toggle"
                checked={store.settings.autoStartWork}
                onCheckedChange={(checked) => store.setSettings({ autoStartWork: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Durations ───────────────────────────────────────── */}
        <Card className="bg-background border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              <CardTitle>Durations</CardTitle>
            </div>
            <CardDescription>
              Set the length of each work and break interval (HH : MM : SS).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <TimeInputGroup label="Work Session" prefix="work" defaultVal={work} />
              <TimeInputGroup label="Short Break" prefix="short" defaultVal={shortBreak} />
              <TimeInputGroup label="Long Break" prefix="long" defaultVal={longBreak} />
            </div>
          </CardContent>
        </Card>

        {/* ── Theme Colors ─────────────────────────────────────── */}
        <Card className="bg-background border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Theme Colors</CardTitle>
            </div>
            <CardDescription>Choose an accent color for each timer phase.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ColorPicker label="Work Phase" value={workColor} onChange={setWorkColor} />
              <ColorPicker label="Short Break" value={shortColor} onChange={setShortColor} />
              <ColorPicker label="Long Break" value={longColor} onChange={setLongColor} />
            </div>
          </CardContent>
        </Card>

        {/* ── Save Button ──────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl px-8 shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            {isSaving ? 'Saving...' : 'Save Timer Settings'}
          </Button>
        </div>

        {/* ── Data Export (bottom) ─────────────────────────────── */}
        <Card className="bg-background border-border/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Data Export</CardTitle>
            </div>
            <CardDescription>
              Download a copy of all your Openpumta data, including subjects, habits, tasks, and
              daily ratings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              onClick={() => handleExport('json')}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export as JSON
            </Button>
            <Button
              type="button"
              onClick={() => handleExport('txt')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export as Text
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
