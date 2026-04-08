import { create } from 'zustand';
import { api } from '@/lib/api';
import type { RelationshipInteraction, RelationshipPerson } from '@/data/relationships';
import { useSettingsStore } from '@/store/settings';

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
  applyDataMode: () => Promise<void>;
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
  (set) => ({
    people: [],
    interactions: [],
    due: [],
    hydrated: false,
    hydrateFromApi: async () => {
      await useRelationshipsStore.getState().applyDataMode();
    },
    applyDataMode: async () => {
      set({ people: [], interactions: [], due: [], hydrated: false });
      try {
        const [people, interactions, due] = await Promise.all([
          api.getRelationships(),
          api.getRelationshipInteractions('3-months'),
          api.getRelationshipsDue(),
        ]);
        set({ people, interactions, due, hydrated: true });
      } catch {
        set({ people: [], interactions: [], due: [], hydrated: true });
      }
    },
    addPerson: (input) => {
      void api.createRelationship(input).catch(() => {});
      if (useSettingsStore.getState().dataMode !== 'real-only') return;

      const optimisticPerson: RelationshipPerson = {
        id: input.name.toLowerCase().replace(/\s+/g, '-'),
        avatarColour: tierColours[input.tier],
        ...input,
      };
      set((state) => ({
        people: [...state.people, optimisticPerson],
      }));
    },
    addInteraction: (input) => {
      void api.createRelationshipInteraction(input).catch(() => {});
      if (useSettingsStore.getState().dataMode !== 'real-only') return;

      set((state) => {
        const now = Date.now();
        const date = input.date ?? new Date(now).toISOString().split('T')[0];
        const interaction: RelationshipInteraction = {
          id: `interaction-${now}`,
          date,
          timestamp: now,
          ...input,
        };
        return {
          interactions: [...state.interactions, interaction].sort((a, b) => a.timestamp - b.timestamp),
          due: buildDue(state.people, [...state.interactions, interaction]),
        };
      });
    },
    deleteInteraction: (id) => {
      void api.deleteRelationshipInteraction(id).catch(() => {});
      if (useSettingsStore.getState().dataMode !== 'real-only') return;

      set((state) => {
        const interactions = state.interactions.filter((interaction) => interaction.id !== id);
        return {
          interactions,
          due: buildDue(state.people, interactions),
        };
      });
    },
  })
);
