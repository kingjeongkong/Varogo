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
  { value: 'concise', label: '간결·직접적', description: '짧고 명확하게 핵심만 전달합니다.' },
  { value: 'storytelling', label: '스토리텔링', description: '이야기 흐름으로 독자를 몰입시킵니다.' },
  { value: 'educational', label: '교육적·분석적', description: '정보를 체계적으로 설명하고 분석합니다.' },
  { value: 'humorous', label: '유머러스·가벼운', description: '재치 있고 친근한 톤으로 씁니다.' },
  { value: 'professional', label: '전문적·격식', description: '신뢰감 있고 격식 있는 표현을 사용합니다.' },
  { value: 'custom', label: '직접 입력', description: '원하는 스타일을 직접 설명합니다.' },
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

  // ESC 키 닫힘
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 모달 열릴 때 첫 번째 focusable 요소에 포커스
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

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setActiveTab('paste');
      setTextUnits(['']);
      setSelectedPreset('concise');
      setCustomDescription('');
      mutation.reset();
    }
  // mutation.reset을 deps에 넣으면 무한루프 발생하므로 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // Tab 1 핸들러
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

  // Tab 2 핸들러
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
        {/* 안내 메시지 */}
        <p
          id={titleId}
          className="mb-5 text-sm text-text-secondary leading-relaxed"
        >
          Threads 계정에 포스트가 충분하지 않아 수동으로 voice를 설정해 주세요.
        </p>

        {/* 탭 바 */}
        <div
          role="tablist"
          aria-label="Voice 설정 방법 선택"
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
            내 글 붙여넣기
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
            스타일 선택
          </button>
        </div>

        {/* Tab 1 — 내 글 붙여넣기 */}
        <div
          role="tabpanel"
          id={pasteTabPanelId}
          aria-labelledby="tab-paste"
          hidden={activeTab !== 'paste'}
          className="space-y-4"
        >
          <p className="text-xs text-text-muted">
            최소 3개 이상의 글 조각을 붙여넣으면 더 정확한 분석이 가능합니다.
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {textUnits.map((unit, index) => (
              <div key={index} className="flex gap-2 items-start">
                <textarea
                  id={`text-unit-${index}`}
                  aria-label={`글 조각 ${index + 1}`}
                  value={unit}
                  onChange={(e) => handleTextUnitChange(index, e.target.value)}
                  rows={3}
                  placeholder={`글 조각 ${index + 1}을 붙여넣으세요`}
                  className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                />
                {textUnits.length > 1 && (
                  <button
                    type="button"
                    aria-label={`글 조각 ${index + 1} 삭제`}
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
            + 글 조각 추가
          </Button>

          {mutation.isError && (
            <Alert>{(mutation.error as Error).message}</Alert>
          )}

          <Button
            type="button"
            loading={mutation.isPending}
            loadingText="분석 중..."
            onClick={handlePasteSubmit}
            disabled={textUnits.every((t) => t.trim().length === 0)}
            className="w-full"
          >
            분석하기
          </Button>
        </div>

        {/* Tab 2 — 스타일 선택 */}
        <div
          role="tabpanel"
          id={styleTabPanelId}
          aria-labelledby="tab-style"
          hidden={activeTab !== 'style'}
          className="space-y-4"
        >
          <div
            role="radiogroup"
            aria-label="글쓰기 스타일 선택"
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
                스타일 설명
              </label>
              <textarea
                id="custom-description"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={4}
                placeholder="예: 전문 용어를 피하고 친근한 말투로, 독자가 바로 실행할 수 있도록 구체적인 팁 위주로 작성합니다."
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
            loadingText="저장 중..."
            onClick={handleStyleSubmit}
            disabled={
              selectedPreset === 'custom' && customDescription.trim().length === 0
            }
            className="w-full"
          >
            저장하기
          </Button>
        </div>
      </div>
    </div>
  );
}
