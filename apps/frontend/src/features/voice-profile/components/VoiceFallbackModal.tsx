'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useImportVoiceManual } from '@/features/voice-profile';

interface VoiceFallbackModalProps {
  open: boolean;
  onClose: () => void;
}

type TabId = 'paste' | 'style';

type StylePreset = {
  value: string;
  label: string;
  description: string;
};

const STYLE_PRESETS: StylePreset[] = [
  { value: 'concise', label: 'Concise & Direct', description: 'Short, clear sentences that get straight to the point.' },
  { value: 'storytelling', label: 'Storytelling', description: 'Narrative-driven posts that pull readers in.' },
  { value: 'educational', label: 'Educational', description: 'Structured explanations with clear steps and examples.' },
  { value: 'humorous', label: 'Humorous', description: 'Light-hearted tone with wit and unexpected comparisons.' },
  { value: 'professional', label: 'Professional', description: 'Authoritative and measured, backed by data or experience.' },
  { value: 'custom', label: 'Describe your own', description: 'Write a description of your preferred style.' },
];

export function VoiceFallbackModal({ open, onClose }: VoiceFallbackModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('paste');
  const [textUnits, setTextUnits] = useState<string[]>(['']);
  const [selectedPreset, setSelectedPreset] = useState<string>('concise');
  const [customDescription, setCustomDescription] = useState('');

  const mutation = useImportVoiceManual();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'voice-fallback-modal-title';
  const pasteTabPanelId = 'tabpanel-paste';
  const styleTabPanelId = 'tabpanel-style';

  // ESC close + focus trap
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus first focusable element on open
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [open]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setActiveTab('paste');
      setTextUnits(['']);
      setSelectedPreset('concise');
      setCustomDescription('');
      mutation.reset();
    }
  // mutation.reset intentionally excluded — including it causes an infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // Tab 1 handlers
  function handleAddTextUnit() {
    setTextUnits((prev) => [...prev, '']);
  }

  function handleTextUnitChange(index: number, value: string) {
    setTextUnits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleRemoveTextUnit(index: number) {
    setTextUnits((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePasteSubmit() {
    const nonEmpty = textUnits.filter((t) => t.trim().length > 0);
    mutation.mutate(
      { method: 'paste', textUnits: nonEmpty },
      { onSuccess: () => onClose() },
    );
  }

  // Tab 2 handlers
  function handleStyleSubmit() {
    if (selectedPreset === 'custom') {
      mutation.mutate(
        { method: 'custom', customDescription },
        { onSuccess: () => onClose() },
      );
    } else {
      mutation.mutate(
        { method: 'preset', presetId: selectedPreset },
        { onSuccess: () => onClose() },
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden="false"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface-elevated p-6 shadow-2xl"
      >
        {/* Info message */}
        <p
          id={titleId}
          className="mb-5 text-sm text-text-secondary leading-relaxed"
        >
          Your Threads account doesn&apos;t have enough posts yet. Set up your voice manually below.
        </p>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Choose voice setup method"
          className="mb-5 flex gap-1 rounded-lg border border-border bg-surface p-1"
        >
          <button
            role="tab"
            id="tab-paste"
            aria-selected={activeTab === 'paste'}
            aria-controls={pasteTabPanelId}
            onClick={() => {
              setActiveTab('paste');
              mutation.reset();
            }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'paste'
                ? 'bg-surface-elevated text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Paste your writing
          </button>
          <button
            role="tab"
            id="tab-style"
            aria-selected={activeTab === 'style'}
            aria-controls={styleTabPanelId}
            onClick={() => {
              setActiveTab('style');
              mutation.reset();
            }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'style'
                ? 'bg-surface-elevated text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Choose a style
          </button>
        </div>

        {/* Tab 1 — Paste your writing */}
        <div
          role="tabpanel"
          id={pasteTabPanelId}
          aria-labelledby="tab-paste"
          hidden={activeTab !== 'paste'}
          className="space-y-4"
        >
          <p className="text-xs text-text-muted">
            Paste 3 or more writing samples for a more accurate analysis.
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {textUnits.map((unit, index) => (
              <div key={index} className="flex gap-2 items-start">
                <textarea
                  id={`text-unit-${index}`}
                  aria-label={`Writing sample ${index + 1}`}
                  value={unit}
                  onChange={(e) => handleTextUnitChange(index, e.target.value)}
                  rows={3}
                  placeholder={`Paste writing sample ${index + 1}`}
                  className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                />
                {textUnits.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove sample ${index + 1}`}
                    onClick={() => handleRemoveTextUnit(index)}
                    className="mt-1 rounded-md p-1.5 text-text-muted hover:text-error hover:bg-error-dim transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddTextUnit}
            className="w-full text-sm"
          >
            + Add sample
          </Button>

          {mutation.isError && (
            <Alert>{(mutation.error as Error).message}</Alert>
          )}

          <Button
            type="button"
            loading={mutation.isPending}
            loadingText="Analyzing..."
            onClick={handlePasteSubmit}
            disabled={!textUnits.some((t) => t.trim().length >= 20)}
            className="w-full"
          >
            Analyze
          </Button>
        </div>

        {/* Tab 2 — Choose a style */}
        <div
          role="tabpanel"
          id={styleTabPanelId}
          aria-labelledby="tab-style"
          hidden={activeTab !== 'style'}
          className="space-y-4"
        >
          <div
            role="radiogroup"
            aria-label="Select writing style"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {STYLE_PRESETS.map((preset) => (
              <label
                key={preset.value}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-primary/50 ${
                  selectedPreset === preset.value
                    ? 'border-primary/50 bg-primary/10 text-text-primary'
                    : 'border-border bg-surface text-text-secondary hover:border-border-hover'
                }`}
              >
                <input
                  type="radio"
                  name="style-preset"
                  value={preset.value}
                  checked={selectedPreset === preset.value}
                  onChange={() => setSelectedPreset(preset.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{preset.label}</span>
                <span className="text-xs text-text-muted">{preset.description}</span>
              </label>
            ))}
          </div>

          {selectedPreset === 'custom' && (
            <div className="space-y-1.5">
              <label
                htmlFor="custom-description"
                className="block text-sm font-medium text-text-secondary"
              >
                Style description
              </label>
              <textarea
                id="custom-description"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={4}
                placeholder="e.g. I avoid jargon and keep things conversational, focusing on actionable tips readers can use right away."
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>
          )}

          {mutation.isError && (
            <Alert>{(mutation.error as Error).message}</Alert>
          )}

          <Button
            type="button"
            loading={mutation.isPending}
            loadingText="Saving..."
            onClick={handleStyleSubmit}
            disabled={
              selectedPreset === 'custom' && customDescription.trim().length === 0
            }
            className="w-full"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
