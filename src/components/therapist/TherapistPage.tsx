'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, RefreshCw, Radio } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { Waveform } from './Waveform';
import { BudgetBanner } from './BudgetBanner';
import { useSessionStore } from '@/store/session';
import { useSettingsStore } from '@/store/settings';
import { MockAIService } from '@/services/ai/mock';
import { getOpeningMessage } from '@/data/sessions';


interface TherapistPageProps {
  onBack: () => void;
  preloadedContext?: string | null;
  onClearContext: () => void;
}

export function TherapistPage({ onBack, preloadedContext, onClearContext }: TherapistPageProps) {
  const { messages, isTyping, mode, liveState, addMessage, setTyping, setMode, setLiveState, clearSession } = useSessionStore();
  const { activeProvider, addBudgetSpent } = useSettingsStore();

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiService = useRef(new MockAIService(activeProvider));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const openingInjected = useRef(false);

  // Update service if provider changes
  useEffect(() => {
    aiService.current = new MockAIService(activeProvider);
  }, [activeProvider]);

  // Inject opening message on first load — ref guard prevents StrictMode double-invoke
  useEffect(() => {
    if (openingInjected.current) return;
    openingInjected.current = true;
    if (messages.length === 0) {
      const opening = preloadedContext
        ? `${getOpeningMessage()}\n\nI noticed you wanted to explore: "${preloadedContext}"`
        : getOpeningMessage();
      addMessage({ id: 'opening', role: 'ai', content: opening, timestamp: new Date() });
      if (preloadedContext) onClearContext();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When navigating here with context from Dashboard mid-session, inject it as a prompt
  useEffect(() => {
    if (!preloadedContext || messages.length === 0) return;
    const prompt = `I wanted to explore this insight: "${preloadedContext}"`;
    onClearContext();
    sendMessage(prompt);
  }, [preloadedContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;

    setInput('');

    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    });

    setTyping(true);

    try {
      const response = await aiService.current.sendMessage(content, {});
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.content,
        timestamp: new Date(),
        frameworksReferenced: response.frameworksReferenced,
      });
      if (response.costPence) addBudgetSpent(response.costPence);
    } catch {
      addMessage({ id: (Date.now() + 1).toString(), role: 'ai', content: 'Something went wrong. Please try again.', timestamp: new Date() });
    } finally {
      setTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function toggleLive() {
    if (mode === 'live') {
      setMode('async');
      setLiveState('idle');
      setIsRecording(false);
    } else {
      setMode('live');
      setLiveState('listening');
    }
  }

  function toggleRecording() {
    if (isRecording) {
      setIsRecording(false);
      // Simulate a transcription
      const phrases = ["I've been feeling a bit tired lately", 'Had a good day actually', 'Work has been stressful'];
      const picked = phrases[Math.floor(Math.random() * phrases.length)];
      setTimeout(() => sendMessage(picked), 400);
    } else {
      setIsRecording(true);
    }
  }

  const providerLabel = activeProvider.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        showBack
        onBack={onBack}
        title="AI Therapist"
        rightElement={
          <button onClick={clearSession} className="p-2 -mr-2 rounded-xl active:scale-90 transition-transform" aria-label="New session">
            <RefreshCw size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        }
      />

      {/* Provider + mode bar */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {providerLabel}
        </span>
        <button
          onClick={toggleLive}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-colors"
          style={{
            backgroundColor: mode === 'live' ? 'var(--color-primary)' : 'var(--color-border)',
            color: mode === 'live' ? '#fff' : 'var(--color-text-muted)',
          }}
        >
          <Radio size={10} />
          {mode === 'live' ? 'Live session' : 'Async mode'}
        </button>
      </div>

      <BudgetBanner />

      {/* Live mode waveform banner */}
      <AnimatePresence>
        {mode === 'live' && (
          <motion.div
            className="mx-4 mt-2 mb-1 rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: liveState === 'listening' ? '#FFF3E0' : 'var(--color-surface-2)', border: `1px solid ${liveState === 'listening' ? '#FFCC80' : 'var(--color-border)'}` }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex-1">
              <Waveform isActive={liveState === 'listening' || liveState === 'speaking'} mode={liveState === 'processing' ? 'listening' : liveState === 'idle' ? 'idle' : liveState} />
            </div>
            <span className="text-xs font-medium" style={{ color: liveState === 'listening' ? '#D97706' : 'var(--color-text-muted)' }}>
              {liveState === 'listening' ? 'Listening...' : liveState === 'speaking' ? 'Speaking...' : 'Ready'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pt-2 pb-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-end gap-2">
          <div
            className="flex-1 flex items-end rounded-2xl px-3 py-2"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', minHeight: 44 }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind?"
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed"
              style={{ color: 'var(--color-text)', maxHeight: 100 }}
            />
          </div>

          {/* Voice button */}
          <motion.button
            onTouchStart={toggleRecording}
            onMouseDown={toggleRecording}
            whileTap={{ scale: 0.9 }}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: isRecording ? 'var(--color-warning)' : 'var(--color-surface-2)',
              border: `1px solid ${isRecording ? 'var(--color-warning)' : 'var(--color-border)'}`,
            }}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <AnimatePresence mode="wait">
              {isRecording
                ? <motion.div key="recording" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <MicOff size={18} color="#fff" />
                  </motion.div>
                : <motion.div key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Mic size={18} style={{ color: 'var(--color-text-muted)' }} />
                  </motion.div>
              }
            </AnimatePresence>
          </motion.button>

          {/* Send button */}
          <motion.button
            onClick={() => sendMessage()}
            whileTap={{ scale: 0.9 }}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: input.trim() ? 'var(--color-primary)' : 'var(--color-border)' }}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <Send size={16} color={input.trim() ? '#fff' : 'var(--color-text-muted)'} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
