'use client';

import { FormEvent, useMemo, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

import { api, type AuthUserPayload } from '@/lib/api';

interface LoginGateProps {
  onAuthenticated: (user: AuthUserPayload) => void;
}

export function LoginGate({ onAuthenticated }: LoginGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 8, [email, password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.login({ email: email.trim(), password, remember });
      onAuthenticated(response.user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full px-5 py-8 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f7f5ef 0%, #eef4eb 48%, #dceadf 100%)' }}>
      <div className="w-full max-w-md rounded-[32px] p-6 shadow-[0_24px_80px_rgba(27,67,50,0.16)]" style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(27,67,50,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(82,183,136,0.14)' }}>
            <ShieldCheck size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>Private Access</p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: 'var(--color-dark)' }}>Sign in to Therapist OS</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          The live app now uses a private admin login with a secure session cookie, so you can stay signed in on your own device without exposing the app publicly.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-2xl px-4 text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Password</span>
            <div className="relative">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl pl-11 pr-4 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                placeholder="Your admin password"
              />
              <LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(82,183,136,0.08)', border: '1px solid rgba(82,183,136,0.12)' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>Remember this device for 30 days</span>
          </label>

          {errorMessage && (
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(248,113,113,0.08)', color: '#9f1239', border: '1px solid rgba(248,113,113,0.18)' }}>
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="h-12 w-full rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-dark)', color: '#fff' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
