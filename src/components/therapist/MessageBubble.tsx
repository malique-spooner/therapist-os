'use client';

import { motion } from 'framer-motion';
import { Message } from '@/store/session';
import { formatCost } from '@/lib/costCalculator';

interface MessageBubbleProps {
  message: Message;
}

const lensColors: Record<string, string> = {
  CBT: '#5B8DEF',
  SDT: '#52B788',
  Behaviourism: '#F59E0B',
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div style={{ maxWidth: '80%' }}>
        <div
          className="px-4 py-3 rounded-2xl"
          style={{
            backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-surface-2)',
            borderBottomRightRadius: isUser ? 4 : undefined,
            borderBottomLeftRadius: isUser ? undefined : 4,
            border: isUser ? 'none' : '1px solid var(--color-border)',
          }}
        >
          <p
            className="text-sm leading-relaxed"
            style={{ color: isUser ? '#fff' : 'var(--color-text)' }}
          >
            {message.content}
          </p>
        </div>

        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{time}</span>
          {!isUser && typeof message.costPence === 'number' && message.costPence > 0 && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
              This response: {formatCost(message.costPence)}
            </span>
          )}
          {message.frameworksReferenced && message.frameworksReferenced.length > 0 && (
            <div className="flex gap-1">
              {message.frameworksReferenced.map(fw => (
                <span key={fw} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: lensColors[fw] + '22', color: lensColors[fw], fontSize: 9 }}>
                  {fw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      className="flex justify-start mb-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
    >
      <div
        className="px-4 py-3 rounded-2xl"
        style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderBottomLeftRadius: 4 }}
      >
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--color-text-muted)' }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
