'use client';

import { InsightCard } from '@/components/dashboard/InsightCard';

const relationshipInsightCards = [
  {
    id: 'rel-1',
    category: 'Relationships',
    categoryIcon: '🤝',
    lens: 'SDT' as const,
    narrative: 'On weeks with three or more in-person interactions, mood runs about 1.4 points higher on average in this dataset. Relatedness is not a nice-to-have here; it is one of the strongest regulators.',
    action: 'Protect one in-person interaction before the week ends.',
    domainId: 'relationships',
    viewLabel: 'View Relationships',
  },
  {
    id: 'rel-2',
    category: 'Relationships',
    categoryIcon: '📍',
    lens: 'CBT' as const,
    narrative: 'Your most present interactions are almost always in person. Messaging keeps contact alive, but it rarely creates the same emotional reset.',
    action: 'Upgrade one digital thread into voice or in-person contact.',
    domainId: 'relationships',
    viewLabel: 'View Relationships',
  },
  {
    id: 'rel-3',
    category: 'Relationships',
    categoryIcon: '🌙',
    lens: 'CBT' as const,
    narrative: 'When sleep quality drops below 6, interaction frequency tends to fall as well. That social withdrawal then feeds the next mood dip.',
    action: 'Use low-sleep days as a cue to lower the bar, not disappear.',
    domainId: 'relationships',
    viewLabel: 'View Relationships',
  },
  {
    id: 'rel-4',
    category: 'Relationships',
    categoryIcon: '💬',
    lens: 'SDT' as const,
    narrative: 'Alex is the clearest positive mood relationship in the current profile. In-person time with Alex lines up with better mood the following morning more than any other contact.',
    action: 'If you have limited energy, prioritize the connection that actually replenishes you.',
    domainId: 'relationships',
    viewLabel: 'View Relationships',
  },
];

export function RelationshipInsights({ onTalkAboutThis }: { onTalkAboutThis: (context: string) => void }) {
  return (
      <div className="px-4 pb-4 space-y-3">
        {relationshipInsightCards.map((card, index) => (
        <InsightCard key={card.id} insight={card} index={index} onTalkAboutThis={onTalkAboutThis} />
        ))}
      </div>
  );
}
