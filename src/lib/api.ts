import type { AIProvider, AIResponse } from '@/services/ai/types';
import type { BrainPayload, BrainLayer, BrainVersion, BrainOverview } from '@/lib/brain';
import type { HabitDef } from '@/data/habits';
import type { DayHealth } from '@/data/health';
import type { DayFinance } from '@/data/finance';
import type { RelationshipInteraction, RelationshipPerson } from '@/data/relationships';
import type { DailyCheckIn } from '@/data/checkins';

export interface HabitHistoryDay {
  date: string;
  values: Record<string, boolean | number | null>;
}

export interface HabitUpsertPayload {
  actionText: string;
  whenText: string;
  whyText: string;
  habitMode: 'good' | 'bad';
  cadenceType: 'daily' | 'weekly-count' | 'trigger' | 'time-of-day' | 'custom';
  targetCount?: number | null;
  category?: string | null;
  categoryIcon?: string | null;
  type?: 'boolean' | 'numeric' | 'scale' | null;
  unit?: string | null;
  maxValue?: number | null;
}

export interface HabitsOverview {
  habits: HabitDef[];
  todayCompletions: Record<string, boolean | number | null>;
  history: HabitHistoryDay[];
  weeklyCompletion: number;
  streaks: Record<string, { streak: number; longest: number }>;
}

export interface DashboardInsightCard {
  id: string;
  category: string;
  categoryIcon: string;
  lens: 'CBT' | 'SDT' | 'Behaviourism';
  narrative: string;
  action: string;
}

export interface DashboardPayload {
  greeting: string;
  dateLabel: string;
  windowLabel?: string;
  status?: 'ready' | 'demo' | 'waiting-for-data';
  heroInsight: {
    weekOf: string;
    heroHeadline: string;
    heroFramework: 'CBT' | 'SDT' | 'Behaviourism';
    cards: DashboardInsightCard[];
  };
  rings: Array<{
    label: string;
    value: string;
    unit: string;
    percentage: number;
    trend: string;
    trendPositive: boolean;
  }>;
  miniTrends: Array<{
    label: string;
    data: number[];
    latest: string;
    unit: string;
    invertTrend?: boolean;
  }>;
  insights: DashboardInsightCard[];
}

export type HealthPayload = DayHealth & {
  workoutType?: string | null;
  workoutDurationMinutes?: number;
};

export type FinancePayload = DayFinance;

export interface MediaProviderBreakdown {
  spotify?: {
    label: string;
    listeningHours: number;
    averageValence: number | null;
    averageEnergy: number | null;
    averageDanceability: number | null;
    newDiscoveries: number;
    topGenres: string[];
    topTracks: Array<{ name?: string; artist?: string; plays?: number }>;
  };
  youtube?: {
    label: string;
    totalHours: number;
    educational: number;
    entertainment: number;
    music: number;
    other: number;
  };
}

export interface ConsumptionPayload {
  date: string;
  listeningHours: number;
  averageValence: number | null;
  averageEnergy: number | null;
  averageDanceability: number | null;
  newDiscoveries: number;
  topGenres: string[];
  topTracks: Array<{ name?: string; artist?: string; plays?: number; valence?: number; energy?: number }>;
  providerBreakdown?: MediaProviderBreakdown;
}

export interface LocationSummaryPayload {
  date: string;
  homeHours: number;
  gymVisits: number;
  socialVenueVisits: number;
  newPlacesVisited: number;
  commuteDetected: boolean;
  timeOutdoorsMinutes: number;
}

export interface LocationPointPayload {
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  batteryLevel?: number | null;
}

export interface LocationCompanionPayload {
  date: string;
  personIds: string[];
  contextLabel?: string | null;
  note?: string | null;
}

export interface LocationPlaceMemoryPayload {
  placeKey: string;
  label?: string | null;
  suggestedLabel?: string | null;
  category?: string | null;
  tone?: string | null;
  note?: string | null;
  confidenceScore?: number | null;
  status?: string | null;
  mergedIntoKey?: string | null;
  splitFromKey?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  visitCount?: number | null;
  totalMinutes?: number | null;
  averageDwellMinutes?: number | null;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  lastVisited?: string | null;
  historyCount?: number | null;
  insight?: string | null;
}

