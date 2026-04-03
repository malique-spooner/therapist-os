'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DataRingProps {
  label: string;
  value: string;
  unit: string;
  percentage: number;
  trend: string;
  trendPositive: boolean;
  color?: string;
  delay?: number;
}

export function DataRing({ label, value, unit, percentage, trend, trendPositive, color = 'var(--color-accent)', delay = 0 }: DataRingProps) {
  const size = 90;
  const strokeWidth = 7;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div
          className="absolute inset-[14px] rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${color} 24%, white 76%) 0%, rgba(255,255,255,0) 72%)`,
            filter: 'blur(4px)',
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.1, duration: 0.6, ease: 'easeOut' }}
        />
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
          <motion.circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut', delay: delay + 0.2 }}
          />
        </svg>
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.32, duration: 0.4, ease: 'easeOut' }}
        >
          <span className="text-sm font-bold leading-none" style={{ color: 'var(--color-text)' }}>{value}</span>
          <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{unit}</span>
        </motion.div>
      </div>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.36, duration: 0.35 }}
      >
        <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          {trendPositive
            ? <TrendingUp size={10} style={{ color: 'var(--color-success)' }} />
            : <TrendingDown size={10} style={{ color: 'var(--color-warning)' }} />
          }
          <span className="text-xs" style={{ color: trendPositive ? 'var(--color-success)' : 'var(--color-warning)', fontSize: 10 }}>
            {trend}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
