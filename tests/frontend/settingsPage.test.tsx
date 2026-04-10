import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SettingsPage } from '@/components/settings/SettingsPage';

describe('SettingsPage data sources', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/ai/runtime-options')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            localModels: ['qwen2.5:3b', 'qwen3.5:35b'],
            defaultModel: 'qwen2.5:3b',
            ttsProviders: ['kokoro', 'piper'],
            defaultTtsProvider: 'kokoro',
            defaultTtsVoice: 'af_heart',
            ttsVoices: {
              kokoro: ['af_heart', 'af_bella'],
              piper: ['en_US-lessac-medium'],
            },
            googleMapsApiKey: null,
          }),
        } as Response);
      }

      if (url.endsWith('/api/data-sources')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            { id: 'garmin', name: 'Garmin Connect', category: 'Body - Steps, Sleep, HRV, Workouts', icon: '⌚', connected: false, available: false, connectionState: 'setup-required', lastSync: null, lastSyncStatus: null, connectionHint: 'Add GARMIN_EMAIL and GARMIN_PASSWORD on the backend to enable sync.', lastError: null },
          ]),
        } as Response);
      }

      if (url.includes('/api/data-sources/garmin/setup') && !init?.method) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'garmin',
            name: 'Garmin Connect',
            mode: 'credentials',
            title: 'Connect Garmin Connect',
            description: 'Save your Garmin login so Therapist OS can sync steps, sleep, HRV, and workouts.',
            instructions: [],
            actionLabel: 'Save Garmin login',
            connected: false,
            available: false,
            fields: [
              { key: 'email', label: 'Garmin email', type: 'email', required: true, placeholder: 'you@example.com', hasValue: false, value: null },
              { key: 'password', label: 'Garmin password', type: 'password', required: true, placeholder: 'Password', hasValue: false, value: null },
            ],
            webhookUrl: null,
            callbackUrl: null,
            folderPath: null,
          }),
        } as Response);
      }

      if (url.includes('/api/data-sources/garmin/setup') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            detail: 'Data source connected',
            source: { id: 'garmin', name: 'Garmin Connect', category: 'Body - Steps, Sleep, HRV, Workouts', icon: '⌚', connected: true, available: true, connectionState: 'connected', lastSync: 'just now', lastSyncStatus: 'success', connectionHint: null, lastError: null },
          }),
        } as Response);
      }

      if (url.includes('/api/data-sources/garmin/setup') && !url.endsWith('/api/data-sources/garmin/setup')) {
        return Promise.resolve({ ok: false } as Response);
      }

      if (url.includes('/api/data-sources/garmin/setup')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'garmin',
            name: 'Garmin Connect',
            mode: 'credentials',
            title: 'Connect Garmin Connect',
            description: 'Save your Garmin login so Therapist OS can sync steps, sleep, HRV, and workouts.',
            instructions: [],
            actionLabel: 'Save Garmin login',
            connected: true,
            available: true,
            fields: [
              { key: 'email', label: 'Garmin email', type: 'email', required: true, placeholder: 'you@example.com', hasValue: true, value: 'athlete@example.com' },
              { key: 'password', label: 'Garmin password', type: 'password', required: true, placeholder: 'Password', hasValue: true, value: null },
            ],
            webhookUrl: null,
            callbackUrl: null,
            folderPath: null,
          }),
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
    vi.restoreAllMocks();
  });

  it('loads backend-backed data sources and opens source-specific setup', async () => {
    const onOpenBrain = vi.fn();
    render(<SettingsPage onBack={() => {}} onOpenBrain={onOpenBrain} />);

    expect(await screen.findByText('Garmin Connect')).toBeInTheDocument();
    expect(screen.getByText(/GARMIN_EMAIL/i)).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Google Maps')).toBeInTheDocument();
    expect(screen.getByText(/Folder: Therapist OS \/ Google Takeout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Brain' })).toBeInTheDocument();
    expect(screen.getByText('Therapist LLM')).toBeInTheDocument();
    expect(screen.getByText('Therapist Voice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Connect Garmin Connect' }));
    expect(await screen.findByText('Connect Garmin Connect')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Garmin email *'), { target: { value: 'athlete@example.com' } });
    fireEvent.change(screen.getByLabelText('Garmin password *'), { target: { value: 'topsecret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Garmin login' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Manage Garmin Connect' })).toBeInTheDocument());
    expect(screen.getByText('Connected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Brain' }));
    expect(onOpenBrain).toHaveBeenCalledTimes(1);
  });

  it('shows fallback connections when live status cannot load', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    render(<SettingsPage onBack={() => {}} onOpenBrain={() => {}} />);

    expect(await screen.findByText('Garmin Connect')).toBeInTheDocument();
    expect(screen.getByText('TrueLayer')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText(/Live connection status unavailable/i)).toBeInTheDocument();
  });

  it('shows OwnTracks as waiting for ping after credentials are saved but before the first publish', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/ai/runtime-options')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            localModels: ['qwen2.5:3b'],
            defaultModel: 'qwen2.5:3b',
            ttsProviders: ['kokoro'],
            defaultTtsProvider: 'kokoro',
            defaultTtsVoice: 'af_heart',
            ttsVoices: { kokoro: ['af_heart'] },
            googleMapsApiKey: null,
          }),
        } as Response);
      }

      if (url.endsWith('/api/data-sources')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 'owntracks',
              name: 'OwnTracks',
              category: 'Location - live phone pings and daily movement summaries',
              icon: '📍',
              connected: false,
              available: true,
              connectionState: 'ready',
              lastSync: null,
              lastSyncStatus: null,
              connectionHint: 'Webhook login saved. Open OwnTracks on your phone, use HTTP mode with Basic auth, then send a manual location publish.',
              lastError: null,
              syncBlocked: false,
              syncGuardMessage: null,
              manualSyncAllowed: false,
            },
          ]),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    }) as unknown as typeof fetch;

    render(<SettingsPage onBack={() => {}} onOpenBrain={() => {}} />);

    expect(await screen.findByText('OwnTracks')).toBeInTheDocument();
    expect(screen.getByText('Waiting for ping')).toBeInTheDocument();
  });
});
