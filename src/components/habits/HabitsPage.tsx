'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, MoreHorizontal, Plus, X } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { WeeklyGrid } from './WeeklyGrid';
import { api, type HabitUpsertPayload, type HabitsOverview } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';
import { APP_TODAY, addDays, formatRangeLabel, parseIsoDate, toIsoDate } from '@/lib/date';
import { useSettingsStore } from '@/store/settings';

interface HabitsPageProps {
  onSettings: () => void;
}

type HabitMode = 'good' | 'bad';
type CadenceType = 'daily' | 'weekly-count' | 'trigger' | 'time-of-day' | 'custom';
type HabitTrackingType = 'boolean' | 'numeric' | 'scale';
type DisplayHabit = HabitsOverview['habits'][number];

const BAD_HABIT_IDS = new Set(['quit-snus', 'alcohol', 'weed', 'masturbate']);
const BAD_HABIT_ORDER = ['quit-snus', 'alcohol', 'weed', 'masturbate', 'smoke-limit'] as const;
const HOLD_DURATION_MS = 2000;
const QUANTITY_DEFAULTS: Record<string, number> = {
  'quit-snus': 1,
  alcohol: 2,
  weed: 0.5,
  masturbate: 1,
  'smoke-limit': 0.2,
};
const UNIT_PRESET_DEFAULTS: Record<string, number[]> = {
  none: [1, 2, 3, 5],
  incidents: [1, 2, 3, 5],
  count: [1, 2, 3, 5],
  units: [1, 2, 4, 6],
  g: [0.25, 0.5, 1, 2],
  mg: [100, 250, 500, 1000],
  pouches: [1, 2, 4, 6],
  pieces: [1, 2, 3, 5],
};
const BAD_HABIT_UNIT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'units', label: 'Units' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'mg', label: 'Milligrams (mg)' },
  { value: 'count', label: 'Count' },
  { value: 'incidents', label: 'Instances' },
  { value: 'pouches', label: 'Pouches' },
  { value: 'pieces', label: 'Pieces' },
] as const;
const GOOD_HABIT_EMOJIS = ['🏃', '🎾', '⚽', '🧠', '📚', '✍️', '🍳', '🧼', '🌙', '⏰', '🎧', '🤝'] as const;
const BAD_HABIT_EMOJIS = ['🚭', '🍺', '🍃', '⚠️', '💤', '🍬', '📵', '🃏', '💸', '😵'] as const;
const HABIT_SENTENCES: Record<string, string> = {
  'racket-sport': 'I will play racket sports three times a week because I am an athlete.',
  'team-sport': 'I will play team sports once a week because I perform better when I compete with other people.',
  running: 'I will run after dinner because I want to be healthy.',
  'passive-exercise': 'I will do passive exercise once a week because easy movement keeps my energy from collapsing.',
  cad: 'I will practice CAD twice a week because I want to keep building useful technical skills.',
  'computer-science': 'I will study computer science three times a week because I want to become exceptional at building things.',
  audiobooks: 'I will listen to audiobooks during low-focus moments because I want to keep learning even when I am tired.',
  'watch-episodes': 'I will watch a couple of episodes after my essentials are done because rest is better when it is chosen.',
  'listen-music': 'I will listen to music when I need to shift my mood or focus because music helps me regulate my state.',
  facetime: 'I will FaceTime people after work or between plans because I want to keep close relationships active.',
  irl: 'I will see someone in real life once a week because real connection matters more than passive contact.',
  post: 'I will post after getting out of the shower because I want to keep in contact with my friends.',
  cook: 'I will cook when I plan a home evening because feeding myself properly makes everything easier.',
  clean: 'I will clean my space every two weeks because a cleaner space makes me calmer and more capable.',
  journal: 'I will journal before going to sleep because I want to master my mind.',
  'plan-week': 'I will plan the week on Sunday evening because I want the week to feel deliberate, not reactive.',
  'sleep-before-12': 'I will go to sleep before 12 because I want to live longer and recover better.',
  'wake-7am': 'I will wake up at 7am because I want my mornings to have structure.',
  'quit-snus': 'I will stay off snus because I do not want nicotine deciding my state.',
  alcohol: 'I will stay off alcohol because I do not want it blunting my judgment and recovery.',
  weed: 'I will stay off weed because I do not want it fogging my drive and attention.',
  masturbate: 'I will avoid masturbating when I am escaping discomfort because I want my urges to feel deliberate, not automatic.',
};

