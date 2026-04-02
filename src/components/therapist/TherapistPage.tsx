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
import { api } from '@/lib/api';
import { formatCost } from '@/lib/costCalculator';


interface TherapistPageProps {
  onBack?: () => void;
  onSettings?: () => void;
  preloadedContext?: string | null;
  onClearContext: () => void;
}

export function TherapistPage({ onBack, onSettings, preloadedContext, onClearContext }: TherapistPageProps) {
  const { messages, isTyping, mode, liveState, addMessage, setTyping, setMode, setLiveState, clearSession } = useSessionStore();
  const { activeProvider, addBudgetSpent } = useSettingsStore();

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionCost, setSessionCost] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const openingInjected = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const liveClientSecretRef = useRef<string | null>(null);
  const livePeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const liveDataChannelRef = useRef<RTCDataChannel | null>(null);
  const liveAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveTranscriptIdsRef = useRef<Set<string>>(new Set());
  const liveResponseIdsRef = useRef<Set<string>>(new Set());

  async function injectOpeningMessage() {
    try {
      const { message } = await api.getOpeningMessage();
      addMessage({ id: `opening-${Date.now()}`, role: 'ai', content: message, timestamp: new Date() });
    } catch {
      addMessage({ id: `opening-${Date.now()}`, role: 'ai', content: 'I’m here with your recent patterns in mind. What feels most worth exploring today?', timestamp: new Date() });
    }
  }

  function resetConversation() {
    clearSession();
    setConversationId(null);
    setSessionCost(0);
    openingInjected.current = false;
    void injectOpeningMessage();
  }

  // Inject opening message on first load — ref guard prevents StrictMode double-invoke
  useEffect(() => {
    if (openingInjected.current) return;
    openingInjected.current = true;
    if (messages.length === 0) {
      void api.getOpeningMessage().then(({ message }) => {
        const opening = preloadedContext
          ? `${message}\n\nI noticed you wanted to explore: "${preloadedContext}"`
          : message;
        addMessage({ id: 'opening', role: 'ai', content: opening, timestamp: new Date() });
        if (preloadedContext) onClearContext();
      }).catch(() => {
        addMessage({ id: 'opening', role: 'ai', content: 'I’m here with your recent patterns in mind. What feels most worth exploring today?', timestamp: new Date() });
      });
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

  useEffect(() => {
    const supported = typeof window !== 'undefined'
      && typeof navigator !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia
      && typeof MediaRecorder !== 'undefined';
    setRecordingSupported(supported);

    return () => {
      mediaRecorderRef.current?.stop();
      cleanupLiveSession();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function extractLiveResponseText(event: Record<string, unknown>): string {
    const response = event.response as { output?: Array<{ id?: string; content?: Array<{ type?: string; text?: string; transcript?: string }> }> } | undefined;
    if (!response?.output) return '';

    const parts = response.output.flatMap((item) => item.content ?? []);
    return parts
      .map((part) => part.text ?? part.transcript ?? '')
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  function cleanupLiveSession() {
    liveDataChannelRef.current?.close();
    liveDataChannelRef.current = null;
    livePeerConnectionRef.current?.close();
    livePeerConnectionRef.current = null;
    liveAudioRef.current?.pause();
    if (liveAudioRef.current) {
      liveAudioRef.current.srcObject = null;
    }
    liveAudioRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    liveClientSecretRef.current = null;
  }

  function handleLiveEvent(rawEvent: MessageEvent<string>) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawEvent.data);
    } catch {
      return;
    }

    const eventType = String(event.type ?? '');
    if (eventType === 'input_audio_buffer.speech_started') {
      setLiveState('listening');
      return;
    }
    if (eventType === 'input_audio_buffer.speech_stopped') {
      setLiveState('processing');
      return;
    }
    if (eventType === 'conversation.item.input_audio_transcription.completed') {
      const itemId = String(event.item_id ?? '');
      const transcript = String(event.transcript ?? '').trim();
      if (transcript && !liveTranscriptIdsRef.current.has(itemId)) {
        liveTranscriptIdsRef.current.add(itemId);
        addMessage({
          id: itemId || `live-user-${Date.now()}`,
          role: 'user',
          content: transcript,
          timestamp: new Date(),
          isVoice: true,
        });
      }
      return;
    }
    if (eventType === 'response.done') {
      const responseId = String(event.response_id ?? (event.response as { id?: string } | undefined)?.id ?? '');
      const content = extractLiveResponseText(event);
      if (content && !liveResponseIdsRef.current.has(responseId)) {
        if (responseId) liveResponseIdsRef.current.add(responseId);
        addMessage({
          id: responseId || `live-ai-${Date.now()}`,
          role: 'ai',
          content,
          timestamp: new Date(),
        });
      }
      setLiveState('listening');
    }
  }

  async function connectLiveSession(clientSecret: string) {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('Realtime audio is not supported in this browser');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const peerConnection = new RTCPeerConnection();
    livePeerConnectionRef.current = peerConnection;

    const audioEl = new Audio();
    audioEl.autoplay = true;
    audioEl.onplay = () => setLiveState('speaking');
    audioEl.onpause = () => setLiveState('listening');
    audioEl.onended = () => setLiveState('listening');
    liveAudioRef.current = audioEl;

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        audioEl.srcObject = remoteStream;
      }
    };

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    const dataChannel = peerConnection.createDataChannel('oai-events');
    liveDataChannelRef.current = dataChannel;
    dataChannel.addEventListener('message', handleLiveEvent);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp ?? '',
    });

    if (!response.ok) {
      throw new Error(`Realtime connection failed with ${response.status}`);
    }

    const answer = await response.text();
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: answer });
  }

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
      const response = await api.sendMessage(content, activeProvider, conversationId ?? undefined);
      setConversationId(response.conversationId);
      setSessionCost(response.sessionCostPence);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.content,
        timestamp: new Date(),
        frameworksReferenced: response.frameworksReferenced,
        costPence: response.costPence,
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

  async function toggleLive() {
    if (mode === 'live') {
      setMode('async');
      setLiveState('idle');
      setIsRecording(false);
      mediaRecorderRef.current?.stop();
      cleanupLiveSession();
      return;
    }

    const confirmed = window.confirm(
      "Live mode uses OpenAI's Realtime API.\nEstimated cost: ~£0.06 per minute.\nA 10-minute session costs approximately £0.60.\n\nContinue?"
    );
    if (!confirmed) {
      return;
    }

    try {
      const session = await api.createLiveSession();
      await connectLiveSession(session.clientSecret);
      liveClientSecretRef.current = session.clientSecret;
      liveTranscriptIdsRef.current.clear();
      liveResponseIdsRef.current.clear();
      setMode('live');
      setLiveState('listening');
      setIsRecording(true);
      addMessage({
        id: `live-session-${Date.now()}`,
        role: 'ai',
        content: `Live session ready with ${session.model}. ${session.warning} Use the mic button to mute or unmute yourself.`,
        timestamp: new Date(),
      });
    } catch {
      cleanupLiveSession();
      addMessage({
        id: `live-session-error-${Date.now()}`,
        role: 'ai',
        content: 'Live mode is not available right now. Check the OpenAI setup and try again.',
        timestamp: new Date(),
      });
    }
  }

  async function toggleRecording() {
    if (mode === 'live') {
      const tracks = mediaStreamRef.current?.getAudioTracks() ?? [];
      if (tracks.length === 0) {
        addMessage({ id: `live-audio-missing-${Date.now()}`, role: 'ai', content: 'Live audio is not connected right now.', timestamp: new Date() });
        return;
      }

      const currentlyEnabled = tracks.some((track) => track.enabled);
      tracks.forEach((track) => {
        track.enabled = !currentlyEnabled;
      });
      setIsRecording(!currentlyEnabled);
      setLiveState(currentlyEnabled ? 'idle' : 'listening');
      return;
    }

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

  const providerLabel = activeProvider.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        showBack={Boolean(onBack)}
        onBack={onBack}
        onSettings={onSettings}
        title="AI Therapist"
        rightElement={
          <button onClick={resetConversation} className="p-2 -mr-2 rounded-xl active:scale-90 transition-transform" aria-label="New session">
            <RefreshCw size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        }
      />

      {/* Provider + mode bar */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {providerLabel}{sessionCost > 0 ? ` · Session: ${formatCost(sessionCost)}` : ''}
        </span>
        <button
          onClick={() => { void toggleLive(); }}
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
