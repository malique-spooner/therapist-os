import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SettingsPage } from '@/components/settings/SettingsPage';

describe('SettingsPage data sources', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { id: 'garmin', name: 'Garmin Connect', category: 'Body - Steps, Sleep, HRV, Workouts', icon: '⌚', connected: false, available: false, connectionState: 'setup-required', lastSync: null, lastSyncStatus: null, connectionHint: 'Add GARMIN_EMAIL and GARMIN_PASSWORD on the backend to enable sync.', lastError: null },
        ]),
      })
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detail: 'Data source connected',
          source: { id: 'garmin', name: 'Garmin Connect', category: 'Body - Steps, Sleep, HRV, Workouts', icon: '⌚', connected: true, available: true, connectionState: 'connected', lastSync: 'just now', lastSyncStatus: 'success', connectionHint: null, lastError: null },
        }),
      })
      .mockResolvedValueOnce({
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
    expect(screen.getByText(/Folder: Therapist OS \/ Google Takeout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Brain' })).toBeInTheDocument();
    expect(screen.getByText('Local LLM on Mac')).toBeInTheDocument();

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
});
