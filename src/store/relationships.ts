import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { relationshipInteractions, relationshipPeople, type RelationshipInteraction, type RelationshipPerson } from '@/data/relationships';
import type { DataMode } from '@/store/settings';

interface AddRelationshipInput {
  name: string;
  type: RelationshipPerson['type'];
  tier: RelationshipPerson['tier'];
  desiredFrequencyDays: number;
}

interface LogInteractionInput {
  date?: string;
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
  applyDataMode: (mode: DataMode) => Promise<void>;
  addPerson: (input: AddRelationshipInput) => void;
  addInteraction: (input: LogInteractionInput) => void;
  deleteInteraction: (id: string) => void;
}

const tierColours: Record<RelationshipPerson['tier'], string> = {
  inner: '#2D6A4F',
  middle: '#52B788',
  outer: '#B7E4C7',
};

function buildDue(people: RelationshipPerson[], interactions: RelationshipInteraction[]): DueRelationship[] {
  const lastByPerson = new Map<string, RelationshipInteraction>();
  for (const interaction of interactions) {
    for (const personId of interaction.personIds) {
      lastByPerson.set(personId, interaction);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return people
    .map((person) => {
      const last = lastByPerson.get(person.id);
      const daysAgo = last
        ? Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${last.date}T12:00:00Z`).getTime()) / 86400000)
        : person.desiredFrequencyDays + 1;
      return { person, daysAgo };
    })
    .filter((entry) => entry.daysAgo >= entry.person.desiredFrequencyDays)
    .sort((a, b) => b.daysAgo - a.daysAgo);
}

export const useRelationshipsStore = create<RelationshipsState>()(
  persist(
    (set) => ({
      people: relationshipPeople,
      interactions: relationshipInteractions,
      due: buildDue(relationshipPeople, relationshipInteractions),
      hydrated: false,
      hydrateFromApi: async () => {
        await useRelationshipsStore.getState().applyDataMode('mixed');
      },
      applyDataMode: async (mode) => {
        if (mode === 'demo-only') {
          set({
            people: relationshipPeople,
            interactions: relationshipInteractions,
            due: buildDue(relationshipPeople, relationshipInteractions),
            hydrated: true,
          });
          return;
        }

        try {
          const [people, interactions, due] = await Promise.all([
            api.getRelationships(),
            api.getRelationshipInteractions('3-months'),
            api.getRelationshipsDue(),
          ]);
          set({ people, interactions, due, hydrated: true });
        } catch {
          if (mode === 'real-only') {
            set({ people: [], interactions: [], due: [], hydrated: true });
            return;
          }
          set({
            people: relationshipPeople,
            interactions: relationshipInteractions,
            due: buildDue(relationshipPeople, relationshipInteractions),
            hydrated: true,
          });
        }
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
          const date = input.date ?? new Date(now).toISOString().split('T')[0];
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
