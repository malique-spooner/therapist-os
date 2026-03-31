/* eslint-disable @typescript-eslint/no-unused-vars */
import { AIService, AIResponse, SessionContext, LiveSession, MOCK_COSTS_PER_MESSAGE } from './types';
import { getMockResponse } from '@/data/sessions';

function randomDelay() {
  return 800 + Math.random() * 1200;
}

export class MockAIService implements AIService {
  private providerId: string;

  constructor(providerId: string) {
    this.providerId = providerId;
  }

  async sendMessage(message: string, _context: SessionContext): Promise<AIResponse> {
    await new Promise((r) => setTimeout(r, randomDelay()));
    const mock = getMockResponse(message);
    const costPence = MOCK_COSTS_PER_MESSAGE[this.providerId] ?? 0;
    return {
      content: mock.content,
      provider: this.providerId,
      model: this.providerId,
      costPence,
      frameworksReferenced: mock.frameworksReferenced,
    };
  }

  startLiveSession(_context: SessionContext): LiveSession {
    return {
      start: () => {},
      stop: () => {},
      onTranscript: (_cb: (text: string) => void) => {},
      onResponse: (_cb: (response: AIResponse) => void) => {},
    };
  }
}
