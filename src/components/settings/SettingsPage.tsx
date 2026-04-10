'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { useSettingsStore } from '@/store/settings';
import { Brain, ExternalLink, Lock, Radar, Mic2, AudioLines, Laptop } from 'lucide-react';
import { api, type AIRuntimeOptionsPayload, type DataSourcePayload, type DataSourceSetupPayload } from '@/lib/api';
import { RetryNotice } from '@/components/ui/retry-notice';
import { DataSourceSetupSheet } from '@/components/settings/DataSourceSetupSheet';
import { SyncActivityPage } from '@/components/settings/SyncActivityPage';


interface SettingsPageProps {
  onBack: () => void;
  onOpenBrain?: () => void;
  requestedSourceId?: string | null;
  onSourceRequestHandled?: () => void;
  onLogout?: () => void | Promise<void>;
}

const DEFAULT_DATA_SOURCES: DataSourcePayload[] = [
  {
    id: 'garmin',
    name: 'Garmin Connect',
    category: 'Body - Steps, Sleep, HRV, Workouts',
    icon: '⌚',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Save your Garmin Connect login so Therapist OS can run the daily background health sync.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: false,
  },
  {
    id: 'truelayer',
    name: 'TrueLayer',
    category: 'Money - transactions and spending patterns',
    icon: '🏦',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Save your TrueLayer app credentials, then finish bank sign-in to enable finance sync.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Consumption - listening patterns and audio features',
    icon: '🎵',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Add Spotify credentials on the backend to enable sync.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    category: 'Imports - Google Takeout archives and history exports',
    icon: '🗂️',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    folderPath: 'Therapist OS / Google Takeout',
    connectionHint: 'Planned import source for Google Takeout. Point recurring exports at the Therapist OS / Google Takeout folder.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
  {
    id: 'google_maps',
    name: 'Google Maps',
    category: 'Maps - interactive map canvas and cinematic 3D recaps',
    icon: '🗺️',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Save a Google Maps browser API key so Therapist OS can render map views and future 3D recap scenes.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: false,
  },
  {
    id: 'owntracks',
    name: 'OwnTracks',
    category: 'Location - live phone pings and daily movement summaries',
    icon: '📍',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Save a webhook username and password, then set OwnTracks to HTTP mode with Basic auth using the public webhook URL.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
  {
    id: 'weather',
    name: 'OpenWeather',
    category: 'Environment - weather and daylight context',
    icon: '☀️',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Save your OpenWeather API key, then run a sync to add weather and daylight context.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'Consumption - watch history and archive imports',
    icon: '▶️',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'YouTube is still a manual import path in Phase 2.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    category: 'Commitments - events and time allocation',
    icon: '📅',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Calendar integration is planned but not wired yet in this repo.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
  {
    id: 'google_photos',
    name: 'Google Photos',
    category: 'Visual - photo metadata and locations',
    icon: '📷',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Photos integration is planned but not wired yet in this repo.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
  {
    id: 'voice_journal',
    name: 'Voice Journal',
    category: 'Mood - transcription and reflection inputs',
    icon: '🎙️',
    connected: false,
    available: false,
    lastSync: null,
    lastSyncStatus: null,
    connectionHint: 'Voice journaling depends on the Whisper flow.',
    lastError: null,
    syncBlocked: false,
    syncGuardMessage: null,
    manualSyncAllowed: true,
  },
];

const DATA_SOURCES_FALLBACK_MESSAGE = 'Live connection status unavailable. Showing saved connections. Tap to retry.';

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-6 pb-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </h2>
    </div>
  );
}

function mergeDataSources(sources: DataSourcePayload[]) {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const mergedDefaults = DEFAULT_DATA_SOURCES.map((source) => ({
    ...source,
    ...byId.get(source.id),
  }));

  const unknownSources = sources.filter((source) => !DEFAULT_DATA_SOURCES.some((item) => item.id === source.id));
  return [...mergedDefaults, ...unknownSources];
}

function mergeDataSource(source: DataSourcePayload) {
  const fallback = DEFAULT_DATA_SOURCES.find((item) => item.id === source.id);
  return fallback ? { ...fallback, ...source } : source;
}

function getSourceActionLabel(source: DataSourcePayload) {
  if (source.connected) return 'Manage';
  if (source.connectionState === 'authorization-required') return 'Finish';
  return 'Connect';
}

function getSourceStatusLabel(source: DataSourcePayload) {
  if (source.syncBlocked) return 'Cooldown';
  if (source.lastSyncStatus === 'failed') return 'Sync failed';
  if (source.lastSyncStatus === 'automatic-only') return 'Auto only';
  if (source.connected) return 'Connected';
  if (source.connectionState === 'authorization-required') return 'Finish sign-in';
  if (source.id === 'owntracks' && source.available) return 'Waiting for ping';
  if (source.available) return 'Ready';
  return 'Setup';
}


export function SettingsPage({ onBack, onOpenBrain, requestedSourceId, onSourceRequestHandled, onLogout }: SettingsPageProps) {
  const {
    theme,
    setTheme,
    textSize,
    setTextSize,
    dataMode,
    setDataMode,
    localModel,
    setLocalModel,
    ttsProvider,
    setTtsProvider,
    ttsVoice,
    setTtsVoice,
  } = useSettingsStore();
  const [dataSources, setDataSources] = useState<DataSourcePayload[]>(DEFAULT_DATA_SOURCES);
  const [dataSourcesError, setDataSourcesError] = useState<string | null>(null);
  const [runtimeOptions, setRuntimeOptions] = useState<AIRuntimeOptionsPayload | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [setupSource, setSetupSource] = useState<DataSourcePayload | null>(null);
  const [setupDetails, setSetupDetails] = useState<DataSourceSetupPayload | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [showSyncActivity, setShowSyncActivity] = useState(false);

  async function refreshDataSources() {
    const sources = await api.getDataSources();
    setDataSources(mergeDataSources(sources));
    setDataSourcesError(null);
  }

  useEffect(() => {
    let active = true;
    void refreshDataSources().catch(() => {
      if (active) setDataSourcesError(DATA_SOURCES_FALLBACK_MESSAGE);
    });
    void api.getAiRuntimeOptions().then((options) => {
      if (!active) return;
      setRuntimeOptions(options);
      if (!localModel && options.defaultModel) setLocalModel(options.defaultModel);
      if (!ttsVoice && options.defaultTtsVoice) setTtsVoice(options.defaultTtsVoice);
    }).catch(() => {
      if (active) {
        setRuntimeOptions({
          localModels: ['qwen2.5:3b'],
          defaultModel: 'qwen2.5:3b',
          ttsProviders: ['kokoro', 'piper'],
          defaultTtsProvider: 'kokoro',
          defaultTtsVoice: 'af_heart',
          ttsVoices: { kokoro: ['af_heart'], piper: ['en_US-lessac-medium'] },
          googleMapsApiKey: null,
        });
      }
    });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!requestedSourceId || setupOpen || activeActionId) return;
    const source = dataSources.find((item) => item.id === requestedSourceId);
    if (!source) return;
    void openSetup(source).finally(() => {
      onSourceRequestHandled?.();
    });
  }, [requestedSourceId, dataSources, setupOpen, activeActionId, onSourceRequestHandled]);

  function updateSource(updated: DataSourcePayload) {
    const mergedSource = mergeDataSource(updated);
    setDataSources((current) => {
      if (current.some((item) => item.id === updated.id)) {
        return current.map((item) => item.id === updated.id ? mergedSource : item);
      }
      return [...current, mergedSource];
    });
  }

  async function openSetup(source: DataSourcePayload) {
    setActiveActionId(source.id);
    setDataSourcesError(null);
    try {
      const setup = await api.getDataSourceSetup(source.id);
      setSetupSource(source);
      setSetupDetails(setup);
      setSetupOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load data. Tap to retry.';
      setDataSourcesError(message);
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleSetupSave(values: Record<string, string>) {
    if (!setupSource) return;
    setActiveActionId(setupSource.id);
    setDataSourcesError(null);
    try {
      const result = await api.saveDataSourceSetup(setupSource.id, values);
      updateSource(result.source);
      const refreshedSetup = await api.getDataSourceSetup(setupSource.id);
      setSetupSource(result.source);
      setSetupDetails(refreshedSetup);
      setSetupOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load data. Tap to retry.';
      setDataSources((current) => current.map((item) => item.id === setupSource.id ? { ...item, lastError: message } : item));
      setDataSourcesError(DATA_SOURCES_FALLBACK_MESSAGE);
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleSync(source: DataSourcePayload) {
    setActiveActionId(source.id);
    setDataSourcesError(null);
    try {
      const result = await api.syncDataSource(source.id);
      updateSource(result.source);
      if (setupSource?.id === source.id) {
        setSetupSource(result.source);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load data. Tap to retry.';
      setDataSources((current) => current.map((item) => item.id === source.id ? { ...item, lastError: message } : item));
      setDataSourcesError(DATA_SOURCES_FALLBACK_MESSAGE);
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleAuthorize(source: DataSourcePayload) {
    setActiveActionId(source.id);
    setDataSourcesError(null);
    try {
      const result = await api.beginDataSourceAuthorization(source.id);
      if (typeof window !== 'undefined') {
        window.location.href = result.url;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start sign-in.';
      setDataSources((current) => current.map((item) => item.id === source.id ? { ...item, lastError: message } : item));
      setDataSourcesError(DATA_SOURCES_FALLBACK_MESSAGE);
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleDisconnect(source: DataSourcePayload) {
    setActiveActionId(source.id);
    setDataSourcesError(null);
    try {
      const result = await api.disconnectDataSource(source.id);
      updateSource(result.source);
      if (setupSource?.id === source.id) {
        setSetupSource(result.source);
        const refreshedSetup = await api.getDataSourceSetup(source.id);
        setSetupDetails(refreshedSetup);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load data. Tap to retry.';
      setDataSources((current) => current.map((item) => item.id === source.id ? { ...item, lastError: message } : item));
      setDataSourcesError(DATA_SOURCES_FALLBACK_MESSAGE);
    } finally {
      setActiveActionId(null);
    }
  }

  if (showSyncActivity) {
    return (
      <SyncActivityPage
        initialMode={dataMode}
        onBack={() => setShowSyncActivity(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} title="Settings" />

      <div className="flex-1 overflow-y-auto pb-8">
        <SectionHeader title="Brain & Privacy" />
        <div className="px-4">
          <div className="rounded-[28px] p-4" style={{ background: 'linear-gradient(135deg, rgba(183,228,199,0.78) 0%, rgba(82,183,136,0.08) 100%)', border: '1px solid rgba(82,183,136,0.2)' }}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.76)' }}>
                <Brain size={18} style={{ color: 'var(--color-dark)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>Brain v3</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(27,67,50,0.8)' }}>
                  A 10-layer brain combines data quality, pattern finding, prediction, text intelligence, causal learning, and private local AI on your Mac.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.76)' }}>
                <div className="flex items-center gap-2">
                  <Radar size={14} style={{ color: 'var(--color-accent)' }} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(27,67,50,0.7)' }}>Status</p>
                </div>
                <p className="text-sm font-semibold mt-2" style={{ color: 'var(--color-dark)' }}>10-layer stack</p>
              </div>
              <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.76)' }}>
                <div className="flex items-center gap-2">
                  <Lock size={14} style={{ color: 'var(--color-accent)' }} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(27,67,50,0.7)' }}>Privacy</p>
                </div>
                <p className="text-sm font-semibold mt-2" style={{ color: 'var(--color-dark)' }}>Mac-local inference</p>
              </div>
            </div>

            <button
              onClick={onOpenBrain}
              className="mt-4 w-full rounded-2xl h-12 font-semibold"
              style={{ backgroundColor: 'var(--color-dark)', color: '#fff' }}
            >
              Open Brain
            </button>
          </div>
        </div>

        <SectionHeader title="Local Intelligence" />
        <div className="px-4">
          <div className="rounded-[28px] overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
            <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <Laptop size={16} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Therapist LLM</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    Choose the Ollama model used for live therapist chat. Keep the fast model here and save larger models for slower Brain work.
                  </p>
                  <select
                    value={localModel}
                    onChange={(event) => setLocalModel(event.target.value)}
                    className="mt-3 h-11 w-full rounded-2xl px-3 text-sm font-semibold outline-none"
                    style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                  >
                    {(runtimeOptions?.localModels?.length ? runtimeOptions.localModels : ['qwen2.5:3b']).map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <Mic2 size={16} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Local Whisper</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    Mic input is transcribed locally first, then sent as text to the selected therapist model.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <AudioLines size={16} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Therapist Voice</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    Kokoro is the default warm/calm read-aloud voice. Piper stays as the backup if Kokoro cannot synthesize.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <select
                      value={ttsProvider}
                      onChange={(event) => setTtsProvider(event.target.value === 'piper' ? 'piper' : 'kokoro')}
                      className="h-11 rounded-2xl px-3 text-sm font-semibold outline-none"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                      <option value="kokoro">Kokoro</option>
                      <option value="piper">Piper fallback</option>
                    </select>
                    <select
                      value={ttsVoice}
                      onChange={(event) => setTtsVoice(event.target.value)}
                      className="h-11 rounded-2xl px-3 text-sm font-semibold outline-none"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                      {((runtimeOptions?.ttsVoices?.[ttsProvider]) ?? (ttsProvider === 'kokoro' ? ['af_heart'] : ['en_US-lessac-medium'])).map((voice) => (
                        <option key={voice} value={voice}>{voice}</option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    Recommended: Kokoro · af_heart for the closest warm/calm default.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <SectionHeader title="Connected Data Sources" />
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => setShowSyncActivity(true)}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Sync Activity Log</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Review demo vs real update history, row counts, and recent collection attempts across all connections.
              </p>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>Open</span>
          </button>
        </div>
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {dataSources.map((source, i) => (
            <div key={source.name} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < dataSources.length - 1 ? '1px solid var(--color-border)' : 'none', backgroundColor: 'var(--color-surface-2)' }}>
              <span className="text-xl w-8 text-center flex-shrink-0">{source.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{source.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{source.category}</p>
                {source.intendedSync && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Intended sync: {source.intendedSync}</p>
                )}
                {source.connected && source.lastSync && (
                  <p className="text-xs" style={{ color: 'var(--color-accent)' }}>Synced {source.lastSync}</p>
                )}
                {!source.connected && source.connectionHint && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{source.connectionHint}</p>
                )}
                {source.folderPath && (
                  <p className="text-xs" style={{ color: 'var(--color-accent)' }}>Folder: {source.folderPath}</p>
                )}
                {source.syncGuardMessage && (
                  <p className="text-xs" style={{ color: 'var(--color-warning)' }}>{source.syncGuardMessage}</p>
                )}
                {!source.syncGuardMessage && source.lastError && (
                  <p className="text-xs" style={{ color: 'var(--color-warning)' }}>{source.lastError}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{
                    backgroundColor: source.connected ? 'rgba(82, 183, 136, 0.14)' : 'var(--color-surface)',
                    color: source.connected ? 'var(--color-success)' : 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {getSourceStatusLabel(source)}
                </span>
                <button
                  className="text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: source.connected ? 'var(--color-border)' : 'var(--color-primary)', color: source.connected ? 'var(--color-text-muted)' : '#fff' }}
                  onClick={() => { void openSetup(source); }}
                  disabled={activeActionId === source.id}
                  aria-label={
                    activeActionId === source.id
                      ? `Working on ${source.name}`
                      : `${getSourceActionLabel(source)} ${source.name}`
                  }
                >
                  {activeActionId === source.id ? 'Working...' : getSourceActionLabel(source)}
                </button>
              </div>
            </div>
          ))}
        </div>
        {dataSourcesError && (
          <div className="px-4 pt-2">
            <RetryNotice
              message={dataSourcesError}
              onRetry={() => refreshDataSources().catch(() => setDataSourcesError(DATA_SOURCES_FALLBACK_MESSAGE))}
              className="w-full rounded-2xl px-4 py-3 text-xs"
            />
          </div>
        )}

        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Data mode</p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Compare the 90-day demo dataset against only real records saved in the app. Real mode will now show empty states when a domain does not have enough real data yet.
            </p>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              {([
                { value: 'demo-only', label: 'Demo' },
                { value: 'real-only', label: 'Real only' },
              ] as const).map((item) => (
                <button
                  key={item.value}
                  onClick={() => setDataMode(item.value)}
                  className="flex-1 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: dataMode === item.value ? 'var(--color-primary)' : 'transparent',
                    color: dataMode === item.value ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
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

        {onLogout && (
          <>
            <SectionHeader title="Session" />
            <div className="px-4">
              <button
                type="button"
                onClick={() => { void onLogout(); }}
                className="h-12 w-full rounded-2xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-dark)', color: '#fff' }}
              >
                Sign out
              </button>
            </div>
          </>
        )}

        {/* App Info */}
        <div className="px-4 py-6 text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Therapist OS v1.0.0 · March 2026</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Personal · Portfolio · Future Product</p>
        </div>
      </div>

      <DataSourceSetupSheet
        source={setupSource}
        setup={setupDetails}
        open={setupOpen}
        saving={activeActionId === setupSource?.id}
        onClose={() => {
          setSetupOpen(false);
          setSetupSource(null);
          setSetupDetails(null);
        }}
        onSave={handleSetupSave}
        onAuthorize={handleAuthorize}
        onSync={handleSync}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
