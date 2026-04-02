'use client';

import { useMemo, useState } from 'react';
import { Brain, ChevronRight, Cpu, Radar, Sparkles } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { brainLayers, brainOverview, brainVersions } from '@/lib/brain';

interface BrainPageProps {
  onBack: () => void;
}

type LayerId = (typeof brainLayers)[number]['id'];

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="px-4 pt-5 pb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>{eyebrow}</p>
      <h2 className="text-lg font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{title}</h2>
      <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>
    </div>
  );
}

export function BrainPage({ onBack }: BrainPageProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<LayerId>(brainLayers[0].id);
  const selectedLayer = useMemo(
    () => brainLayers.find((layer) => layer.id === selectedLayerId) ?? brainLayers[0],
    [selectedLayerId]
  );

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        showBack
        onBack={onBack}
        title="Brain"
        leftElement={
          <button onClick={onBack} className="flex items-center gap-2 -ml-1 rounded-2xl px-2 py-1.5 active:scale-95 transition-transform" aria-label="Back from Brain">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-light)' }}>
              <Brain size={16} style={{ color: 'var(--color-dark)' }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>Brain</span>
          </button>
        }
        rightElement={
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <Radar size={17} style={{ color: 'var(--color-accent)' }} />
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-4 pt-4">
          <div className="rounded-[28px] p-5" style={{ background: 'linear-gradient(135deg, rgba(183,228,199,0.82) 0%, rgba(82,183,136,0.12) 100%)', border: '1px solid rgba(82,183,136,0.2)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(27,67,50,0.75)' }}>Current brain</p>
                <h1 className="text-2xl font-semibold mt-2" style={{ color: 'var(--color-dark)' }}>{brainOverview.version}</h1>
                <p className="text-sm mt-2 max-w-[34ch] leading-relaxed" style={{ color: 'rgba(27,67,50,0.82)' }}>
                  Fresh interpretation, private local inference, and transparent layer-by-layer thinking.
                </p>
              </div>
              <div className="w-14 h-14 rounded-[20px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.72)' }}>
                <Sparkles size={24} style={{ color: 'var(--color-dark)' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              {[
                { label: 'Last refresh', value: brainOverview.lastRefresh },
                { label: 'Mac status', value: brainOverview.macStatus },
                { label: 'Signals found', value: `${brainOverview.candidateSignals}` },
                { label: 'Insights shown', value: `${brainOverview.surfacedInsights}` },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.74)' }}>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(27,67,50,0.62)' }}>{item.label}</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-dark)' }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl px-3 py-3 flex items-start gap-3" style={{ backgroundColor: 'rgba(255,255,255,0.74)' }}>
              <Cpu size={18} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>Privacy mode</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(27,67,50,0.78)' }}>{brainOverview.privacyMode}</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.74)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(27,67,50,0.62)' }}>Architecture</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-dark)' }}>{brainOverview.totalLayers} layers · {brainOverview.activeSystems} active systems</p>
                </div>
                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: 'rgba(255,255,255,0.72)', color: 'rgba(27,67,50,0.8)' }}>
                  {brainOverview.status}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-[26px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>How Brain v3 stays useful</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              The brain does not hard-code the final insight. It scans your fresh data, generates many candidate signals, ranks the strongest supported ones, and only then writes the final perspective. This page is now the launch blueprint for what each layer needs to become world-class.
            </p>
          </div>
        </div>

        <SectionTitle
          eyebrow="Layers"
          title="How the brain thinks"
          subtitle="Each layer now lists the detector and model coverage needed for the strongest launch version of the app, so we can build the brain systematically instead of guessing."
        />

        <div className="px-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {brainLayers.map((layer) => {
              const active = layer.id === selectedLayer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className="flex-shrink-0 w-[232px] rounded-[26px] p-4 text-left transition-transform active:scale-[0.985]"
                  style={{
                    backgroundColor: active ? 'var(--color-light)' : 'var(--color-surface-2)',
                    border: `1px solid ${active ? 'rgba(82,183,136,0.25)' : 'var(--color-border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: active ? 'rgba(255,255,255,0.72)' : 'var(--color-surface)' }}>
                      {layer.icon}
                    </div>
                    <div className="px-2 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: active ? 'rgba(255,255,255,0.72)' : 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                      {layer.status}
                    </div>
                  </div>
                  <p className="text-sm font-semibold mt-3" style={{ color: 'var(--color-text)' }}>{layer.name}</p>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{layer.description}</p>
                  <p className="text-[11px] mt-3" style={{ color: 'var(--color-accent)' }}>
                    {(layer.detectors?.length ?? 0) + (layer.models?.length ?? 0)} blueprint parts
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-[28px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>{selectedLayer.category}</p>
                <h3 className="text-xl font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{selectedLayer.name}</h3>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{selectedLayer.description}</p>
              </div>
              <div className="w-12 h-12 rounded-[20px] flex items-center justify-center text-2xl" style={{ backgroundColor: 'var(--color-surface)' }}>
                {selectedLayer.icon}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Category</p>
                <p className="text-sm font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{selectedLayer.category}</p>
              </div>
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                <p className="text-sm font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{selectedLayer.status}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Recent contribution</p>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text)' }}>{selectedLayer.recentContribution}</p>
            </div>

            {selectedLayer.detectors && (
              <div className="mt-5">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Detector blueprint</p>
                <div className="space-y-2 mt-3">
                  {selectedLayer.detectors.map((detector) => (
                    <div key={detector.id} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{detector.name}</p>
                        <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>{detector.status}</span>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{detector.description}</p>
                      <p className="text-[11px] mt-2" style={{ color: 'var(--color-accent)' }}>Added in {detector.versionAdded}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedLayer.models && (
              <div className="mt-5">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Model blueprint</p>
                <div className="space-y-2 mt-3">
                  {selectedLayer.models.map((model) => (
                    <div key={model.id} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{model.name}</p>
                        <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>{model.status}</span>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{model.purpose}</p>
                      <p className="text-[11px] mt-2" style={{ color: 'var(--color-accent)' }}>Added in {model.versionAdded}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <SectionTitle
          eyebrow="Versions"
          title="How the brain is evolving"
          subtitle="Track what gets added over time so you can see exactly how the intelligence layer is becoming more sophisticated."
        />

        <div className="px-4 space-y-3">
          {brainVersions.map((version) => (
            <div key={version.id} className="rounded-[26px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>{version.dateLabel}</p>
                  <h3 className="text-base font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{version.label}</h3>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{version.headline}</p>
                </div>
                <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                  {version.state}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {version.changes.map((change) => (
                  <div key={change} className="flex items-start gap-2">
                    <ChevronRight size={14} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{change}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