const HABIT_DEFAULTS: Record<string, { action: string; when: string; why: string; cadenceType: CadenceType; targetCount?: number; mode: HabitMode }> = {
  'racket-sport': { action: 'play racket sports', when: 'three times a week', why: 'I am an athlete', cadenceType: 'weekly-count', targetCount: 3, mode: 'good' },
  'team-sport': { action: 'play team sports', when: 'once a week', why: 'I perform better when I compete with other people', cadenceType: 'weekly-count', targetCount: 1, mode: 'good' },
  running: { action: 'run', when: 'after dinner', why: 'I want to be healthy', cadenceType: 'trigger', mode: 'good' },
  'passive-exercise': { action: 'do passive exercise', when: 'once a week', why: 'easy movement keeps my energy from collapsing', cadenceType: 'weekly-count', targetCount: 1, mode: 'good' },
  cad: { action: 'practice CAD', when: 'twice a week', why: 'I want to keep building useful technical skills', cadenceType: 'weekly-count', targetCount: 2, mode: 'good' },
  'computer-science': { action: 'study computer science', when: 'three times a week', why: 'I want to become exceptional at building things', cadenceType: 'weekly-count', targetCount: 3, mode: 'good' },
  audiobooks: { action: 'listen to audiobooks', when: 'during low-focus moments', why: 'I want to keep learning even when I am tired', cadenceType: 'custom', mode: 'good' },
  'watch-episodes': { action: 'watch a couple of episodes', when: 'after my essentials are done', why: 'rest is better when it is chosen', cadenceType: 'trigger', mode: 'good' },
  'listen-music': { action: 'listen to music', when: 'when I need to shift my mood or focus', why: 'music helps me regulate my state', cadenceType: 'custom', mode: 'good' },
  facetime: { action: 'FaceTime people', when: 'after work or between plans', why: 'I want to keep close relationships active', cadenceType: 'custom', mode: 'good' },
  irl: { action: 'see someone in real life', when: 'once a week', why: 'real connection matters more than passive contact', cadenceType: 'weekly-count', targetCount: 1, mode: 'good' },
  post: { action: 'post', when: 'after getting out of the shower', why: 'I want to keep in contact with my friends', cadenceType: 'trigger', mode: 'good' },
  cook: { action: 'cook', when: 'when I plan a home evening', why: 'feeding myself properly makes everything easier', cadenceType: 'custom', mode: 'good' },
  clean: { action: 'clean my space', when: 'every two weeks', why: 'a cleaner space makes me calmer and more capable', cadenceType: 'custom', mode: 'good' },
  journal: { action: 'journal', when: 'before going to sleep', why: 'I want to master my mind', cadenceType: 'time-of-day', mode: 'good' },
  'plan-week': { action: 'plan the week', when: 'on Sunday evening', why: 'I want the week to feel deliberate, not reactive', cadenceType: 'time-of-day', mode: 'good' },
  'sleep-before-12': { action: 'go to sleep before 12', when: 'every day', why: 'I want to live longer and recover better', cadenceType: 'daily', targetCount: 7, mode: 'good' },
  'wake-7am': { action: 'wake up at 7am', when: 'every day', why: 'I want my mornings to have structure', cadenceType: 'daily', targetCount: 7, mode: 'good' },
  'quit-snus': { action: 'stay off snus', when: 'whenever the urge hits', why: 'I do not want nicotine deciding my state', cadenceType: 'custom', targetCount: 0, mode: 'bad' },
  alcohol: { action: 'stay off alcohol', when: 'whenever the option comes up', why: 'I do not want it blunting my judgment and recovery', cadenceType: 'custom', targetCount: 0, mode: 'bad' },
  weed: { action: 'stay off weed', when: 'whenever the urge hits', why: 'I do not want it fogging my drive and attention', cadenceType: 'custom', targetCount: 0, mode: 'bad' },
  masturbate: { action: 'avoid masturbating', when: 'when I am escaping discomfort', why: 'I want my urges to feel deliberate, not automatic', cadenceType: 'trigger', targetCount: 0, mode: 'bad' },
};

function startOfWeek(value: string) {
  const date = parseIsoDate(value);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  return toIsoDate(date);
}

function isCompleted(value: boolean | number | null | undefined) {
  if (value === undefined || value === null) return false;
  return typeof value === 'boolean' ? value : Number(value) > 0;
}

function numericValue(value: boolean | number | null | undefined) {
  if (value === undefined || value === null || typeof value === 'boolean') return 0;
  return Number(value) || 0;
}

function formatHabitAmount(value: number, unit?: string | null) {
  if (!unit) return `${value}`;
  if (unit === 'none') return `${value}`;
  if (unit === 'g') return `${value.toFixed(value >= 1 ? 1 : 2)}g`;
  if (unit === 'mg') return `${value} mg`;
  if (unit === 'count') return `${value} count`;
  if (unit === 'units') return `${value} units`;
  if (unit === 'pouches') return `${value} pouches`;
  if (unit === 'pieces') return `${value} pieces`;
  if (unit === 'incidents') return `${value} times`;
  return `${value} ${unit}`;
}

function buildWhenText(cadenceType: CadenceType, whenInput: string, targetCount: number) {
  if (cadenceType === 'daily') return 'every day';
  if (cadenceType === 'weekly-count') return `${Math.max(1, targetCount)} ${Math.max(1, targetCount) === 1 ? 'time' : 'times'} a week`;
  return whenInput.trim();
}

