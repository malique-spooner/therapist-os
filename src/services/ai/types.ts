export interface AIProvider {
  id: string;
  name: string;
  model: string;
  costPerSession: string;
  costRaw: number; // in pence
  tier: 'free' | 'paid';
  capabilities: string[];
  isAvailable: boolean;
}

export interface SessionContext {
  recentInsight?: string;
  framework?: string;
  dayOfWeek?: number;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  costPence?: number;
  frameworksReferenced?: string[];
}

export interface LiveSession {
  start: () => void;
  stop: () => void;
  onTranscript: (cb: (text: string) => void) => void;
  onResponse: (cb: (response: AIResponse) => void) => void;
}

export interface AIService {
  sendMessage(message: string, context: SessionContext): Promise<AIResponse>;
  startLiveSession(context: SessionContext): LiveSession;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    model: 'gemini-1.5-flash',
    costPerSession: 'Free',
    costRaw: 0,
    tier: 'free',
    capabilities: ['fast', 'good quality'],
    isAvailable: true,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    model: 'gemini-1.5-pro',
    costPerSession: 'Free tier',
    costRaw: 0,
    tier: 'free',
    capabilities: ['better reasoning', 'slower'],
    isAvailable: true,
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku',
    model: 'claude-haiku-4-5',
    costPerSession: '~£0.02 per session',
    costRaw: 2,
    tier: 'paid',
    capabilities: ['fast', 'great reasoning'],
    isAvailable: true,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    model: 'claude-sonnet-4-6',
    costPerSession: '~£0.08 per session',
    costRaw: 8,
    tier: 'paid',
    capabilities: ['best reasoning', 'recommended'],
    isAvailable: true,
  },
  {
    id: 'groq-llama',
    name: 'Groq Llama',
    model: 'llama-3.1-70b',
    costPerSession: 'Free',
    costRaw: 0,
    tier: 'free',
    capabilities: ['very fast', 'good quality'],
    isAvailable: true,
  },
];

export const MOCK_COSTS_PER_MESSAGE: Record<string, number> = {
  'gemini-flash': 0,
  'gemini-pro': 0,
  'claude-haiku': 0.4,
  'claude-sonnet': 1.8,
  'groq-llama': 0,
};