export interface LocationPlaceHistoryPayload {
  id: number;
  placeKey: string;
  action: string;
  detail?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LocationVisitPayload {
  id: string;
  placeKey: string;
  placeLabel: string;
  category: string;
  startTimestamp: string;
  endTimestamp: string;
  dwellMinutes: number;
  latitude: number;
  longitude: number;
  highlight: string;
  tone: 'positive' | 'neutral' | 'draining';
}

export interface LocationRecapScenePayload {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  zoom: number;
  heading: number;
  tilt: number;
  accent: string;
  durationMs?: number | null;
}

export interface LocationRangeStatPayload {
  label: string;
  value: string;
  detail: string;
}

export interface LocationIntelligencePayload {
  mode: DataMode;
  hasRealMapData: boolean;
  heroTitle: string;
  heroBody: string;
  summaries: LocationSummaryPayload[];
  selectedDay?: LocationSummaryPayload | null;
  points: LocationPointPayload[];
  selectedDayPoints: LocationPointPayload[];
  visits: LocationVisitPayload[];
  places: LocationPlaceMemoryPayload[];
  recapScenes: LocationRecapScenePayload[];
  rangeStats: LocationRangeStatPayload[];
}

export interface AppOpenPromptPayload {
  promptKey: string;
  category: string;
  title: string;
  question: string;
  supportingText: string;
  primaryLabel: string;
  targetPage: string;
  targetDate?: string | null;
  personIds?: string[] | null;
}

export type RelationshipPayload = RelationshipPerson;
export type RelationshipInteractionPayload = RelationshipInteraction;
export type DailyCheckInPayload = DailyCheckIn;
export interface RelationshipImportPayload {
  id: number;
  source: string;
  filename: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  capturedAt?: string | null;
  matchedPersonIds: string[];
  detectedLabels: string[];
  note?: string | null;
  importedAt: string;
}

export interface BudgetPayload {
  month: string;
  limitPence: number;
  spentPence: number;
  autoSwitchAt80: boolean;
  disablePaidAtLimit: boolean;
}

export interface DataSourcePayload {
  id: string;
  name: string;
  category: string;
  icon: string;
  connected: boolean;
  available: boolean;
  connectionState?: string | null;
  lastSync: string | null;
  lastSyncStatus: string | null;
  folderPath?: string | null;
  connectionHint: string | null;
  lastError: string | null;
  syncBlocked?: boolean;
  syncGuardMessage?: string | null;
  intendedSync?: string | null;
  manualSyncAllowed?: boolean;
}

export interface DataSourceSetupFieldPayload {
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  hasValue: boolean;
  value?: string | null;
}

export interface DataSourceSyncAttemptPayload {
  id: number;
  status: string;
  trigger: string;
  dataMode?: string | null;
  rowsSynced?: number | null;
  detail?: string | null;
  attemptedAt: string;
  cooldownUntil?: string | null;
}

export interface DataSourceActivityItemPayload extends DataSourcePayload {
  recordsAvailable: number;
  lastCollectedAt?: string | null;
  latestDataDate?: string | null;
  recentAttempts: DataSourceSyncAttemptPayload[];
}

export interface DataSourceActivityPayload {
  mode: DataMode;
  generatedAt: string;
  items: DataSourceActivityItemPayload[];
}

export interface DataSourceSetupPayload {
  id: string;
  name: string;
  mode: string;
  title: string;
  description: string;
  instructions: string[];
  actionLabel: string;
  connected: boolean;
  available: boolean;
  fields: DataSourceSetupFieldPayload[];
  webhookUrl?: string | null;
  callbackUrl?: string | null;
  folderPath?: string | null;
  canAuthorize: boolean;
  authActionLabel?: string | null;
  recentAttempts: DataSourceSyncAttemptPayload[];
  intendedSync?: string | null;
  manualSyncAllowed?: boolean;
}

export interface TranscriptionPayload {
  text: string;
}

export interface LiveSessionPayload {
  clientSecret: string;
  model: string;
  voice: string;
  estimatedCostPerMinutePence: number;
  warning: string;
}

export interface AuthUserPayload {
  id: number;
  email: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

export interface AIRuntimeOptionsPayload {
  localModels: string[];
  defaultModel: string;
  ttsProviders: Array<'kokoro' | 'piper'>;
  defaultTtsProvider: 'kokoro' | 'piper';
  defaultTtsVoice: string;
  ttsVoices: Record<string, string[]>;
  googleMapsApiKey?: string | null;
}

export interface ConversationMessagePayload {
  id: string;
  role: 'user' | 'ai';
  content: string;
  createdAt: string;
  frameworksReferenced?: string[] | null;
  costPence?: number | null;
}

export interface ConversationPayload {
  id: string;
  startedAt: string;
  endedAt: string | null;
  sessionType: string;
  provider: string;
  model: string;
  totalTokensUsed: number;
  totalCostPence: number;
  messages: ConversationMessagePayload[];
}

export interface ConversationStartPayload {
  id: string;
  openingMessage: ConversationMessagePayload | null;
}

export interface StreamDonePayload {
  type: 'done';
  conversationId: string;
  sessionCostPence: number;
  costPence: number;
  frameworksReferenced: string[];
  model: string;
}

type StreamEventPayload =
  | { type: 'delta'; content?: string }
  | { type: 'error'; detail?: string }
  | StreamDonePayload
  | { type: string; content?: string; detail?: string };

export type BrainOverviewPayload = BrainOverview;
export type BrainLayerPayload = BrainLayer;
export type BrainVersionPayload = BrainVersion;
export type BrainPayloadResponse = BrainPayload;

export interface DateQuery {
  period?: string;
  startDate?: string;
  endDate?: string;
}

type DataMode = 'demo-only' | 'real-only';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? '';

function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://127.0.0.1:8000';
}

function getDataMode(): DataMode {
  if (typeof window === 'undefined') return 'demo-only';
  try {
    const raw = window.localStorage.getItem('therapist-os-settings');
    if (!raw) return 'demo-only';
    const parsed = JSON.parse(raw);
    const mode = parsed?.state?.dataMode ?? parsed?.dataMode;
    return mode === 'real-only' ? 'real-only' : 'demo-only';
  } catch {
    return 'demo-only';
  }
}

function withDataMode(path: string) {
  const mode = getDataMode();
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}mode=${mode}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBase = getApiBase();
  const headers = new Headers(init?.headers);
  if (API_KEY) headers.set('X-API-Key', API_KEY);
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        const payload = await response.json() as { detail?: string };
        throw new Error(payload.detail || `Request failed with ${response.status}`);
      } catch (error) {
        if (error instanceof Error) throw error;
      }
    }

    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function withDateQuery(path: string, query?: DateQuery) {
  if (!query) return path;
  const params = new URLSearchParams();
  if (query.period) params.set('period', query.period);
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function handleStreamEvent(
  payload: StreamEventPayload,
  handlers: {
    onDelta: (delta: string) => void;
    onDone?: (payload: StreamDonePayload) => void;
  },
): StreamDonePayload | null {
  switch (payload.type) {
    case 'delta':
      if (payload.content) handlers.onDelta(payload.content);
      return null;
    case 'error':
      throw new Error(payload.detail || 'Streaming failed');
    case 'done': {
      const donePayload = payload as StreamDonePayload;
      handlers.onDone?.(donePayload);
      return donePayload;
    }
    default:
      return null;
  }
}

export const api = {
  getAuthStatus: () => request<{ configured: boolean }>('/api/auth/status'),
  login: (payload: LoginPayload) =>
    request<{ user: AuthUserPayload }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => request<{ detail: string }>('/api/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<AuthUserPayload>('/api/auth/me'),
  getDashboard: (period: string) => request<DashboardPayload>(withDataMode(`/api/dashboard?period=${period}`)),
  getBrain: () => request<BrainPayloadResponse>(withDataMode('/api/brain')),
  getHealth: (query: string | DateQuery) =>
    request<HealthPayload[]>(withDataMode(withDateQuery('/api/health', typeof query === 'string' ? { period: query } : query))),
  getHealthToday: () => request<HealthPayload>(withDataMode('/api/health/today')),
  syncHealth: () => request<{ detail: string; daysSynced: number; latestDate: string | null }>('/api/health/sync', { method: 'POST' }),
  getFinance: (query: string | DateQuery) =>
    request<FinancePayload[]>(withDataMode(withDateQuery('/api/finance', typeof query === 'string' ? { period: query } : query))),
  getFinanceToday: () => request<FinancePayload>(withDataMode('/api/finance/today')),
  syncFinance: () => request<{ detail: string; transactionsSynced: number }>('/api/finance/sync', { method: 'POST' }),
  getConsumption: (query: string | DateQuery) =>
    request<ConsumptionPayload[]>(withDataMode(withDateQuery('/api/consumption', typeof query === 'string' ? { period: query } : query))),
  getConsumptionToday: () => request<ConsumptionPayload>(withDataMode('/api/consumption/today')),
  syncConsumption: () => request<{ detail: string; daysSynced: number; latestDate: string | null }>('/api/consumption/sync', { method: 'POST' }),
  getLocation: (query: string | DateQuery) =>
    request<LocationPointPayload[]>(withDataMode(withDateQuery('/api/location', typeof query === 'string' ? { period: query } : query))),
  getLocationToday: () => request<LocationSummaryPayload>(withDataMode('/api/location/today')),
  getLocationSummary: (query: string | DateQuery) =>
    request<LocationSummaryPayload[]>(withDataMode(withDateQuery('/api/location/summary', typeof query === 'string' ? { period: query } : query))),
  getLocationCompanions: (date: string) => request<LocationCompanionPayload>(withDataMode(`/api/location/companions?date=${date}`)),
  saveLocationCompanions: (date: string, payload: Omit<LocationCompanionPayload, 'date'>) =>
    request<LocationCompanionPayload>(`/api/location/companions?date=${date}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getLocationIntelligence: (query: { period?: string; date?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (query.period) params.set('period', query.period);
    if (query.date) params.set('date', query.date);
    if (query.startDate) params.set('startDate', query.startDate);
    if (query.endDate) params.set('endDate', query.endDate);
    return request<LocationIntelligencePayload>(withDataMode(`/api/location/intelligence?${params.toString()}`));
  },
  getLocationPlaces: () => request<LocationPlaceMemoryPayload[]>(withDataMode('/api/location/places')),
  saveLocationPlace: (placeKey: string, payload: Omit<LocationPlaceMemoryPayload, 'placeKey'>) =>
    request<LocationPlaceMemoryPayload>(`/api/location/places/${encodeURIComponent(placeKey)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getLocationPlaceHistory: (placeKey: string) =>
    request<LocationPlaceHistoryPayload[]>(withDataMode(`/api/location/places/${encodeURIComponent(placeKey)}/history`)),
  mergeLocationPlace: (placeKey: string, targetPlaceKey: string) =>
    request<LocationPlaceMemoryPayload>(`/api/location/places/${encodeURIComponent(placeKey)}/merge`, {
      method: 'POST',
      body: JSON.stringify({ targetPlaceKey }),
    }),
  splitLocationPlace: (placeKey: string, newPlaceKey: string, label?: string | null) =>
    request<LocationPlaceMemoryPayload>(`/api/location/places/${encodeURIComponent(placeKey)}/split`, {
      method: 'POST',
      body: JSON.stringify({ newPlaceKey, label: label ?? null }),
    }),
  getRelationships: () => request<RelationshipPayload[]>(withDataMode('/api/relationships')),
  createRelationship: (payload: Omit<RelationshipPayload, 'id' | 'avatarColour'>) =>
    request<RelationshipPayload>('/api/relationships', { method: 'POST', body: JSON.stringify(payload) }),
  getRelationshipInteractions: (query: string | DateQuery) =>
    request<RelationshipInteractionPayload[]>(withDataMode(withDateQuery('/api/relationships/interactions', typeof query === 'string' ? { period: query } : query))),
  createRelationshipInteraction: (payload: Omit<RelationshipInteractionPayload, 'id' | 'timestamp' | 'date'> & { date?: string }) =>
    request<RelationshipInteractionPayload>('/api/relationships/interactions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRelationshipInteraction: (interactionId: string) =>
    request<{ detail: string }>(`/api/relationships/interactions/${interactionId}`, { method: 'DELETE' }),
  getRelationshipsDue: () =>
    request<Array<{ person: RelationshipPayload; daysAgo: number }>>(withDataMode('/api/relationships/due')),
  getRelationshipImports: () =>
    request<RelationshipImportPayload[]>(withDataMode('/api/relationships/imports')),
  importSnapchatBestFriendsScreenshot: async (payload: {
    file: File;
    capturedAt?: string | null;
    matchedPersonIds: string[];
    detectedLabels: string[];
    note?: string | null;
  }) => {
    const apiBase = getApiBase();
    const formData = new FormData();
    formData.append('screenshot', payload.file);
    if (payload.capturedAt) formData.append('capturedAt', payload.capturedAt);
    formData.append('matchedPersonIds', payload.matchedPersonIds.join(','));
    formData.append('detectedLabels', payload.detectedLabels.join(','));
    if (payload.note) formData.append('note', payload.note);

    const headers = new Headers();
    if (API_KEY) headers.set('X-API-Key', API_KEY);

    const response = await fetch(`${apiBase}${withDataMode('/api/relationships/imports/snapchat')}`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}`);
    }

    return response.json() as Promise<RelationshipImportPayload>;
  },
  getOpenPrompt: () => request<AppOpenPromptPayload | null>('/api/open-prompts/current'),
  dismissOpenPrompt: (promptKey: string) =>
    request<{ detail: string }>(`/api/open-prompts/${promptKey}/dismiss`, { method: 'POST' }),
  completeOpenPrompt: (promptKey: string) =>
    request<{ detail: string }>(`/api/open-prompts/${promptKey}/complete`, { method: 'POST' }),
  getCheckins: (period: string) => request<DailyCheckInPayload[]>(withDataMode(`/api/checkins?period=${period}`)),
  getTodayCheckin: () => request<DailyCheckInPayload | null>(withDataMode('/api/checkins/today')),
  saveCheckin: (payload: Omit<DailyCheckInPayload, 'date' | 'timestamp'>) =>
    request<DailyCheckInPayload>('/api/checkins', { method: 'POST', body: JSON.stringify(payload) }),
  getCheckinStreak: () => request<{ streak: number }>(withDataMode('/api/checkins/streak')),
  getHabits: () => request<HabitsOverview>(withDataMode('/api/habits')),
  getDataSources: () => request<DataSourcePayload[]>('/api/data-sources'),
  getDataSourceActivity: (mode: DataMode) => request<DataSourceActivityPayload>(`/api/data-sources/activity?mode=${mode}`),
  getDataSourceSetup: (sourceId: string) =>
    request<DataSourceSetupPayload>(`/api/data-sources/${sourceId}/setup`),
  saveDataSourceSetup: (sourceId: string, values: Record<string, string>) =>
    request<{ detail: string; source: DataSourcePayload }>(`/api/data-sources/${sourceId}/setup`, {
      method: 'POST',
      body: JSON.stringify({ values }),
    }),
  beginDataSourceAuthorization: (sourceId: string) =>
    request<{ url: string }>(`/api/data-sources/${sourceId}/authorize`, {
      method: 'POST',
    }),
  completeDataSourceAuthorization: (sourceId: string, payload: { code?: string | null; state?: string | null; error?: string | null }) =>
    request<{ detail: string; source: DataSourcePayload }>(`/api/data-sources/${sourceId}/oauth/callback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  connectDataSource: (sourceId: string) =>
    request<{ detail: string; source: DataSourcePayload }>(`/api/data-sources/${sourceId}/connect`, { method: 'POST' }),
  syncDataSource: (sourceId: string) =>
    request<{ detail: string; source: DataSourcePayload }>(`/api/data-sources/${sourceId}/sync`, { method: 'POST' }),
  disconnectDataSource: (sourceId: string) =>
    request<{ detail: string; source: DataSourcePayload }>(`/api/data-sources/${sourceId}`, { method: 'DELETE' }),
  saveHabitLog: (habitId: string, value: boolean | number, date?: string) =>
    request<{ detail: string }>(withDataMode('/api/habits/logs'), {
      method: 'POST',
      body: JSON.stringify({ habitId, value, date }),
    }),
  createHabit: (payload: HabitUpsertPayload) =>
    request<HabitDef>(withDataMode('/api/habits'), {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateHabit: (habitId: string, payload: HabitUpsertPayload) =>
    request<HabitDef>(withDataMode(`/api/habits/${habitId}`), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteHabit: (habitId: string) =>
    request<{ detail: string }>(withDataMode(`/api/habits/${habitId}`), {
      method: 'DELETE',
    }),
  getOpeningMessage: () => request<{ message: string }>(withDataMode('/api/ai/opening-message')),
  transcribeAudio: async (audioBlob: Blob) => {
    const apiBase = getApiBase();
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const headers = new Headers();
    if (API_KEY) headers.set('X-API-Key', API_KEY);

    const response = await fetch(`${apiBase}/api/ai/transcribe`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}`);
    }

    return response.json() as Promise<TranscriptionPayload>;
  },
  synthesizeSpeech: async (text: string, options?: { provider?: string; voice?: string }) => {
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}/api/ai/tts`, {
      method: 'POST',
      headers: API_KEY
        ? { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, provider: options?.provider, voice: options?.voice }),
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      const textBody = await response.text();
      throw new Error(textBody || `Request failed with ${response.status}`);
    }

    return response.blob();
  },
  createLiveSession: () => request<LiveSessionPayload>(withDataMode('/api/ai/live/session'), { method: 'POST' }),
  getProviders: () => request<AIProvider[]>('/api/ai/providers'),
  getAiRuntimeOptions: () => request<AIRuntimeOptionsPayload>('/api/ai/runtime-options'),
  getBudgetCurrent: () => request<BudgetPayload>(withDataMode('/api/budget/current')),
  updateBudget: (payload: Omit<BudgetPayload, 'month' | 'spentPence'>) =>
    request<BudgetPayload>(withDataMode('/api/budget'), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getConversations: () => request<ConversationPayload[]>(withDataMode('/api/ai/conversations')),
  getConversationMessages: (conversationId: string) =>
    request<ConversationMessagePayload[]>(withDataMode(`/api/ai/conversations/${conversationId}/messages`)),
  startConversation: (provider = 'local-qwen', context?: string | null, modelOverride?: string | null) =>
    request<ConversationStartPayload>(withDataMode('/api/ai/conversations'), {
      method: 'POST',
      body: JSON.stringify({ provider, context, model: modelOverride || undefined }),
    }),
  sendMessageStream: async (
    message: string,
    provider = 'local-qwen',
    conversationId: string | undefined,
    handlers: {
      onDelta: (delta: string) => void;
      onDone?: (payload: StreamDonePayload) => void;
    },
    modelOverride?: string | null,
  ): Promise<StreamDonePayload | null> => {
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}${withDataMode('/api/ai/message/stream')}`, {
      method: 'POST',
      headers: API_KEY
        ? { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        provider,
        conversation_id: conversationId,
        model: modelOverride || undefined,
      }),
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok || !response.body) {
      const textBody = await response.text();
      throw new Error(textBody || `Request failed with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalPayload: StreamDonePayload | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      for (const line of parts) {
        if (!line.trim()) continue;
        const payload = JSON.parse(line) as StreamEventPayload;
        finalPayload = handleStreamEvent(payload, handlers) ?? finalPayload;
      }
    }

    const remainder = buffer + decoder.decode();
    if (remainder.trim()) {
      const payload = JSON.parse(remainder) as StreamEventPayload;
      finalPayload = handleStreamEvent(payload, handlers) ?? finalPayload;
    }

    return finalPayload;
  },
  sendMessage: (message: string, provider = 'local-qwen', conversationId?: string, modelOverride?: string | null) =>
    request<AIResponse & { conversationId: string; sessionCostPence: number }>(withDataMode('/api/ai/message'), {
      method: 'POST',
      body: JSON.stringify({
        message,
        provider,
        conversation_id: conversationId,
        model: modelOverride || undefined,
      }),
    }),
};
