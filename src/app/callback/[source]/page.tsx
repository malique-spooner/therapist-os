'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { api } from '@/lib/api';

const SOURCE_MAP: Record<string, string> = {
  spotify: 'spotify',
  truelayer: 'truelayer',
  'google-drive': 'google_drive',
};

export default function DataSourceCallbackPage() {
  const router = useRouter();
  const params = useParams<{ source: string }>();
  const searchParams = useSearchParams();
  const sourceId = useMemo(() => SOURCE_MAP[params.source] ?? params.source, [params.source]);
  const [status, setStatus] = useState<'working' | 'success' | 'error'>('working');
  const [message, setMessage] = useState('Finishing your connection...');

  useEffect(() => {
    let active = true;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    void api.completeDataSourceAuthorization(sourceId, { code, state, error }).then((result) => {
      if (!active) return;
      setStatus(result.source.connected ? 'success' : 'error');
      setMessage(result.detail);
    }).catch((err: Error) => {
      if (!active) return;
      setStatus('error');
      setMessage(err.message || 'Could not finish the connection.');
    });

    return () => { active = false; };
  }, [searchParams, sourceId]);

  useEffect(() => {
    if (status !== 'success') return;
    const timer = window.setTimeout(() => {
      router.replace(`/?settings=1&source=${encodeURIComponent(sourceId)}`);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [router, sourceId, status]);

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
    >
      <div className="mx-auto max-w-md rounded-[32px] p-6" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
          Therapist OS
        </p>
        <h1 className="mt-3 font-display text-3xl">
          {status === 'working' ? 'Connecting source' : status === 'success' ? 'Connection complete' : 'Connection issue'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {message}
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href={`/?settings=1&source=${encodeURIComponent(sourceId)}`}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
          >
            Return to Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
