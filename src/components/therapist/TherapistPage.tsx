'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, MessagesSquare, Plus, X } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { BudgetBanner } from './BudgetBanner';
import { useSessionStore, type Message } from '@/store/session';
import { useSettingsStore } from '@/store/settings';
import { api, type ConversationPayload, type ConversationMessagePayload } from '@/lib/api';
import { formatCost } from '@/lib/costCalculator';


interface TherapistPageProps {
  onBack?: () => void;
  onSettings?: () => void;
  preloadedContext?: string | null;
  onClearContext: () => void;
}

export function TherapistPage({ onBack, onSettings, preloadedContext, onClearContext }: TherapistPageProps) {
  const { messages, isTyping, addMessage, updateMessage, replaceMessages, setTyping, setLiveState, clearSession } = useSessionStore();
  const { addBudgetSpent, activeProvider, localModel, ttsProvider, ttsVoice } = useSettingsStore();

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionCost, setSessionCost] = useState(0);
  const [conversations, setConversations] = useState<ConversationPayload[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const openingInjected = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);

  async function loadOrStartConversation(context?: string | null) {
    try {
      const started = await api.startConversation(activeProvider, context, localModel);
      replaceMessages(started.openingMessage ? mapConversationMessages([started.openingMessage]) : []);
      setConversationId(started.id);
      setSessionCost(0);
      openingInjected.current = true;
      if (context) {
        onClearContext();
        await sendMessage(`I wanted to explore this insight: "${context}"`, started.id);
      }
      await loadConversations();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Therapist setup failed.';
      replaceMessages([{
        id: `opening-error-${Date.now()}`,
        role: 'ai',
        content: `Therapist could not load properly yet. ${message}`,
        timestamp: new Date(),
      }]);
    }
  }

  function resetConversation() {
    clearSession();
    setConversationId(null);
    setSessionCost(0);
    openingInjected.current = false;
    void loadOrStartConversation();
  }

  function summariseConversation(conversation: ConversationPayload) {
    const firstUserMessage = conversation.messages.find((message) => message.role === 'user')?.content;
    const firstAnyMessage = conversation.messages[0]?.content;
    const source = firstUserMessage || firstAnyMessage || 'Untitled conversation';
    return source.length > 54 ? `${source.slice(0, 54).trim()}…` : source;
  }

  function mapConversationMessages(items: ConversationMessagePayload[]) {
    return items.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.createdAt),
      frameworksReferenced: message.frameworksReferenced ?? undefined,
      costPence: message.costPence ?? undefined,
    }));
  }

  async function loadConversations() {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const nextConversations = await api.getConversations();
      setConversations(nextConversations);
    } catch {
      setHistoryError('Could not load previous chats right now.');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openConversation(nextConversation: ConversationPayload) {
    setHistoryError(null);
    setHistoryLoading(true);

    try {
      const conversationMessages = await api.getConversationMessages(nextConversation.id);
      replaceMessages(mapConversationMessages(conversationMessages));
      setConversationId(nextConversation.id);
      setSessionCost(nextConversation.totalCostPence);
      setHistoryOpen(false);
      openingInjected.current = true;
    } catch {
      setHistoryError('Could not open that chat right now.');
    } finally {
      setHistoryLoading(false);
    }
  }

  // Inject opening message on first load — ref guard prevents StrictMode double-invoke
  useEffect(() => {
    if (openingInjected.current) return;
    openingInjected.current = true;
    if (messages.length === 0) {
      void loadOrStartConversation(preloadedContext);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When navigating here with context from Dashboard mid-session, inject it as a prompt
  useEffect(() => {
    if (!preloadedContext || messages.length === 0 || !conversationId) return;
    const prompt = `I wanted to explore this insight: "${preloadedContext}"`;
    onClearContext();
    void sendMessage(prompt);
  }, [preloadedContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const supported = typeof window !== 'undefined'
      && typeof navigator !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia
      && typeof MediaRecorder !== 'undefined';
    setRecordingSupported(supported);

    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      speechAudioRef.current?.pause();
      if (speechAudioRef.current?.src) {
        URL.revokeObjectURL(speechAudioRef.current.src);
      }
    };
  }, []);

  useEffect(() => {
    void loadConversations();
  }, []);

  async function sendMessage(text?: string, forcedConversationId?: string) {
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
    const aiMessageId = (Date.now() + 1).toString();

    try {
      let nextConversationId = forcedConversationId ?? conversationId;
      if (!nextConversationId) {
        const started = await api.startConversation(activeProvider, undefined, localModel);
        nextConversationId = started.id;
        setConversationId(started.id);
      }
      addMessage({
        id: aiMessageId,
        role: 'ai',
        content: '',
        timestamp: new Date(),
      });
      const finalPayload = await api.sendMessageStream(content, activeProvider, nextConversationId ?? undefined, {
        onDelta: (delta) => {
          const current = useSessionStore.getState().messages.find((message) => message.id === aiMessageId)?.content ?? '';
          updateMessage(aiMessageId, { content: current + delta });
        },
      }, localModel);
      const finalMessage = useSessionStore.getState().messages.find((message) => message.id === aiMessageId);
      if (!finalMessage?.content?.trim()) {
        updateMessage(aiMessageId, { content: 'I could not generate a reply just now. Please try again.' });
      }
      if (finalPayload !== null) {
        setConversationId(finalPayload.conversationId);
        setSessionCost(finalPayload.sessionCostPence);
        updateMessage(aiMessageId, {
          frameworksReferenced: finalPayload.frameworksReferenced,
          costPence: finalPayload.costPence,
        });
        if (finalPayload.costPence) addBudgetSpent(finalPayload.costPence);
        const persistedMessages = await api.getConversationMessages(finalPayload.conversationId);
        replaceMessages(mapConversationMessages(persistedMessages));
      }
      await loadConversations();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      const content =
        message.includes('ReadTimeout') || message.includes('timed out')
          ? 'Your local model took too long to answer. Qwen 3.5 35B is reachable, but it is currently too slow for this chat path. Try again, or switch the local chat model to a smaller Ollama model like qwen3.5:27b or qwen3.5:9b.'
          : message.includes('Local Ollama model is not available')
            ? 'The app could not reach your local Ollama model. Check that Ollama is running and that the configured model is installed.'
            : message || 'Something went wrong. Please try again.';
      const existing = useSessionStore.getState().messages.find((item) => item.id === aiMessageId);
      if (existing) {
        updateMessage(aiMessageId, { content });
      } else {
        addMessage({ id: aiMessageId, role: 'ai', content, timestamp: new Date() });
      }
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

  async function toggleRecording() {
    if (!recordingSupported) {
      addMessage({ id: `voice-unavailable-${Date.now()}`, role: 'ai', content: 'Voice recording is not available in this browser.', timestamp: new Date() });
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      setLiveState('processing');
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        try {
          const { text } = await api.transcribeAudio(blob);
          if (text.trim()) {
            await sendMessage(text.trim());
          } else {
            addMessage({ id: `voice-empty-${Date.now()}`, role: 'ai', content: 'I could not hear enough to transcribe that. Try again when you are ready.', timestamp: new Date() });
          }
        } catch {
          addMessage({ id: `voice-error-${Date.now()}`, role: 'ai', content: 'Voice transcription is not ready right now, so I could not turn that into text.', timestamp: new Date() });
          setTyping(false);
          setLiveState('idle');
        }
      };

      recorder.start();
      setIsRecording(true);
      setLiveState('listening');
    } catch {
      addMessage({ id: `voice-permission-${Date.now()}`, role: 'ai', content: 'Microphone access is unavailable, so voice input could not start.', timestamp: new Date() });
    }
  }

  async function speakMessage(message: Message) {
    const alreadySpeaking = speakingMessageId === message.id;
    if (alreadySpeaking) {
      speechAudioRef.current?.pause();
      if (speechAudioRef.current?.src) {
        URL.revokeObjectURL(speechAudioRef.current.src);
      }
      speechAudioRef.current = null;
      setSpeakingMessageId(null);
      return;
    }

    try {
      const audioBlob = await api.synthesizeSpeech(message.content, { provider: ttsProvider, voice: ttsVoice });
      const nextAudio = new Audio(URL.createObjectURL(audioBlob));
      nextAudio.onended = () => {
        URL.revokeObjectURL(nextAudio.src);
        setSpeakingMessageId(null);
      };
      nextAudio.onpause = () => {
        if (nextAudio.ended) return;
        URL.revokeObjectURL(nextAudio.src);
        setSpeakingMessageId(null);
      };
      speechAudioRef.current?.pause();
      if (speechAudioRef.current?.src) {
        URL.revokeObjectURL(speechAudioRef.current.src);
      }
      speechAudioRef.current = nextAudio;
      setSpeakingMessageId(message.id);
      await nextAudio.play();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Local TTS is not available right now.';
      addMessage({
        id: `tts-error-${Date.now()}`,
        role: 'ai',
        content: detail.includes('Piper')
          ? 'Piper read-aloud is not available yet on this machine.'
          : 'Read-aloud is not available right now.',
        timestamp: new Date(),
      });
      setSpeakingMessageId(null);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        showBack={Boolean(onBack)}
        onBack={onBack}
        onSettings={onSettings}
        title="Mind AI Therapist"
        rightElement={
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setHistoryOpen(true);
                void loadConversations();
              }}
              className="p-2 rounded-xl active:scale-90 transition-transform"
              aria-label="All chats"
            >
              <MessagesSquare size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>
            <button onClick={resetConversation} className="p-2 -mr-2 rounded-xl active:scale-90 transition-transform" aria-label="New chat">
              <Plus size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        }
      />

      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.button
              type="button"
              className="absolute inset-0 z-20"
              style={{ backgroundColor: 'rgba(7, 16, 11, 0.28)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              aria-label="Close chat history"
            />
            <motion.aside
              className="absolute top-0 right-0 z-30 h-full w-[86%] max-w-sm border-l"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>All chats</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Reopen previous therapist conversations or start a new one.
                  </p>
                </div>
                <button onClick={() => setHistoryOpen(false)} className="p-2 rounded-xl" aria-label="Close all chats">
                  <X size={18} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => {
                    resetConversation();
                    setHistoryOpen(false);
                  }}
                  className="w-full h-11 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--color-dark)', color: '#fff' }}
                >
                  <Plus size={16} />
                  New chat
                </button>
              </div>

              <div className="overflow-y-auto h-[calc(100%-123px)] px-3 py-3">
                {historyLoading && (
                  <div className="px-3 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Loading chats...
                  </div>
                )}
                {!historyLoading && historyError && (
                  <div className="px-3 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                    {historyError}
                  </div>
                )}
                {!historyLoading && !historyError && conversations.length === 0 && (
                  <div className="px-3 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                    No previous chats yet. Start your first conversation.
                  </div>
                )}
                {!historyLoading && !historyError && conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => { void openConversation(conversation); }}
                    className="w-full text-left rounded-3xl px-4 py-4 mb-3 transition-colors"
                    style={{
                      backgroundColor: conversation.id === conversationId ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
                      border: `1px solid ${conversation.id === conversationId ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                          {summariseConversation(conversation)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(conversation.startedAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                          })} · {conversation.messages.length} messages
                        </p>
                      </div>
                      {conversation.totalCostPence > 0 && (
                        <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                          {formatCost(conversation.totalCostPence)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Model bar */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Local Mind · {localModel} · {ttsProvider === 'kokoro' ? 'Kokoro voice' : 'Piper voice'} · Whisper{sessionCost > 0 ? ` · Session: ${formatCost(sessionCost)}` : ''}
        </span>
        <span className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
          Text reply
        </span>
      </div>

      <BudgetBanner />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSpeak={(message) => { void speakMessage(message); }} isSpeaking={speakingMessageId === msg.id} />
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
            onClick={() => { void toggleRecording(); }}
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
