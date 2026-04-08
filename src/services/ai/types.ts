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
    id: 'local-qwen',
    name: 'Local Mind',
    model: 'qwen3.5:35b',
    costPerSession: 'Private on Mac',
    costRaw: 0,
    tier: 'free',
    capabilities: ['private therapist chat', 'daily insights', 'pattern synthesis'],
    isAvailable: true,
  },
];

export const MOCK_COSTS_PER_MESSAGE: Record<string, number> = {
  'local-qwen': 0,
};
