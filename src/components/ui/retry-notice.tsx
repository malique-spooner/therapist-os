'use client';

interface RetryNoticeProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export function RetryNotice({
  message = 'Could not load data. Tap to retry.',
  onRetry,
  className = '',
}: RetryNoticeProps) {
  return (
    <button
      onClick={() => void onRetry()}
      className={`rounded-3xl p-4 text-left ${className}`.trim()}
      style={{
        backgroundColor: 'var(--color-surface-2)',
        color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
      }}
    >
      {message}
    </button>
  );
}
