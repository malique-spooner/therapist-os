import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { relationshipInteractions, relationshipPeople, type RelationshipInteraction, type RelationshipPerson } from '@/data/relationships';

interface AddRelationshipInput {
  name: string;
  type: RelationshipPerson['type'];
  tier: RelationshipPerson['tier'];
  desiredFrequencyDays: number;
}

interface LogInteractionInput {
  personIds: string[];
  type: RelationshipInteraction['type'];
  presenceScore: RelationshipInteraction['presenceScore'];
  feelingWord?: string;
}

interface DueRelationship {
  person: RelationshipPerson;
  daysAgo: number;
}

interface RelationshipsState {
  people: RelationshipPerson[];
  interactions: RelationshipInteraction[];
  due: DueRelationship[];
  hydrated: boolean;
  hydrateFromApi: () => Promise<void>;
  addPerson: (input: AddRelationshipInput) => void;
  addInteraction: (input: LogInteractionInput) => void;
  deleteInteraction: (id: string) => void;
}

const tierColours: Record<RelationshipPerson['tier'], string> = {
  inner: '#2D6A4F',
  middle: '#52B788',
  outer: '#B7E4C7',
};

export const useRelationshipsStore = create<RelationshipsState>()(
  persist(
    (set) => ({
      people: relationshipPeople,
      interactions: relationshipInteractions,
      due: [],
      hydrated: false,
      hydrateFromApi: async () => {
        const [people, interactions, due] = await Promise.all([
          api.getRelationships(),
          api.getRelationshipInteractions('3-months'),
          api.getRelationshipsDue(),
        ]);
        set({ people, interactions, due, hydrated: true });
      },
      addPerson: (input) => {
        const optimisticPerson: RelationshipPerson = {
          id: input.name.toLowerCase().replace(/\s+/g, '-'),
          avatarColour: tierColours[input.tier],
          ...input,
        };
        void api.createRelationship(input).catch(() => {});
        set((state) => ({
          people: [...state.people, optimisticPerson],
        }));
      },
      addInteraction: (input) =>
        set((state) => {
          const now = Date.now();
          const date = new Date(now).toISOString().split('T')[0];
          const interaction: RelationshipInteraction = {
            id: `interaction-${now}`,
            date,
            timestamp: now,
            ...input,
          };
          void api.createRelationshipInteraction(input).catch(() => {});
          return {
            interactions: [...state.interactions, interaction].sort((a, b) => a.timestamp - b.timestamp),
          };
        }),
      deleteInteraction: (id) => {
        void api.deleteRelationshipInteraction(id).catch(() => {});
        set((state) => ({
          interactions: state.interactions.filter((interaction) => interaction.id !== id),
          due: state.due,
        }));
      },
    }),
    {
      name: 'therapist-os-relationships',
      partialize: (state) => ({
        people: state.people,
        interactions: state.interactions,
        due: state.due,
      }),
    }
  )
);
