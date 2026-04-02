import type { AIProvider, AIResponse } from '@/services/ai/types';
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

export type NutritionPayload = NutritionDay;
export type RelationshipPayload = RelationshipPerson;
export type RelationshipInteractionPayload = RelationshipInteraction;
export type DailyCheckInPayload = DailyCheckIn;

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
  lastSync: string | null;
  lastSyncStatus: string | null;
  connectionHint: string | null;
  lastError: string | null;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? 'dev-secret-key';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('X-API-Key', API_KEY);
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
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

export const api = {
  getDashboard: (period: string) => request<DashboardPayload>(`/api/dashboard?period=${period}`),
  getHealth: (period: string) => request<HealthPayload[]>(`/api/health?period=${period}`),
  getHealthToday: () => request<HealthPayload>('/api/health/today'),
  syncHealth: () => request<{ detail: string; daysSynced: number; latestDate: string | null }>('/api/health/sync', { method: 'POST' }),
  getFinance: (period: string) => request<FinancePayload[]>(`/api/finance?period=${period}`),
  getFinanceToday: () => request<FinancePayload>('/api/finance/today'),
  syncFinance: () => request<{ detail: string; transactionsSynced: number }>('/api/finance/sync', { method: 'POST' }),
  getConsumption: (period: string) => request<ConsumptionPayload[]>(`/api/consumption?period=${period}`),
  getConsumptionToday: () => request<ConsumptionPayload>('/api/consumption/today'),
  syncConsumption: () => request<{ detail: string; daysSynced: number; latestDate: string | null }>('/api/consumption/sync', { method: 'POST' }),
  getLocation: (period: string) => request<LocationPointPayload[]>(`/api/location?period=${period}`),
  getLocationToday: () => request<LocationSummaryPayload>('/api/location/today'),
  getLocationSummary: (period: string) => request<LocationSummaryPayload[]>(`/api/location/summary?period=${period}`),
  getNutrition: (period: string) => request<NutritionPayload[]>(`/api/nutrition?period=${period}`),
  getTodayNutrition: () => request<NutritionPayload>('/api/nutrition/today'),
  saveTodayNutrition: (payload: Omit<NutritionPayload, 'date'>) =>
    request<NutritionPayload>('/api/nutrition/today', { method: 'POST', body: JSON.stringify(payload) }),
  updateTodayNutrition: (payload: Omit<NutritionPayload, 'date'>) =>
    request<NutritionPayload>('/api/nutrition/today', { method: 'PUT', body: JSON.stringify(payload) }),
  getRelationships: () => request<RelationshipPayload[]>('/api/relationships'),
  createRelationship: (payload: Omit<RelationshipPayload, 'id' | 'avatarColour'>) =>
    request<RelationshipPayload>('/api/relationships', { method: 'POST', body: JSON.stringify(payload) }),
  getRelationshipInteractions: (period: string) =>
    request<RelationshipInteractionPayload[]>(`/api/relationships/interactions?period=${period}`),
  createRelationshipInteraction: (payload: Omit<RelationshipInteractionPayload, 'id' | 'date' | 'timestamp'>) =>
    request<RelationshipInteractionPayload>('/api/relationships/interactions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRelationshipInteraction: (interactionId: string) =>
    request<{ detail: string }>(`/api/relationships/interactions/${interactionId}`, { method: 'DELETE' }),
  getRelationshipsDue: () =>
    request<Array<{ person: RelationshipPayload; daysAgo: number }>>('/api/relationships/due'),
  getCheckins: (period: string) => request<DailyCheckInPayload[]>(`/api/checkins?period=${period}`),
  getTodayCheckin: () => request<DailyCheckInPayload | null>('/api/checkins/today'),
  saveCheckin: (payload: Omit<DailyCheckInPayload, 'date' | 'timestamp'>) =>
    request<DailyCheckInPayload>('/api/checkins', { method: 'POST', body: JSON.stringify(payload) }),
  getCheckinStreak: () => request<{ streak: number }>('/api/checkins/streak'),
  getHabits: () => request<HabitsOverview>('/api/habits'),
  getDataSources: () => request<DataSourcePayload[]>('/api/data-sources'),
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
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const headers = new Headers();
    headers.set('X-API-Key', API_KEY);

    const response = await fetch(`${API_BASE}/api/ai/transcribe`, {
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
  startConversation: (provider: string) =>
    request<{ id: string }>('/api/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),
  sendMessage: (message: string, provider: string, conversationId?: string) =>
    request<AIResponse & { conversationId: string; sessionCostPence: number }>('/api/ai/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        provider,
        conversation_id: conversationId,
      }),
    }),
};
