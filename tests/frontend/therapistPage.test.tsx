import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { TherapistPage } from '@/components/therapist/TherapistPage';
import { useSessionStore } from '@/store/session';
import { useSettingsStore } from '@/store/settings';

describe('TherapistPage', () => {
  const originalFetch = global.fetch;
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ enabled: true, stop: vi.fn() }],
          getAudioTracks: () => [{ enabled: true, stop: vi.fn() }],
        })),
      },
    });

    useSessionStore.setState({
      messages: [],
      isTyping: false,
      mode: 'async',
      liveState: 'idle',
      preloadedContext: null,
    });
    useSettingsStore.setState({
      activeProvider: 'local-qwen',
      budgetSpent: 0,
    });

    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/ai/conversations') && !(init as RequestInit | undefined)?.method) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as Response);
      }

      if (url.includes('/api/ai/conversations') && (init as RequestInit | undefined)?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'conv-new',
            openingMessage: null,
          }),
        } as Response);
      }

      if (url.includes('/api/ai/conversations/conv-1/messages')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([{
            id: 'msg-1',
            role: 'user',
            content: 'I felt overwhelmed after work.',
            createdAt: '2026-04-01T10:00:00Z',
            frameworksReferenced: [],
            costPence: 0,
          }]),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    vi.restoreAllMocks();
  });

  it('shows the local whisper voice workflow instead of async/live mode toggles', async () => {
    render(<TherapistPage onBack={() => {}} preloadedContext={null} onClearContext={() => {}} />);

    expect(await screen.findByRole('button', { name: /start recording/i })).toBeInTheDocument();
    expect(screen.getByText(/Kokoro voice/i)).toBeInTheDocument();
    expect(screen.getByText(/Whisper/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /async mode/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('shows previous chats and allows starting a new one', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/ai/conversations') && !init?.method) {
        return Promise.resolve({
          ok: true,
          json: async () => ([{
            id: 'conv-1',
            startedAt: '2026-04-01T10:00:00Z',
            endedAt: null,
            sessionType: 'async',
            provider: 'local-qwen',
            model: 'qwen3.5:35b',
            totalTokensUsed: 240,
            totalCostPence: 0,
            messages: [
              {
                id: 'msg-1',
                role: 'user',
                content: 'I felt overwhelmed after work.',
                createdAt: '2026-04-01T10:00:00Z',
                frameworksReferenced: [],
                costPence: 0,
              },
            ],
          }]),
        } as Response);
      }

      if (url.includes('/api/ai/conversations') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'conv-new',
            openingMessage: null,
          }),
        } as Response);
      }

      if (url.includes('/api/ai/conversations/conv-1/messages')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([{
            id: 'msg-1',
            role: 'user',
            content: 'I felt overwhelmed after work.',
            createdAt: '2026-04-01T10:00:00Z',
            frameworksReferenced: [],
            costPence: 0,
          }]),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    }) as unknown as typeof fetch;

    render(<TherapistPage onBack={() => {}} preloadedContext={null} onClearContext={() => {}} />);

    expect(await screen.findByRole('button', { name: /start recording/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /all chats/i }));

    expect(await screen.findByText('All chats')).toBeInTheDocument();
    expect(screen.getByText(/I felt overwhelmed after work/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /new chat/i })).toHaveLength(2);
  });
});
