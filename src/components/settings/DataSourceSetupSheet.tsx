'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Copy, CheckCircle2, Link2 } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { DataSourcePayload, DataSourceSetupPayload } from '@/lib/api';

function relativeDateLabel(timestamp: string) {
  const millis = new Date(timestamp).getTime();
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - millis) / 1000));
  if (deltaSeconds < 60) return 'just now';
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function attemptStatusLabel(status: string) {
  switch (status) {
    case 'success':
      return 'Ping received';
    case 'failed':
      return 'Ping failed';
    default:
      return status.replace(/-/g, ' ');
  }
}

interface DataSourceSetupSheetProps {
  source: DataSourcePayload | null;
  setup: DataSourceSetupPayload | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
  onAuthorize: (source: DataSourcePayload) => Promise<void>;
  onSync: (source: DataSourcePayload) => Promise<void>;
  onDisconnect: (source: DataSourcePayload) => Promise<void>;
}

export function DataSourceSetupSheet({
  source,
  setup,
  open,
  saving,
  onClose,
  onSave,
  onAuthorize,
  onSync,
  onDisconnect,
}: DataSourceSetupSheetProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const instructions = setup?.instructions ?? [];
  const recentAttempts = setup?.recentAttempts ?? [];

  useEffect(() => {
    if (!setup) {
      setValues({});
      setError(null);
      return;
    }

    const nextValues = Object.fromEntries(setup.fields.map((field) => [field.key, field.value ?? '']));
    setValues(nextValues);
    setError(null);
  }, [setup]);

  const incompleteRequiredField = useMemo(() => {
    if (!setup) return null;
    return setup.fields.find((field) => {
      if (!field.required) return false;
      const nextValue = values[field.key]?.trim() ?? '';
      return !nextValue && !field.hasValue;
    }) ?? null;
  }, [setup, values]);

  const statusLabel = useMemo(() => {
    const currentSource = source;
    if (!currentSource) return 'Setup required';
    if (currentSource.syncBlocked) return 'Cooldown';
    if (currentSource.lastSyncStatus === 'failed') return 'Sync failed';
    if (currentSource.lastSyncStatus === 'automatic-only') return 'Automatic only';
    if (currentSource.connected) return 'Connected';
    if (currentSource.connectionState === 'authorization-required') return 'Finish sign-in';
    if (currentSource.id === 'owntracks' && currentSource.available) return 'Waiting for ping';
    if (currentSource.available) return 'Ready to sync';
    return 'Setup required';
  }, [source]);

  const nextSteps = useMemo(() => {
    const currentSource = source;
    if (!currentSource) return [];
    switch (currentSource.id) {
      case 'weather':
        return [
          'Create an OpenWeather API key with One Call access.',
          'Save the key here.',
          'Tap Sync now to confirm weather data can be pulled into Therapist OS.',
        ];
      case 'owntracks':
        return [
          'Save a private username and password here first.',
          'Open OwnTracks on your phone, switch the connection to HTTP mode, and paste the public webhook URL.',
          'Turn Basic authentication on, enter the same username and password, keep WebSockets off, and send a manual location publish.',
          'Come back here and check the recent attempts list to confirm the ping was accepted.',
        ];
      case 'garmin':
        return [
          'Use the same Garmin Connect email and password you use normally.',
          'Save the login here.',
          'Therapist OS will sync Garmin automatically once per day in the background.',
        ];
      case 'truelayer':
        return [
          'Create a TrueLayer app and paste the Client ID and Client Secret here.',
          'Add the callback URL exactly as shown below in the TrueLayer dashboard.',
          'Save the app, then continue with TrueLayer and grant account, balance, card, transaction, and offline access.',
        ];
      default:
        return [];
    }
  }, [source]);

  async function copyToClipboard(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1600);
    } catch {
      setCopiedField(null);
    }
  }

  if (!source || !setup) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (incompleteRequiredField) {
      setError(`${incompleteRequiredField.label} is required.`);
      return;
    }

    setError(null);
    await onSave(values);
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-[32px] border-0 px-0 pb-0"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-lg" style={{ color: 'var(--color-text)' }}>
            {setup.title}
          </SheetTitle>
          <SheetDescription className="leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {setup.description}
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-5">
          <div
            className="rounded-[24px] p-4"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{source.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{source.category}</p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{
                  backgroundColor: source.connected ? 'rgba(82, 183, 136, 0.14)' : 'var(--color-surface)',
                  color: source.connected ? 'var(--color-success)' : 'var(--color-text-muted)',
                }}
              >
                {statusLabel}
              </span>
            </div>
            {setup.folderPath && (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Folder: <span style={{ color: 'var(--color-text)' }}>{setup.folderPath}</span>
              </p>
            )}
            {setup.callbackUrl && (
              <div className="mt-3 rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Callback URL</p>
                    <p className="mt-1 break-all text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>{setup.callbackUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(setup.callbackUrl!, 'callback')}
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    aria-label="Copy callback URL"
                  >
                    {copiedField === 'callback' ? <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} /> : <Copy size={15} style={{ color: 'var(--color-text-muted)' }} />}
                  </button>
                </div>
              </div>
            )}
            {setup.webhookUrl && (
              <div className="mt-3 rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Webhook URL</p>
                    <p className="mt-1 break-all text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>{setup.webhookUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(setup.webhookUrl!, 'webhook')}
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    aria-label="Copy webhook URL"
                  >
                    {copiedField === 'webhook' ? <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} /> : <Copy size={15} style={{ color: 'var(--color-text-muted)' }} />}
                  </button>
                </div>
              </div>
            )}
            {source.connectionHint && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {source.connectionHint}
              </p>
            )}
            {setup.intendedSync && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Intended sync: <span style={{ color: 'var(--color-text)' }}>{setup.intendedSync}</span>
              </p>
            )}
          </div>

          {nextSteps.length > 0 && (
            <div className="mt-4 rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Link2 size={14} style={{ color: 'var(--color-accent)' }} />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
                  Next Steps
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {nextSteps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                    >
                      {index + 1}
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {instructions.length > 0 && (
            <div className="mt-4 rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
                Instructions
              </p>
              <div className="mt-3 space-y-2">
                {instructions.map((instruction) => (
                  <p key={instruction} className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                    {instruction}
                  </p>
                ))}
              </div>
            </div>
          )}

          {recentAttempts.length > 0 && (
            <div className="mt-4 rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
                Recent Sync Attempts
              </p>
              <div className="mt-3 space-y-3">
                {recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text)' }}>
                          {attemptStatusLabel(attempt.status)}
                          {typeof attempt.rowsSynced === 'number' ? ` · ${attempt.rowsSynced} row${attempt.rowsSynced === 1 ? '' : 's'}` : ''}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {relativeDateLabel(attempt.attemptedAt)} · {attempt.trigger}
                        </p>
                      </div>
                      {attempt.cooldownUntil && (
                        <span
                          className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                          style={{ backgroundColor: 'rgba(208, 0, 0, 0.08)', color: 'var(--color-warning)' }}
                        >
                          cooldown
                        </span>
                      )}
                    </div>
                    {attempt.detail && (
                      <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {attempt.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {setup.fields.map((field) => {
              const inputType = field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text';
              const value = values[field.key] ?? '';
              const hint = field.helpText || (field.hasValue && !value && field.type === 'password' ? 'Saved already. Add a new value only if you want to replace it.' : null);
              return (
                <label key={field.key} className="block">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {field.label}
                    {field.required ? ' *' : ''}
                  </span>
                  <input
                    type={inputType}
                    value={value}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.type === 'password' && field.hasValue ? 'Saved value on file' : (field.placeholder ?? '')}
                    className="mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface-2)',
                      color: 'var(--color-text)',
                    }}
                  />
                  {hint && (
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                      {hint}
                    </p>
                  )}
                </label>
              );
            })}

            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(208, 0, 0, 0.08)', color: 'var(--color-warning)' }}>
                {error}
              </div>
            )}

            {source.syncGuardMessage && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(208, 0, 0, 0.08)', color: 'var(--color-warning)' }}>
                {source.syncGuardMessage}
              </div>
            )}

            {!source.syncGuardMessage && source.lastError && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(208, 0, 0, 0.08)', color: 'var(--color-warning)' }}>
                {source.lastError}
              </div>
            )}

            <SheetFooter className="px-0 pb-0 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="h-12 w-full rounded-2xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                {saving ? 'Saving...' : setup.actionLabel}
              </button>

              <div
                className={`grid gap-3 ${
                  setup.canAuthorize
                    ? setup.manualSyncAllowed === false ? 'grid-cols-2' : 'grid-cols-3'
                    : setup.manualSyncAllowed === false ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {setup.canAuthorize && (
                  <button
                    type="button"
                    onClick={() => void onAuthorize(source)}
                    disabled={saving}
                    className="h-11 rounded-2xl text-sm font-semibold"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                    }}
                  >
                    {setup.authActionLabel ?? 'Continue'}
                  </button>
                )}
                {setup.manualSyncAllowed !== false && (
                  <button
                    type="button"
                    onClick={() => void onSync(source)}
                    disabled={saving || !source.available || Boolean(source.syncBlocked)}
                    className="h-11 rounded-2xl text-sm font-semibold"
                    style={{
                      backgroundColor: source.available && !source.syncBlocked ? 'var(--color-dark)' : 'var(--color-border)',
                      color: source.available && !source.syncBlocked ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {source.syncBlocked ? 'Cooling down' : 'Sync now'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onDisconnect(source)}
                  disabled={saving || (!source.connected && !source.available)}
                  className="h-11 rounded-2xl text-sm font-semibold"
                  style={{
                    backgroundColor: source.connected || source.available ? 'var(--color-surface-2)' : 'var(--color-border)',
                    color: source.connected || source.available ? 'var(--color-text)' : 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  Disconnect
                </button>
              </div>
            </SheetFooter>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
