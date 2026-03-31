'use client';

import { TopBar } from '@/components/navigation/TopBar';
import { ProviderCard } from './ProviderCard';
import { BudgetWidget } from './BudgetWidget';
import { Switch } from '@/components/ui/switch';

import { useSettingsStore } from '@/store/settings';
import { AI_PROVIDERS } from '@/services/ai/types';
import type { AIProviderId } from '@/store/settings';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';


interface SettingsPageProps {
  onBack: () => void;
}

const DATA_SOURCES = [
  { name: 'Garmin Connect', category: 'Body — Steps, Sleep, HRV, Workouts', icon: '⌚', connected: true, lastSync: '2 min ago' },
  { name: 'TrueLayer (Bank)', category: 'Finance — Transactions, Spending Categories', icon: '🏦', connected: true, lastSync: '1 hour ago' },
  { name: 'Spotify', category: 'Consumption — Music, Listening Patterns', icon: '🎵', connected: true, lastSync: '30 min ago' },
  { name: 'YouTube', category: 'Consumption — Watch History', icon: '▶️', connected: false, lastSync: null },
  { name: 'OwnTracks', category: 'Location — Continuous GPS Logging', icon: '📍', connected: true, lastSync: '5 min ago' },
  { name: 'Google Calendar', category: 'Commitments — Events, Time Allocation', icon: '📅', connected: true, lastSync: '15 min ago' },
  { name: 'Google Photos', category: 'Visual — Photo Metadata, Locations', icon: '📷', connected: false, lastSync: null },
  { name: 'Voice Journal', category: 'Mood — Transcription, Sentiment Analysis', icon: '🎙️', connected: true, lastSync: '3 hours ago' },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-6 pb-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </h2>
    </div>
  );
}


export function SettingsPage({ onBack }: SettingsPageProps) {
  const { activeProvider, setActiveProvider, theme, setTheme, textSize, setTextSize, frameworks, toggleFramework } = useSettingsStore();

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} title="Settings" />

      <div className="flex-1 overflow-y-auto pb-8">
        {/* AI Provider */}
        <SectionHeader title="AI Provider" />
        <div className="px-4 space-y-2">
          {AI_PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isSelected={activeProvider === provider.id}
              onSelect={() => setActiveProvider(provider.id as AIProviderId)}
            />
          ))}
        </div>

        {/* Monthly Budget */}
        <SectionHeader title="Monthly Budget" />
        <div className="px-4">
          <BudgetWidget />
        </div>

        {/* Data Sources */}
        <SectionHeader title="Connected Data Sources" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {DATA_SOURCES.map((source, i) => (
            <div key={source.name} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < DATA_SOURCES.length - 1 ? '1px solid var(--color-border)' : 'none', backgroundColor: 'var(--color-surface-2)' }}>
              <span className="text-xl w-8 text-center flex-shrink-0">{source.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{source.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{source.category}</p>
                {source.connected && source.lastSync && (
                  <p className="text-xs" style={{ color: 'var(--color-accent)' }}>Synced {source.lastSync}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {source.connected
                  ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                  : <Circle size={16} style={{ color: 'var(--color-border)' }} />
                }
                <button
                  className="text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: source.connected ? 'var(--color-border)' : 'var(--color-primary)', color: source.connected ? 'var(--color-text-muted)' : '#fff' }}
                  onClick={() => {}}
                >
                  {source.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>Theme</p>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              {(['light', 'system', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="flex-1 py-2 text-sm font-medium capitalize transition-colors"
                  style={{
                    backgroundColor: theme === t ? 'var(--color-primary)' : 'transparent',
                    color: theme === t ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>Text Size</p>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              {(['small', 'medium', 'large'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setTextSize(s)}
                  className="flex-1 py-2 text-sm font-medium capitalize transition-colors"
                  style={{
                    backgroundColor: textSize === s ? 'var(--color-primary)' : 'transparent',
                    color: textSize === s ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Frameworks */}
        <SectionHeader title="Active Frameworks" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
          {[
            { key: 'cbt' as const, name: 'Cognitive Behavioural Therapy (CBT)', desc: 'Identify and challenge negative thought patterns' },
            { key: 'sdt' as const, name: 'Self-Determination Theory (SDT)', desc: 'Understand autonomy, competence, and relatedness needs' },
            { key: 'behaviourism' as const, name: 'Behaviourism', desc: 'Recognise how consequences shape behaviour patterns' },
          ].map((fw, i) => (
            <div key={fw.key} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{fw.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{fw.desc}</p>
              </div>
              <Switch checked={frameworks[fw.key]} onCheckedChange={() => toggleFramework(fw.key)} />
            </div>
          ))}
          <div className="px-4 py-2">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>More frameworks available in a future update.</p>
          </div>
        </div>

        {/* Privacy */}
        <SectionHeader title="Privacy & Data" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
          {['Export My Data', 'Delete All Data', 'Privacy Policy', 'What data is sent to AI providers?'].map((item, i) => (
            <button key={item} className="w-full flex items-center justify-between px-4 py-3 active:opacity-70" style={{ borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none' }}>
              <span className="text-sm" style={{ color: item === 'Delete All Data' ? 'var(--color-warning)' : 'var(--color-text)' }}>{item}</span>
              <ExternalLink size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          ))}
        </div>

        {/* App Info */}
        <div className="px-4 py-6 text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Therapist OS v1.0.0 · March 2026</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Personal · Portfolio · Future Product</p>
        </div>
      </div>
    </div>
  );
}