function buildHabitSentence(action: string, whenText: string, why: string) {
  return `I will ${action.trim()} ${whenText.trim()} because ${why.trim()}.`;
}

function getQuantityPresets(unit?: string | null, habitId?: string) {
  if (unit && UNIT_PRESET_DEFAULTS[unit]) return UNIT_PRESET_DEFAULTS[unit];
  if (habitId && QUANTITY_DEFAULTS[habitId] !== undefined) {
    const base = QUANTITY_DEFAULTS[habitId];
    return [base, base * 2, base * 3, base * 4];
  }
  return [1, 2, 3, 5];
}

function getHabitMode(habit: DisplayHabit): HabitMode {
  if (habit.habitMode === 'bad' || BAD_HABIT_IDS.has(habit.id)) return 'bad';
  return 'good';
}

function getHabitSentence(habit: DisplayHabit) {
  if (habit.actionText && habit.whenText && habit.whyText) {
    return buildHabitSentence(habit.actionText, habit.whenText, habit.whyText);
  }
  return HABIT_SENTENCES[habit.id] ?? habit.name;
}

function getHabitTargetCount(habit: DisplayHabit) {
  if (getHabitMode(habit) === 'bad') return habit.targetCount ?? 0;
  if (habit.cadenceType === 'daily') return 7;
  if (habit.cadenceType === 'weekly-count') return habit.targetCount ?? 1;
  return habit.targetCount ?? 1;
}

function getHabitDraftValues(habit: DisplayHabit) {
  const fallback = HABIT_DEFAULTS[habit.id];
  return {
    action: habit.actionText ?? fallback?.action ?? habit.name,
    when: habit.whenText ?? fallback?.when ?? habit.frequency,
    why: habit.whyText ?? fallback?.why ?? 'this matters to who I am becoming',
    cadenceType: (habit.cadenceType as CadenceType | undefined) ?? fallback?.cadenceType ?? 'custom',
    targetCount: habit.targetCount ?? fallback?.targetCount ?? 1,
    mode: (habit.habitMode as HabitMode | undefined) ?? fallback?.mode ?? getHabitMode(habit),
    trackingType: (habit.type as HabitTrackingType | undefined) ?? (getHabitMode(habit) === 'bad' ? 'numeric' : 'boolean'),
    unit: habit.unit ?? (getHabitMode(habit) === 'bad' ? 'none' : ''),
  };
}

function buildHabitPayload(args: {
  action: string;
  whenInput: string;
  why: string;
  cadenceType: CadenceType;
  targetCount: number;
  mode: HabitMode;
  trackingType: HabitTrackingType;
  unit: string;
  categoryIcon: string;
}): HabitUpsertPayload {
  const whenText = buildWhenText(args.cadenceType, args.whenInput, args.targetCount);
  return {
    actionText: args.action.trim(),
    whenText,
    whyText: args.why.trim(),
    habitMode: args.mode,
    cadenceType: args.cadenceType,
    targetCount: args.cadenceType === 'weekly-count' || args.cadenceType === 'daily' ? args.targetCount : 1,
    category: 'Custom',
    categoryIcon: args.categoryIcon,
    type: args.trackingType,
    unit: args.mode === 'bad' && args.trackingType === 'numeric' ? (args.unit.trim() || 'none') : null,
    maxValue: null,
  };
}

