'use client';

import { Check, Zap, Brain, Wind } from 'lucide-react';
import { AIProvider } from '@/services/ai/types';
import { motion } from 'framer-motion';

interface ProviderCardProps {
  provider: AIProvider;
  isSelected: boolean;
  onSelect: () => void;
}

const capabilityIcons: Record<string, React.ReactNode> = {
  fast: <Zap size={12} />,
  'very fast': <Zap size={12} />,
  'best reasoning': <Brain size={12} />,
  'great reasoning': <Brain size={12} />,
  'better reasoning': <Brain size={12} />,
  recommended: <Wind size={12} />,
};

export function ProviderCard({ provider, isSelected, onSelect }: ProviderCardProps) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left p-4 rounded-2xl transition-colors"
      style={{
        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface-2)',
        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm" style={{ color: isSelected ? '#fff' : 'var(--color-text)' }}>
              {provider.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : provider.tier === 'free' ? 'var(--color-light)' : '#FFF3E0',
                color: isSelected ? '#fff' : provider.tier === 'free' ? 'var(--color-dark)' : '#E65100',
              }}>
              {provider.costPerSession}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {provider.capabilities.map((cap) => (
              <span key={cap} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'var(--color-border)',
                  color: isSelected ? '#fff' : 'var(--color-text-muted)',
                }}>
                {capabilityIcons[cap]}
                {cap}
              </span>
            ))}
          </div>
        </div>
        {isSelected && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </div>
        )}
      </div>
    </motion.button>
  );
}
