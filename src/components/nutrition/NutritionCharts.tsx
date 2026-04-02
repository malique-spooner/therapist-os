'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { NutritionDay } from '@/data/nutrition';
import type { Period } from '@/lib/mockDataUtils';

function ChartWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 rounded-[28px] p-4 mb-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>{title}</p>
      <div style={{ width: '100%', height: 180 }}>{children}</div>
    </div>
  );
}

function sliceForPeriod(days: NutritionDay[], period: Period) {
  switch (period) {
    case 'this-week':
      return days.slice(-7);
    case 'last-week':
      return days.slice(-14, -7);
    case 'this-month':
      return days.slice(-30);
    case 'last-month':
      return days.slice(-60, -30);
    case '3-months':
      return days.slice(-90);
  }
}

export function NutritionCharts({ period, days }: { period: Period; days: NutritionDay[] }) {
  const data = sliceForPeriod(days, period).map((day) => ({
    label: day.date.slice(5),
    meals: Number(day.meals.breakfast) + Number(day.meals.lunch) + Number(day.meals.dinner),
    quality: day.foodQuality,
    caffeine: day.caffeine.count,
    alcohol: day.alcohol.units,
  }));

  return (
    <div className="pb-3">
      <ChartWrap title="Meal regularity">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Bar dataKey="meals" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrap>
      <ChartWrap title="Food quality">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Area type="monotone" dataKey="quality" stroke="var(--color-accent)" fill="var(--color-light)" fillOpacity={0.4} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrap>
      <ChartWrap title="Caffeine and alcohol">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Line type="monotone" dataKey="caffeine" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="alcohol" stroke="#E76F51" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrap>
    </div>
  );
}
