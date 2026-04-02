import React from 'react';
import { render, screen } from '@testing-library/react';

import { HabitsPage } from '@/components/habits/HabitsPage';

describe('HabitsPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        habits: [
          { id: 'workout', name: 'Read 10 pages', subLabel: 'reading habit', category: 'Mind', categoryIcon: '📚', type: 'boolean', frequency: 'daily' },
        ],
        todayCompletions: {},
        history: [],
        weeklyCompletion: 35,
        streaks: {},
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders identity-style habit cards with hold-to-complete copy', async () => {
    render(<HabitsPage onSettings={() => {}} />);

    expect(await screen.findByText('Read 10 pages')).toBeInTheDocument();
    expect(screen.getByText('Hold to complete')).toBeInTheDocument();
  });
});
