'use client';

import { useMemo, useState } from 'react';

import type { RelationshipImportPayload, RelationshipPayload } from '@/lib/api';

interface SnapchatImportCardProps {
  people: RelationshipPayload[];
  imports: RelationshipImportPayload[];
  onImport: (payload: {
    file: File;
    capturedAt?: string | null;
    matchedPersonIds: string[];
    detectedLabels: string[];
    note?: string | null;
  }) => Promise<void>;
}

export function SnapchatImportCard({ people, imports, onImport }: SnapchatImportCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [labelsInput, setLabelsInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fileCapturedAt = useMemo(
    () => (file ? new Date(file.lastModified).toISOString() : null),
    [file],
  );

  function togglePerson(personId: string) {
    setSelectedIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]
    );
  }

  async function submit() {
    if (!file) return;

    setSaving(true);
    try {
      await onImport({
        file,
        capturedAt: fileCapturedAt,
        matchedPersonIds: selectedIds,
        detectedLabels: labelsInput
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        note: note.trim() || null,
      });
      setFile(null);
      setSelectedIds([]);
      setLabelsInput('');
      setNote('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="rounded-[28px] p-4 space-y-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Snapchat best friends import</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Upload a best-friends screenshot, keep the screenshot timestamp, and match the visible people to your relationships for later pattern work.
          </p>
        </div>

        <label
          className="block rounded-2xl px-4 py-4 text-sm cursor-pointer"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px dashed var(--color-border)', color: 'var(--color-text)' }}
        >
          <span className="font-medium">{file ? file.name : 'Choose Snapchat screenshot'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            We store the screenshot metadata and your manual matches. OCR can be layered in later.
          </p>
        </label>

        {fileCapturedAt && (
          <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Captured</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text)' }}>
              {new Date(fileCapturedAt).toLocaleString()}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Match to people</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {people.map((person) => {
              const selected = selectedIds.includes(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => togglePerson(person.id)}
                  className="flex-shrink-0 rounded-2xl px-3 py-2"
                  style={{
                    backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: selected ? '#fff' : 'var(--color-text)',
                    border: `1px solid ${selected ? 'transparent' : 'var(--color-border)'}`,
                  }}
                >
                  {person.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Names seen in screenshot</p>
          <input
            value={labelsInput}
            onChange={(event) => setLabelsInput(event.target.value)}
            placeholder="alex, jamie, priya"
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Import note</p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional context about where this screenshot came from"
            className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>

        <button
          onClick={() => { void submit(); }}
          disabled={!file || saving}
          className="w-full rounded-2xl h-12 font-semibold"
          style={{ backgroundColor: file ? 'var(--color-dark)' : 'var(--color-border)', color: file ? '#fff' : 'var(--color-text-muted)' }}
        >
          {saving ? 'Importing screenshot...' : 'Import screenshot'}
        </button>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Recent imports</p>
          {imports.length === 0 && (
            <div className="rounded-2xl px-3 py-3 text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              No Snapchat imports yet.
            </div>
          )}
          {imports.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.filename}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {item.capturedAt ? new Date(item.capturedAt).toLocaleString() : 'No capture time'}
              </p>
              {item.detectedLabels.length > 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Labels: {item.detectedLabels.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
