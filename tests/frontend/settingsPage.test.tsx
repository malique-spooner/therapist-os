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
          { id: 'garmin', name: 'Garmin Connect', category: 'Body - Steps, Sleep, HRV, Workouts', icon: '⌚', connected: false, available: false, lastSync: null, lastSyncStatus: null, connectionHint: 'Add GARMIN_EMAIL and GARMIN_PASSWORD on the backend to enable sync.', lastError: null },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detail: 'Data source connected',
          source: { id: 'garmin', name: 'Garmin Connect', category: 'Body - Steps, Sleep, HRV, Workouts', icon: '⌚', connected: true, available: true, lastSync: 'just now', lastSyncStatus: 'success', connectionHint: null, lastError: null },
        }),
      }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('loads backend-backed data sources and triggers connect actions', async () => {
    const onOpenBrain = vi.fn();
    render(<SettingsPage onBack={() => {}} onOpenBrain={onOpenBrain} />);

    expect(await screen.findByText('Garmin Connect')).toBeInTheDocument();
    expect(screen.getByText(/GARMIN_EMAIL/i)).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText(/Folder: Therapist OS \/ Google Takeout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Brain' })).toBeInTheDocument();
    expect(screen.getByText('Local LLM on Mac')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Connect Garmin Connect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Brain' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sync Garmin Connect now' })).toBeInTheDocument());
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
