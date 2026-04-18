import React from 'react';
import { render, screen } from '@testing-library/react';

import { MessageBubble } from '@/components/therapist/MessageBubble';

describe('MessageBubble', () => {
  it('renders framework chips and response cost', () => {
    render(
      <MessageBubble
        message={{
          id: '1',
          role: 'ai',
          content: 'A thoughtful response',
          timestamp: new Date('2026-04-01T09:00:00Z'),
          frameworksReferenced: ['CBT', 'SDT'],
          costPence: 8,
        }}
      />
    );

    expect(screen.getByText('A thoughtful response')).toBeInTheDocument();
    expect(screen.getByText('CBT')).toBeInTheDocument();
    expect(screen.getByText('SDT')).toBeInTheDocument();
    expect(screen.getByText(/This response: £0.08/)).toBeInTheDocument();
  });
});
