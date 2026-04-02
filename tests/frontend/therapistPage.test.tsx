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
      activeProvider: 'claude-sonnet',
      budgetSpent: 0,
    });

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Opening prompt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clientSecret: 'live-secret-123',
          model: 'gpt-realtime',
          voice: 'alloy',
          estimatedCostPerMinutePence: 6,
          warning: 'Live mode uses OpenAI Realtime and costs about 6 pence per minute.',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => 'answer-sdp',
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
});
