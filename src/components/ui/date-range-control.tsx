'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { addDays, getDayLabel, parseIsoDate, toIsoDate } from '@/lib/date';

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

interface DateRangeControlProps {
  mode?: 'single' | 'range';
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  availableDates?: string[];
  minDate?: string;
  maxDate?: string;
}

function startOfMonth(value: string) {
  const date = parseIsoDate(value);
  date.setUTCDate(1);
  return toIsoDate(date);
}

function addMonths(value: string, months: number) {
  const date = parseIsoDate(value);
  date.setUTCMonth(date.getUTCMonth() + months, 1);
  return toIsoDate(date);
}

function compareDates(a: string, b: string) {
  return a.localeCompare(b);
}

function rangeLabel(mode: 'single' | 'range', value: DateRangeValue) {
  if (mode === 'single' || value.startDate === value.endDate) {
    return getDayLabel(value.endDate, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return `${getDayLabel(value.startDate, { day: 'numeric', month: 'short' })} - ${getDayLabel(value.endDate, { day: 'numeric', month: 'short' })}`;
}

function monthLabel(value: string) {
  return getDayLabel(value, { month: 'long', year: 'numeric' });
}

function buildMonthDays(monthStart: string) {
  const first = parseIsoDate(monthStart);
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + index);
    return toIsoDate(day);
  });
}

