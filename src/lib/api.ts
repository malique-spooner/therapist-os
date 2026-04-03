import type { AIProvider, AIResponse } from '@/services/ai/types';
import type { BrainPayload, BrainLayer, BrainVersion, BrainOverview } from '@/lib/brain';
import type { HabitDef } from '@/data/habits';
import type { DayHealth } from '@/data/health';
import type { DayFinance } from '@/data/finance';
import type { NutritionDay } from '@/data/nutrition';
import type { RelationshipInteraction, RelationshipPerson } from '@/data/relationships';
import type { DailyCheckIn } from '@/data/checkins';

export interface HabitHistoryDay {
  date: string;
  values: Record<string, boolean | number | null>;
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

export interface ConsumptionPayload {
  date: string;
  listeningHours: number;
  averageValence: number | null;
  averageEnergy: number | null;
  averageDanceability: number | null;
  newDiscoveries: number;
  topGenres: string[];
  topTracks: Array<{ name?: string; artist?: string; valence?: number; energy?: number }>;
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

export type NutritionPayload = NutritionDay;
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

export type BrainOverviewPayload = BrainOverview;
export type BrainLayerPayload = BrainLayer;
export type BrainVersionPayload = BrainVersion;
export type BrainPayloadResponse = BrainPayload;

export interface DateQuery {
  period?: string;
  startDate?: string;
  endDate?: string;
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? 'dev-secret-key';

function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return 'http://127.0.0.1:8000';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBase = getApiBase();
  const headers = new Headers(init?.headers);
  headers.set('X-API-Key', API_KEY);
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
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

export const api = {
  getDashboard: (period: string) => request<DashboardPayload>(`/api/dashboard?period=${period}`),
  getBrain: () => request<BrainPayloadResponse>('/api/brain'),
  getHealth: (query: string | DateQuery) =>
    request<HealthPayload[]>(withDateQuery('/api/health', typeof query === 'string' ? { period: query } : query)),
  getHealthToday: () => request<HealthPayload>('/api/health/today'),
  syncHealth: () => request<{ detail: string; daysSynced: number; latestDate: string | null }>('/api/health/sync', { method: 'POST' }),
  getFinance: (query: string | DateQuery) =>
    request<FinancePayload[]>(withDateQuery('/api/finance', typeof query === 'string' ? { period: query } : query)),
  getFinanceToday: () => request<FinancePayload>('/api/finance/today'),
  syncFinance: () => request<{ detail: string; transactionsSynced: number }>('/api/finance/sync', { method: 'POST' }),
  getConsumption: (query: string | DateQuery) =>
    request<ConsumptionPayload[]>(withDateQuery('/api/consumption', typeof query === 'string' ? { period: query } : query)),
  getConsumptionToday: () => request<ConsumptionPayload>('/api/consumption/today'),
  syncConsumption: () => request<{ detail: string; daysSynced: number; latestDate: string | null }>('/api/consumption/sync', { method: 'POST' }),
  getLocation: (query: string | DateQuery) =>
    request<LocationPointPayload[]>(withDateQuery('/api/location', typeof query === 'string' ? { period: query } : query)),
  getLocationToday: () => request<LocationSummaryPayload>('/api/location/today'),
  getLocationSummary: (query: string | DateQuery) =>
    request<LocationSummaryPayload[]>(withDateQuery('/api/location/summary', typeof query === 'string' ? { period: query } : query)),
  getLocationCompanions: (date: string) => request<LocationCompanionPayload>(`/api/location/companions?date=${date}`),
  saveLocationCompanions: (date: string, payload: Omit<LocationCompanionPayload, 'date'>) =>
    request<LocationCompanionPayload>(`/api/location/companions?date=${date}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getNutrition: (query: string | DateQuery) =>
    request<NutritionPayload[]>(withDateQuery('/api/nutrition', typeof query === 'string' ? { period: query } : query)),
  getNutritionForDate: (date: string) => request<NutritionPayload>(`/api/nutrition/day?date=${date}`),
  getTodayNutrition: () => request<NutritionPayload>('/api/nutrition/today'),
  saveTodayNutrition: (payload: Omit<NutritionPayload, 'date'>) =>
    request<NutritionPayload>('/api/nutrition/today', { method: 'POST', body: JSON.stringify(payload) }),
  updateTodayNutrition: (payload: Omit<NutritionPayload, 'date'>) =>
    request<NutritionPayload>('/api/nutrition/today', { method: 'PUT', body: JSON.stringify(payload) }),
  saveNutritionForDate: (date: string, payload: Omit<NutritionPayload, 'date'>) =>
    request<NutritionPayload>(`/api/nutrition/day?date=${date}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getRelationships: () => request<RelationshipPayload[]>('/api/relationships'),
  createRelationship: (payload: Omit<RelationshipPayload, 'id' | 'avatarColour'>) =>
    request<RelationshipPayload>('/api/relationships', { method: 'POST', body: JSON.stringify(payload) }),
  getRelationshipInteractions: (query: string | DateQuery) =>
    request<RelationshipInteractionPayload[]>(withDateQuery('/api/relationships/interactions', typeof query === 'string' ? { period: query } : query)),
  createRelationshipInteraction: (payload: Omit<RelationshipInteractionPayload, 'id' | 'timestamp' | 'date'> & { date?: string }) =>
    request<RelationshipInteractionPayload>('/api/relationships/interactions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRelationshipInteraction: (interactionId: string) =>
    request<{ detail: string }>(`/api/relationships/interactions/${interactionId}`, { method: 'DELETE' }),
  getRelationshipsDue: () =>
    request<Array<{ person: RelationshipPayload; daysAgo: number }>>('/api/relationships/due'),
  getRelationshipImports: () =>
    request<RelationshipImportPayload[]>('/api/relationships/imports'),
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
    headers.set('X-API-Key', API_KEY);

    const response = await fetch(`${apiBase}/api/relationships/imports/snapchat`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store',
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
  getCheckins: (period: string) => request<DailyCheckInPayload[]>(`/api/checkins?period=${period}`),
  getTodayCheckin: () => request<DailyCheckInPayload | null>('/api/checkins/today'),
  saveCheckin: (payload: Omit<DailyCheckInPayload, 'date' | 'timestamp'>) =>
    request<DailyCheckInPayload>('/api/checkins', { method: 'POST', body: JSON.stringify(payload) }),
  getCheckinStreak: () => request<{ streak: number }>('/api/checkins/streak'),
  getHabits: () => request<HabitsOverview>('/api/habits'),
  getDataSources: () => request<DataSourcePayload[]>('/api/data-sources'),
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
    request<{ detail: string }>('/api/habits/logs', {
      method: 'POST',
      body: JSON.stringify({ habitId, value, date }),
    }),
  getOpeningMessage: () => request<{ message: string }>('/api/ai/opening-message'),
  transcribeAudio: async (audioBlob: Blob) => {
    const apiBase = getApiBase();
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const headers = new Headers();
    headers.set('X-API-Key', API_KEY);

    const response = await fetch(`${apiBase}/api/ai/transcribe`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}`);
    }

    return response.json() as Promise<TranscriptionPayload>;
  },
  createLiveSession: () => request<LiveSessionPayload>('/api/ai/live/session', { method: 'POST' }),
  getProviders: () => request<AIProvider[]>('/api/ai/providers'),
  getBudgetCurrent: () => request<BudgetPayload>('/api/budget/current'),
  updateBudget: (payload: Omit<BudgetPayload, 'month' | 'spentPence'>) =>
    request<BudgetPayload>('/api/budget', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getConversations: () => request<ConversationPayload[]>('/api/ai/conversations'),
  getConversationMessages: (conversationId: string) =>
    request<ConversationMessagePayload[]>(`/api/ai/conversations/${conversationId}/messages`),
  startConversation: (provider = 'local-qwen') =>
    request<{ id: string }>('/api/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),
  sendMessage: (message: string, provider = 'local-qwen', conversationId?: string) =>
    request<AIResponse & { conversationId: string; sessionCostPence: number }>('/api/ai/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        provider,
        conversation_id: conversationId,
      }),
    }),
};
