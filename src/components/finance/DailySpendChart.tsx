'use client';

import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { DayFinance } from '@/data/finance';
import type { Period } from '@/lib/mockDataUtils';

export function DailySpendChart({ period, days }: { period: Period; days: DayFinance[] }) {
  if (days.length === 1) {
    const day = days[0];
    const categoryData = [
      { label: 'Eating out', value: day.eatingOut },
      { label: 'Groceries', value: day.groceries },
      { label: 'Transport', value: day.transport },
      { label: 'Entertainment', value: day.entertainment },
      { label: 'Social', value: day.social },
      { label: 'Other', value: day.other },
    ].filter((item) => item.value > 0);

    return (
      <motion.div
        className="mx-4 rounded-[28px] p-4 mb-4"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 14px 28px rgba(15, 23, 42, 0.05)',
        }}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        whileHover={{ y: -2 }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Selected day categories</p>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid horizontal={false} stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={90} />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    );
  }

  const data = days.map((day) => ({
    label: day.date.slice(5),
    spend: day.totalSpend,
  }));
  const average = data.length ? data.reduce((sum, day) => sum + day.spend, 0) / data.length : 0;
  void period;

  return (
    <motion.div
      className="mx-4 rounded-[28px] p-4 mb-4"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 14px 28px rgba(15, 23, 42, 0.05)',
      }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
    >
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Daily spend</p>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={28} />
            <ReferenceLine y={average} stroke="#E76F51" strokeDasharray="4 4" />
            <Bar dataKey="spend" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