export function DateRangeControl({
  mode = 'range',
  value,
  onChange,
  availableDates = [],
  minDate,
  maxDate,
}: DateRangeControlProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(value);
  const [viewMonth, setViewMonth] = useState(startOfMonth(value.endDate));
  const [monthDirection, setMonthDirection] = useState(0);
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const selectionMode = mode;
  const spanDays = Math.max(1, Math.round((parseIsoDate(value.endDate).getTime() - parseIsoDate(value.startDate).getTime()) / 86400000) + 1);
  const effectiveMinDate = minDate ?? availableDates[0] ?? value.startDate;
  const effectiveMaxDate = maxDate ?? availableDates[availableDates.length - 1] ?? value.endDate;

  useEffect(() => {
    setDraft(value);
    setViewMonth(startOfMonth(value.endDate));
  }, [value]);

  function clamp(date: string) {
    if (compareDates(date, effectiveMinDate) < 0) return effectiveMinDate;
    if (compareDates(date, effectiveMaxDate) > 0) return effectiveMaxDate;
    return date;
  }

  function shift(direction: -1 | 1) {
    if (selectionMode === 'single') {
      const next = clamp(addDays(value.endDate, direction));
      onChange({ startDate: next, endDate: next });
      return;
    }
    const nextStart = clamp(addDays(value.startDate, direction * spanDays));
    const nextEnd = clamp(addDays(value.endDate, direction * spanDays));
    onChange({ startDate: nextStart, endDate: nextEnd });
  }

  function setDraftBoundary(key: 'startDate' | 'endDate', next: string) {
    const safe = clamp(next);
    setDraft((current) => {
      if (selectionMode === 'single') {
        return { startDate: safe, endDate: safe };
      }

      const updated = { ...current, [key]: safe };
      if (compareDates(updated.startDate, updated.endDate) <= 0) {
        return updated;
      }
      return key === 'startDate'
        ? { startDate: safe, endDate: safe }
        : { startDate: safe, endDate: safe };
    });
  }

  function handleDayClick(day: string) {
    if (compareDates(day, effectiveMinDate) < 0 || compareDates(day, effectiveMaxDate) > 0) {
      return;
    }

    if (selectionMode === 'single') {
      setDraft({ startDate: day, endDate: day });
      return;
    }

    setDraft((current) => {
      if (current.startDate === current.endDate) {
        if (compareDates(day, current.startDate) < 0) {
          return { startDate: day, endDate: current.startDate };
        }
        if (compareDates(day, current.startDate) > 0) {
          return { startDate: current.startDate, endDate: day };
        }
      }
      return { startDate: day, endDate: day };
    });
  }

  const days = useMemo(() => buildMonthDays(viewMonth), [viewMonth]);

  return (
    <>
      <div className="px-4 pb-4">
        <motion.div
          className="rounded-[24px] p-3 flex items-center gap-2"
          whileHover={{ y: -1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 86%, white 14%) 0%, var(--color-surface-2) 100%)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
          }}
        >
          <motion.button
            onClick={() => shift(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            whileTap={{ scale: 0.92 }}
          >
            <ChevronLeft size={18} style={{ color: 'var(--color-text)' }} />
          </motion.button>
          <motion.button
            onClick={() => setOpen(true)}
            className="flex-1 rounded-[18px] px-4 py-3 text-left min-h-10"
            whileTap={{ scale: 0.985 }}
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 90%, white 10%) 0%, var(--color-surface) 100%)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: open ? 8 : 0, scale: open ? 1.06 : 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              >
                <CalendarIcon size={16} style={{ color: 'var(--color-primary)' }} />
              </motion.div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {selectionMode === 'single' ? 'Selected day' : 'Date range'}
                </p>
                <motion.p
                  key={`${value.startDate}-${value.endDate}`}
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text)' }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                >
                  {rangeLabel(selectionMode, value)}
                </motion.p>
              </div>
            </div>
          </motion.button>
          <motion.button
            onClick={() => shift(1)}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            whileTap={{ scale: 0.92 }}
          >
            <ChevronRight size={18} style={{ color: 'var(--color-text)' }} />
          </motion.button>
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)' }}
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[32px] p-5"
              style={{
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 90%, white 10%) 0%, var(--color-surface) 100%)',
                boxShadow: '0 -18px 48px rgba(15, 23, 42, 0.18)',
              }}
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.38)' }} />
              <div className="flex items-center justify-between pb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {selectionMode === 'single' ? 'Pick a day' : 'Pick dates'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Grey days have no saved data yet.
                  </p>
                </div>
                <motion.button
                  onClick={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#fff', boxShadow: '0 12px 24px rgba(44, 122, 123, 0.22)' }}
                >
                  Apply
                </motion.button>
              </div>

              <div className={`grid gap-3 ${selectionMode === 'single' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Start
                  </span>
                  <input
                    type="date"
                    value={draft.startDate}
                    min={effectiveMinDate}
                    max={effectiveMaxDate}
                    onChange={(event) => setDraftBoundary('startDate', event.target.value)}
                    className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                </label>
                {selectionMode === 'range' && (
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      End
                    </span>
                    <input
                      type="date"
                      value={draft.endDate}
                      min={effectiveMinDate}
                      max={effectiveMaxDate}
                      onChange={(event) => setDraftBoundary('endDate', event.target.value)}
                      className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </label>
                )}
              </div>

              <div
                className="mt-4 rounded-[28px] p-4 overflow-hidden"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 86%, white 14%) 0%, var(--color-surface-2) 100%)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <motion.button
                    onClick={() => {
                      setMonthDirection(-1);
                      setViewMonth(addMonths(viewMonth, -1));
                    }}
                    whileTap={{ scale: 0.92 }}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <ChevronLeft size={16} style={{ color: 'var(--color-text)' }} />
                  </motion.button>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={viewMonth}
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-text)' }}
                      initial={{ opacity: 0, x: monthDirection >= 0 ? 18 : -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: monthDirection >= 0 ? -18 : 18 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                      {monthLabel(viewMonth)}
                    </motion.p>
                  </AnimatePresence>
                  <motion.button
                    onClick={() => {
                      setMonthDirection(1);
                      setViewMonth(addMonths(viewMonth, 1));
                    }}
                    whileTap={{ scale: 0.92 }}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <ChevronRight size={16} style={{ color: 'var(--color-text)' }} />
                  </motion.button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                    <div key={day} className="text-center text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      {day}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={viewMonth}
                    className="grid grid-cols-7 gap-1"
                    initial={{ opacity: 0, x: monthDirection >= 0 ? 18 : -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: monthDirection >= 0 ? -18 : 18 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    {days.map((day, index) => {
                      const inMonth = day.slice(0, 7) === viewMonth.slice(0, 7);
                      const hasData = availableSet.has(day);
                      const isDisabled = compareDates(day, effectiveMinDate) < 0 || compareDates(day, effectiveMaxDate) > 0;
                      const inSelectedRange = compareDates(day, draft.startDate) >= 0 && compareDates(day, draft.endDate) <= 0;
                      const isBoundary = day === draft.startDate || day === draft.endDate;

                      return (
                        <motion.button
                          key={day}
                          onClick={() => handleDayClick(day)}
                          disabled={isDisabled}
                          className="h-10 rounded-xl text-sm relative"
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.004, duration: 0.18 }}
                          whileTap={isDisabled ? undefined : { scale: 0.92 }}
                          style={{
                            backgroundColor: isBoundary ? 'var(--color-primary)' : inSelectedRange ? 'rgba(44, 122, 123, 0.14)' : 'transparent',
                            color: isBoundary ? '#fff' : !inMonth ? 'rgba(107, 114, 128, 0.55)' : hasData ? 'var(--color-text)' : 'rgba(107, 114, 128, 0.65)',
                            border: `1px solid ${isBoundary ? 'transparent' : hasData ? 'var(--color-border)' : 'rgba(148, 163, 184, 0.18)'}`,
                            opacity: isDisabled ? 0.35 : hasData ? 1 : 0.62,
                            boxShadow: isBoundary ? '0 12px 20px rgba(44, 122, 123, 0.22)' : 'none',
                          }}
                        >
                          {Number(day.slice(-2))}
                          {hasData && !isBoundary && (
                            <span
                              className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div style={{ height: 'env(safe-area-inset-bottom, 12px)' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
