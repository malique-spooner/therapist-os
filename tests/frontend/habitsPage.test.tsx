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
          { id: 'workout', name: 'I will read 10 pages after lunch because I want my mind to keep growing.', subLabel: null, category: 'Mind', categoryIcon: '📚', type: 'boolean', frequency: 'daily' },
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

  it('renders the simplified good and bad habits tracker', async () => {
    render(<HabitsPage onSettings={() => {}} />);

    expect((await screen.findAllByText('I will read 10 pages after lunch because I want my mind to keep growing.')).length).toBeGreaterThan(0);
    expect(screen.getByText('Habits')).toBeInTheDocument();
    expect(screen.getByText('Good habits')).toBeInTheDocument();
    expect(screen.getByText('Bad habits')).toBeInTheDocument();
    expect(screen.getByText('Habit calendar')).toBeInTheDocument();
  });
});
