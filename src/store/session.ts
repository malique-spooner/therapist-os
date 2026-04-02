import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
  voiceDuration?: number;
  frameworksReferenced?: string[];
  costPence?: number;
  isTyping?: boolean;
}

interface SessionState {
  messages: Message[];
  isTyping: boolean;
  mode: 'async' | 'live';
  liveState: 'idle' | 'listening' | 'processing' | 'speaking';
  preloadedContext: string | null;
  addMessage: (msg: Message) => void;
  setTyping: (v: boolean) => void;
  setMode: (m: 'async' | 'live') => void;
  setLiveState: (s: 'idle' | 'listening' | 'processing' | 'speaking') => void;
  setPreloadedContext: (ctx: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  messages: [],
  isTyping: false,
  mode: 'async',
  liveState: 'idle',
  preloadedContext: null,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setTyping: (isTyping) => set({ isTyping }),
  setMode: (mode) => set({ mode }),
  setLiveState: (liveState) => set({ liveState }),
  setPreloadedContext: (preloadedContext) => set({ preloadedContext }),
  clearSession: () => set({ messages: [], isTyping: false, liveState: 'idle' }),
}));
