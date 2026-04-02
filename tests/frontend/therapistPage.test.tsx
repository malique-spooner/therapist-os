import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TherapistPage } from '@/components/therapist/TherapistPage';
import { useSessionStore } from '@/store/session';
import { useSettingsStore } from '@/store/settings';

describe('TherapistPage live mode', () => {
  const originalFetch = global.fetch;
  const originalMediaDevices = navigator.mediaDevices;

  class FakeDataChannel {
    addEventListener = vi.fn();
    close = vi.fn();
  }

  class FakePeerConnection {
    ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
    channel = new FakeDataChannel();
    addTrack = vi.fn();
    createDataChannel = vi.fn(() => this.channel);
    createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'offer-sdp' }));
    setLocalDescription = vi.fn(async () => undefined);
    setRemoteDescription = vi.fn(async () => undefined);
    close = vi.fn();
  }

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();

    vi.stubGlobal('RTCPeerConnection', FakePeerConnection as unknown as typeof RTCPeerConnection);
    vi.stubGlobal(
      'Audio',
      vi.fn(() => ({
        autoplay: false,
        pause: vi.fn(),
        srcObject: null,
        onplay: null,
        onpause: null,
        onended: null,
      }))
    );
    vi.stubGlobal('confirm', vi.fn(() => true));

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

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/ai/opening-message')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Opening prompt' }),
        } as Response);
      }

      if (url.endsWith('/api/ai/conversations')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        } as Response);
      }

      if (url.endsWith('/api/ai/live/session')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            clientSecret: 'live-secret-123',
            model: 'gpt-realtime',
            voice: 'alloy',
            estimatedCostPerMinutePence: 6,
            warning: 'Live voice currently uses a hosted realtime bridge while local voice is being finished.',
          }),
        } as Response);
      }

      if (url === 'https://api.openai.com/v1/realtime/calls') {
        return Promise.resolve({
          ok: true,
          text: async () => 'answer-sdp',
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
    vi.unstubAllGlobals();
  });

  it('creates a live session after the cost warning is confirmed', async () => {
    render(<TherapistPage onBack={() => {}} preloadedContext={null} onClearContext={() => {}} />);

    expect(await screen.findByText('Opening prompt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /async mode/i }));

    await waitFor(() => {
      expect(screen.getByText(/Live session ready with gpt-realtime/i)).toBeInTheDocument();
    });

    const calls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url));
    expect(calls).toContain('http://localhost:8000/api/ai/live/session');
    expect(calls).toContain('https://api.openai.com/v1/realtime/calls');
  });

  it('shows previous chats and allows starting a new one', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/ai/opening-message')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Opening prompt' }),
        } as Response);
      }

      if (url.endsWith('/api/ai/conversations')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([{
            id: 'conv-1',
            startedAt: '2026-04-01T10:00:00Z',
            endedAt: null,
            sessionType: 'async',
            provider: 'local-qwen',
            model: 'qwen3:30b',
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

      if (url.endsWith('/api/ai/conversations/conv-1/messages')) {
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

    expect(await screen.findByText('Opening prompt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /all chats/i }));

    expect(await screen.findByText('All chats')).toBeInTheDocument();
    expect(screen.getByText(/I felt overwhelmed after work/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /new chat/i })).toHaveLength(2);
  });
});