export function HabitsPage({ onSettings }: HabitsPageProps) {
  const dataMode = useSettingsStore((state) => state.dataMode);
  const [showEditor, setShowEditor] = useState(false);
  const [editingHabit, setEditingHabit] = useState<DisplayHabit | null>(null);
  const [draftAction, setDraftAction] = useState('');
  const [draftWhenInput, setDraftWhenInput] = useState('');
  const [draftWhy, setDraftWhy] = useState('');
  const [draftMode, setDraftMode] = useState<HabitMode>('good');
  const [draftCadenceType, setDraftCadenceType] = useState<CadenceType>('custom');
  const [draftTargetCount, setDraftTargetCount] = useState(1);
  const [draftTrackingType, setDraftTrackingType] = useState<HabitTrackingType>('boolean');
  const [draftUnit, setDraftUnit] = useState('none');
  const [draftCategoryIcon, setDraftCategoryIcon] = useState('✨');
  const [habitMode, setHabitMode] = useState<HabitMode>('good');
  const [holdingHabitId, setHoldingHabitId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [justCompletedHabitId, setJustCompletedHabitId] = useState<string | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(APP_TODAY));
  const [quantityHabit, setQuantityHabit] = useState<DisplayHabit | null>(null);
  const [quantityValue, setQuantityValue] = useState('1');
  const [editorError, setEditorError] = useState<string | null>(null);
  const holdFrameRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const holdCompleteRef = useRef(false);
  const { data, isLoading, error, setData, refetch } = useApiQuery(api.getHabits, [dataMode]);
  const habits = useMemo<DisplayHabit[]>(() => data?.habits ?? [], [data?.habits]);
  const availableDates = useMemo(() => data?.history.map((day) => day.date) ?? [], [data?.history]);
  const todayKey = APP_TODAY;

  useEffect(() => () => {
    if (holdFrameRef.current) cancelAnimationFrame(holdFrameRef.current);
  }, []);

  useEffect(() => {
    if (draftMode === 'good') {
      setDraftTrackingType('boolean');
      setDraftUnit('');
      if (draftCategoryIcon === '🚫') setDraftCategoryIcon('✨');
      return;
    }
    setDraftTrackingType('numeric');
    if (!draftUnit.trim()) {
      setDraftUnit('none');
    }
    if (draftCategoryIcon === '✨') setDraftCategoryIcon('🚫');
  }, [draftCategoryIcon, draftMode, draftUnit]);

  useEffect(() => {
    const currentWeekStart = startOfWeek(todayKey);
    const latestHistoryDate = availableDates[availableDates.length - 1] ?? todayKey;
    const earliestWeekStart = startOfWeek(availableDates[0] ?? todayKey);
    const latestWeekStart = startOfWeek(latestHistoryDate > todayKey ? todayKey : latestHistoryDate);

    setSelectedWeekStart((current) => {
      if (current < earliestWeekStart) return earliestWeekStart;
      if (current > currentWeekStart) return currentWeekStart;
      if (current > latestWeekStart && latestWeekStart <= currentWeekStart) return latestWeekStart;
      return current;
    });
  }, [availableDates, todayKey]);

  const currentWeekStart = useMemo(() => startOfWeek(todayKey), [todayKey]);
  const earliestWeekStart = useMemo(() => startOfWeek(availableDates[0] ?? todayKey), [availableDates, todayKey]);
  const weekEnd = useMemo(() => addDays(selectedWeekStart, 6), [selectedWeekStart]);
  const weekLabel = useMemo(() => formatRangeLabel(selectedWeekStart, weekEnd), [selectedWeekStart, weekEnd]);
  const todayValues = useMemo(() => data?.todayCompletions ?? {}, [data?.todayCompletions]);
  const visibleHabits = useMemo(
    () => {
      const filtered = habits.filter((habit) => getHabitMode(habit) === habitMode && (habitMode === 'bad' ? habit.type === 'numeric' : habit.type === 'boolean'));
      if (habitMode !== 'bad') return filtered;
      const order = new Map<string, number>(BAD_HABIT_ORDER.map((id, index) => [id, index]));
      return [...filtered].sort((a, b) => {
        const aRank = order.get(a.id) ?? 999;
        const bRank = order.get(b.id) ?? 999;
        return aRank - bRank;
      });
    },
    [habitMode, habits],
  );
  const completedCount = visibleHabits.filter((habit) => isCompleted(todayValues[habit.id])).length;
  const loggedBadHabitCount = visibleHabits.filter((habit) => numericValue(todayValues[habit.id]) > 0).length;
  const showEmptyRealState = dataMode === 'real-only' && !isLoading && availableDates.length === 0;
  const canGoForwardWeek = selectedWeekStart < currentWeekStart;
  const canGoBackWeek = selectedWeekStart > earliestWeekStart;

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(selectedWeekStart, index)), [selectedWeekStart]);
  const weekHistoryMap = useMemo(() => new Map((data?.history ?? []).map((day) => [day.date, day.values])), [data?.history]);
  const selectedWeekStats = useMemo(
    () => visibleHabits.map((habit) => {
      const actual = weekDates.reduce((sum, date) => {
        const value = weekHistoryMap.get(date)?.[habit.id];
        return sum + (getHabitMode(habit) === 'bad' ? numericValue(value) : (isCompleted(value) ? 1 : 0));
      }, 0);
      const target = getHabitTargetCount(habit);
      const streak = data?.streaks?.[habit.id]?.streak ?? 0;
      return { habit, actual, target, streak, ratio: target ? actual / target : 0 };
    }),
    [data?.streaks, visibleHabits, weekDates, weekHistoryMap],
  );

  const reviewCards = useMemo(() => {
    if (!selectedWeekStats.length) return [];
    if (habitMode === 'bad') {
      const lowest = [...selectedWeekStats].sort((a, b) => a.actual - b.actual)[0];
      const highest = [...selectedWeekStats].sort((a, b) => b.actual - a.actual)[0];
      const suggested = highest ?? lowest;
      return [
        lowest ? { label: 'Lowest', text: getHabitSentence(lowest.habit), subtext: `${formatHabitAmount(lowest.actual, lowest.habit.unit)} this week` } : null,
        highest ? { label: 'Most frequent', text: getHabitSentence(highest.habit), subtext: `${formatHabitAmount(highest.actual, highest.habit.unit)} this week` } : null,
        suggested ? {
          label: 'Suggestion',
          text: suggested.actual > 0
            ? 'Make the friction visible: log the trigger, not just the slip.'
            : 'Keep the guardrails that are already making this one easier to avoid.',
          subtext: getHabitSentence(suggested.habit),
        } : null,
      ].filter(Boolean) as Array<{ label: string; text: string; subtext: string }>;
    }
    const strongest = [...selectedWeekStats].sort((a, b) => b.ratio - a.ratio)[0];
    const slipping = [...selectedWeekStats].filter((item) => item.actual < item.target).sort((a, b) => a.ratio - b.ratio)[0];
    const suggested = slipping ?? strongest;
    return [
      strongest ? { label: 'Strongest', text: getHabitSentence(strongest.habit), subtext: `${strongest.actual}/${strongest.target} this week` } : null,
      slipping ? { label: 'Slipping', text: getHabitSentence(slipping.habit), subtext: `${slipping.actual}/${slipping.target} this week` } : null,
      suggested ? {
        label: 'Suggestion',
        text: suggested.habit.cadenceType === 'trigger'
          ? 'Attach the habit to a stronger cue this week.'
          : suggested.habit.cadenceType === 'weekly-count'
            ? 'Spread the repetitions earlier through the week.'
            : 'Keep the habit tied to a specific moment, not a vague intention.',
        subtext: getHabitSentence(suggested.habit),
      } : null,
    ].filter(Boolean) as Array<{ label: string; text: string; subtext: string }>;
  }, [habitMode, selectedWeekStats]);

  function updateHistoryDay(
    history: NonNullable<HabitsOverview['history']>,
    habitId: string,
    value: boolean | number,
    targetDate: string,
  ) {
    const existing = history.find((day) => day.date === targetDate);
    if (existing) {
      return history.map((day) => day.date === targetDate ? { ...day, values: { ...day.values, [habitId]: value } } : day);
    }
    return [...history, { date: targetDate, values: { [habitId]: value } }];
  }

  async function setCompletion(habitId: string, value: boolean | number) {
    setData((current) => current ? {
      ...current,
      todayCompletions: { ...current.todayCompletions, [habitId]: value },
      history: updateHistoryDay(current.history, habitId, value, todayKey),
    } : current);
    setJustCompletedHabitId(habitId);
    window.setTimeout(() => setJustCompletedHabitId((current) => current === habitId ? null : current), 700);
    try {
      await api.saveHabitLog(habitId, value);
      await refetch();
    } catch {
      await refetch();
    }
  }

  function openQuantitySheet(habit: DisplayHabit) {
    const presets = getQuantityPresets(habit.unit, habit.id);
    const defaultValue = presets[0] ?? QUANTITY_DEFAULTS[habit.id] ?? 1;
    setQuantityHabit(habit);
    setQuantityValue(String(defaultValue));
  }

  async function saveQuantityLog() {
    if (!quantityHabit) return;
    const parsed = Number(quantityValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const nextValue = numericValue(todayValues[quantityHabit.id]) + parsed;
    await setCompletion(quantityHabit.id, nextValue);
    setQuantityHabit(null);
  }

  function stopHold() {
    if (holdFrameRef.current) {
      cancelAnimationFrame(holdFrameRef.current);
      holdFrameRef.current = null;
    }
    holdStartRef.current = null;
    holdCompleteRef.current = false;
    setHoldingHabitId(null);
    setHoldProgress(0);
  }

  function startHold(habitId: string) {
    stopHold();
    setHoldingHabitId(habitId);
    holdStartRef.current = performance.now();
    holdCompleteRef.current = false;

    const tick = (now: number) => {
      if (holdStartRef.current === null) return;
      const elapsed = now - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(progress);

      if (progress >= 1 && !holdCompleteRef.current) {
        holdCompleteRef.current = true;
        const habit = habits.find((entry) => entry.id === habitId);
        const nextValue = habit && getHabitMode(habit) === 'bad'
          ? numericValue(todayValues[habitId]) + 1
          : !isCompleted(todayValues[habitId]);
        void setCompletion(habitId, nextValue);
        window.setTimeout(stopHold, 120);
        return;
      }

      holdFrameRef.current = requestAnimationFrame(tick);
    };

    holdFrameRef.current = requestAnimationFrame(tick);
  }

  function openAddSheet() {
    setEditorError(null);
    setEditingHabit(null);
    setDraftAction('');
    setDraftWhenInput('');
    setDraftWhy('');
    setDraftMode(habitMode);
    setDraftCadenceType('custom');
    setDraftTargetCount(1);
    setDraftTrackingType(habitMode === 'bad' ? 'numeric' : 'boolean');
    setDraftUnit(habitMode === 'bad' ? 'none' : '');
    setDraftCategoryIcon(habitMode === 'bad' ? '🚫' : '✨');
    setShowEditor(true);
  }

  function openEditSheet(habit: DisplayHabit) {
    setEditorError(null);
    const draft = getHabitDraftValues(habit);
    setEditingHabit(habit);
    setDraftAction(draft.action);
    setDraftWhenInput(draft.cadenceType === 'weekly-count' || draft.cadenceType === 'daily' ? '' : draft.when);
    setDraftWhy(draft.why);
    setDraftMode(draft.mode);
    setDraftCadenceType(draft.cadenceType);
    setDraftTargetCount(draft.targetCount);
    setDraftTrackingType(draft.trackingType);
    setDraftUnit(draft.unit || (draft.mode === 'bad' ? 'none' : ''));
    setDraftCategoryIcon(habit.categoryIcon || (draft.mode === 'bad' ? '🚫' : '✨'));
    setShowEditor(true);
  }

  async function saveHabitDefinition() {
    setEditorError(null);
    const payload = buildHabitPayload({
      action: draftAction,
      whenInput: draftWhenInput,
      why: draftWhy,
      cadenceType: draftCadenceType,
      targetCount: draftTargetCount,
      mode: draftMode,
      trackingType: draftTrackingType,
      unit: draftUnit,
      categoryIcon: draftCategoryIcon,
    });
    if (!payload.actionText || !payload.whenText || !payload.whyText) return;
    try {
      if (editingHabit) {
        await api.updateHabit(editingHabit.id, payload);
      } else {
        await api.createHabit(payload);
      }
      setShowEditor(false);
      setEditingHabit(null);
      await refetch();
    } catch {
      setEditorError('Could not save this habit right now. Please try again.');
    }
  }

  async function deleteCurrentHabit() {
    if (!editingHabit) return;
    if (!window.confirm('Delete this habit from the active list? Past entries will stay in your history.')) return;
    setEditorError(null);
    try {
      await api.deleteHabit(editingHabit.id);
      setShowEditor(false);
      setEditingHabit(null);
      await refetch();
    } catch {
      setEditorError('Could not delete this habit right now. Please try again.');
    }
  }

  const editorPreview = useMemo(() => {
    if (!draftAction.trim() || !draftWhy.trim()) return null;
    const whenText = buildWhenText(draftCadenceType, draftWhenInput, draftTargetCount);
    if (!whenText.trim()) return null;
    return buildHabitSentence(draftAction, whenText, draftWhy);
  }, [draftAction, draftCadenceType, draftTargetCount, draftWhenInput, draftWhy]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        onBack={() => {}}
        onSettings={onSettings}
        rightElement={
          <button
            onClick={openAddSheet}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={16} color="#fff" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Habits</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Fast logging on top, behavior design underneath.</p>
        </div>

        {showEmptyRealState && (
          <RetryNotice
            message="No real habit history yet. You can still log today, and the streak calendar will fill out once real entries build up."
            onRetry={refetch}
            className="mx-4 mb-4 w-[calc(100%-2rem)]"
          />
        )}

        <div className="px-4 pb-4">
          <div className="rounded-[26px] p-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div className="flex rounded-[18px] p-1" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {(['good', 'bad'] as const).map((mode) => {
                const active = habitMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setHabitMode(mode)}
                    className="flex-1 rounded-[14px] px-4 py-3 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: active ? (mode === 'good' ? 'var(--color-primary)' : '#b42318') : 'transparent',
                      color: active ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {mode === 'good' ? 'Good habits' : 'Bad habits'}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {habitMode === 'bad'
                  ? `${loggedBadHabitCount}/${visibleHabits.length} bad habits logged today`
                  : `${completedCount}/${visibleHabits.length} logged today`}
              </span>
            </div>
          </div>
        </div>

        {reviewCards.length > 0 && (
          <div className="px-4 pb-4">
            <div className="grid gap-3 md:grid-cols-3">
              {reviewCards.map((card) => {
                const accent =
                  card.label === 'Strongest'
                    ? 'var(--color-primary)'
                    : card.label === 'Slipping'
                      ? '#b42318'
                      : '#2563eb';

                return (
                  <div
                    key={card.label}
                    className="rounded-[18px] px-4 py-3"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      boxShadow: `inset 4px 0 0 ${accent}`,
                    }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
                      {card.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug" style={{ color: 'var(--color-text)' }}>
                      {card.text}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                      {card.subtext}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-4 pb-4">
          {isLoading && (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-36 rounded-[24px] animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <RetryNotice onRetry={refetch} className="text-sm px-4 py-6 w-full" />
          )}

          {!isLoading && !error && (
            <>
              {visibleHabits.length === 0 ? (
                <div className="rounded-[24px] px-4 py-6 text-sm" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  No {habitMode} habits are set up yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {selectedWeekStats.map(({ habit, actual, target, streak }) => {
                    const done = isCompleted(todayValues[habit.id]);
                    const isHolding = holdingHabitId === habit.id;
                    const progress = isHolding ? holdProgress : 0;
                    const isBad = getHabitMode(habit) === 'bad';
                    const doneColor = isBad ? '#b42318' : 'var(--color-primary)';
                    const fillColor = isBad ? 'rgba(180, 35, 24, 0.2)' : 'rgba(82,183,136,0.22)';
                    const todayCount = numericValue(todayValues[habit.id]);
                    const weeklySummary = isBad ? `${formatHabitAmount(actual, habit.unit)} this week` : `${actual}/${target} this week`;
                    const secondarySummary = isBad ? `${formatHabitAmount(todayCount, habit.unit)} today` : `${streak} day streak`;

                    return (
                      <div
                        key={habit.id}
                        className="relative overflow-hidden rounded-[24px]"
                        style={{
                          backgroundColor: done ? fillColor : 'var(--color-surface-2)',
                          border: `1px solid ${done ? doneColor : 'var(--color-border)'}`,
                          boxShadow: justCompletedHabitId === habit.id ? `0 0 0 2px ${fillColor}` : 'none',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isBad) {
                              openQuantitySheet(habit);
                              return;
                            }
                          }}
                          onPointerDown={isBad ? undefined : () => startHold(habit.id)}
                          onPointerUp={isBad ? undefined : stopHold}
                          onPointerLeave={isBad ? undefined : stopHold}
                          onPointerCancel={isBad ? undefined : stopHold}
                          className="relative block min-h-[172px] w-full px-4 py-4 text-left active:scale-[0.99] transition-transform"
                        >
                          <div className="pointer-events-none absolute inset-0">
                            <motion.div
                              className="absolute inset-y-0 left-0"
                              animate={{ width: `${progress * 100}%` }}
                              transition={{ ease: 'linear', duration: 0.05 }}
                              style={{ backgroundColor: fillColor }}
                            />
                            {justCompletedHabitId === habit.id && (
                              <motion.div
                                className="absolute inset-0"
                                initial={{ opacity: 0.35, scale: 0.96 }}
                                animate={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.45, ease: 'easeOut' }}
                                style={{ backgroundColor: fillColor }}
                              />
                            )}
                          </div>
                          <div className="relative z-10 pr-8">
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-2xl">{habit.categoryIcon}</span>
                            </div>
                            <p className="mt-4 text-sm font-semibold leading-relaxed" style={{ color: 'var(--color-text)' }}>
                              {getHabitSentence(habit)}
                            </p>
                            <p className="mt-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {weeklySummary}
                              {' · '}
                              {secondarySummary}
                            </p>
                            {isBad && (
                              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#b42318' }}>
                                Tap to log amount
                              </p>
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditSheet(habit)}
                          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                        >
                          <MoreHorizontal size={16} style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {!showEmptyRealState && (
          <div className="px-4 pb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Habit calendar
                </h2>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {weekLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWeekStart((current) => addDays(current, -7))}
                  disabled={!canGoBackWeek}
                  className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <ChevronLeft size={16} style={{ color: 'var(--color-text)' }} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeekStart((current) => addDays(current, 7))}
                  disabled={!canGoForwardWeek}
                  className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <ChevronRight size={16} style={{ color: 'var(--color-text)' }} />
                </button>
              </div>
            </div>
            <div className="rounded-[26px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <WeeklyGrid habits={visibleHabits} history={data?.history ?? []} weekStartDate={selectedWeekStart} />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showEditor && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditor(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
              style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                  {editingHabit ? 'Edit Habit' : 'Add New Habit'}
                </h3>
                <button onClick={() => {
                  setEditorError(null);
                  setShowEditor(false);
                }} className="rounded-full p-1" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <X size={18} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              <div className="mb-4 flex rounded-[18px] p-1" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                {(['good', 'bad'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDraftMode(mode)}
                    className="flex-1 rounded-[14px] px-4 py-3 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: draftMode === mode ? (mode === 'good' ? 'var(--color-primary)' : '#b42318') : 'transparent',
                      color: draftMode === mode ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {mode === 'good' ? 'Good habit' : 'Bad habit'}
                  </button>
                ))}
              </div>

              {draftMode === 'bad' && (
                <>
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      Unit
                    </label>
                    <select
                      value={draftUnit}
                      onChange={(e) => setDraftUnit(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    >
                      {BAD_HABIT_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="mt-4 rounded-[22px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
                      Icon
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                      Pick the tile emoji
                    </p>
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    {draftCategoryIcon}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(draftMode === 'bad' ? BAD_HABIT_EMOJIS : GOOD_HABIT_EMOJIS).map((emoji) => {
                    const active = draftCategoryIcon === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setDraftCategoryIcon(emoji)}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition-all"
                        style={{
                          backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface)',
                          border: `1px solid ${active ? 'transparent' : 'var(--color-border)'}`,
                          boxShadow: active ? '0 8px 18px rgba(0,0,0,0.12)' : 'none',
                        }}
                      >
                        <span style={{ filter: active ? 'grayscale(0)' : 'none' }}>{emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-[22px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  Sentence
                </p>

                <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>I will</label>
                <input
                  type="text"
                  placeholder="run"
                  value={draftAction}
                  onChange={(e) => setDraftAction(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  autoFocus
                />

                <label className="mb-2 mt-4 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>Cadence</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['daily', 'Daily'],
                    ['weekly-count', 'X / week'],
                    ['trigger', 'After / before'],
                    ['time-of-day', 'Time of day'],
                    ['custom', 'Custom'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDraftCadenceType(value)}
                      className="rounded-2xl px-4 py-3 text-sm font-semibold transition-all"
                      style={{
                        backgroundColor: draftCadenceType === value ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: draftCadenceType === value ? '#fff' : 'var(--color-text)',
                        border: `1px solid ${draftCadenceType === value ? 'transparent' : 'var(--color-border)'}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {draftCadenceType === 'weekly-count' && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {draftMode === 'bad' ? 'Maximum incidents per week' : 'Times per week'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={draftTargetCount}
                      onChange={(e) => setDraftTargetCount(Number(e.target.value) || 1)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                )}

                {(draftCadenceType === 'trigger' || draftCadenceType === 'time-of-day' || draftCadenceType === 'custom') && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {draftCadenceType === 'trigger' ? 'When' : draftCadenceType === 'time-of-day' ? 'Time cue' : 'Custom cadence'}
                    </label>
                    <input
                      type="text"
                      placeholder={draftCadenceType === 'trigger' ? 'after dinner' : draftCadenceType === 'time-of-day' ? 'before going to sleep' : 'whenever this makes sense'}
                      value={draftWhenInput}
                      onChange={(e) => setDraftWhenInput(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                )}

                <label className="mb-2 mt-4 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>Because</label>
                <input
                  type="text"
                  placeholder="I want to be healthy"
                  value={draftWhy}
                  onChange={(e) => setDraftWhy(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {editorPreview && (
                <div className="mt-4 rounded-[22px] px-4 py-4 text-sm" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Preview
                  </p>
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl"
                      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                      {draftCategoryIcon}
                    </div>
                    <div className="leading-relaxed">
                      {editorPreview}
                    </div>
                  </div>
                </div>
              )}

              {editorError && (
                <div
                  className="mt-4 rounded-2xl px-4 py-3 text-sm"
                  style={{ backgroundColor: 'rgba(180, 35, 24, 0.08)', border: '1px solid rgba(180, 35, 24, 0.18)', color: '#b42318' }}
                >
                  {editorError}
                </div>
              )}

              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
                style={{
                  backgroundColor: draftAction.trim() && draftWhy.trim() && editorPreview ? 'var(--color-primary)' : 'var(--color-border)',
                  color: draftAction.trim() && draftWhy.trim() && editorPreview ? '#fff' : 'var(--color-text-muted)',
                }}
                onClick={() => void saveHabitDefinition()}
              >
                <Check size={16} /> {editingHabit ? 'Save Habit' : 'Add Habit'}
              </button>

              {editingHabit && (
                <div className="mt-3">
                  <button
                    type="button"
                    className="w-full rounded-2xl py-3 text-sm font-semibold"
                    style={{
                      backgroundColor: 'rgba(180, 35, 24, 0.12)',
                      color: '#b42318',
                      border: '1px solid rgba(180, 35, 24, 0.18)',
                    }}
                    onClick={() => void deleteCurrentHabit()}
                  >
                    Delete
                  </button>
                </div>
              )}
              <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quantityHabit && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuantityHabit(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
              style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Log amount</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{getHabitSentence(quantityHabit)}</p>
                </div>
                <button onClick={() => setQuantityHabit(null)} className="rounded-full p-1" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <X size={18} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {getQuantityPresets(quantityHabit.unit, quantityHabit.id).map((preset) => (
                  <button
                    key={`${quantityHabit.id}-${preset}`}
                    type="button"
                    onClick={() => setQuantityValue(String(preset))}
                    className="rounded-2xl px-3 py-3 text-sm font-semibold"
                    style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                  >
                    {formatHabitAmount(preset, quantityHabit.unit)}
                  </button>
                ))}
              </div>

              <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Amount {quantityHabit.unit && quantityHabit.unit !== 'none' ? `(${quantityHabit.unit})` : ''}
              </label>
              <input
                type="number"
                min={0}
                step={quantityHabit.unit === 'g' ? '0.1' : quantityHabit.unit === 'mg' ? '50' : '1'}
                value={quantityValue}
                onChange={(event) => setQuantityValue(event.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                autoFocus
              />

              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
                style={{
                  backgroundColor: Number(quantityValue) > 0 ? '#b42318' : 'var(--color-border)',
                  color: Number(quantityValue) > 0 ? '#fff' : 'var(--color-text-muted)',
                }}
                onClick={saveQuantityLog}
              >
                <Check size={16} /> Save amount
              </button>
              <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
