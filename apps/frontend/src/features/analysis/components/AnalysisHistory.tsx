'use client';

import { useState } from 'react';
import type { Analysis } from '@/lib/types';
import { formatDateShort } from '@/lib/utils';
import { useAnalyses } from '../hooks/use-analyses';
import AnalysisResult from './AnalysisResult';

interface AnalysisHistoryProps {
  productId: string;
  initialAnalyses: Analysis[];
}

export default function AnalysisHistory({ productId, initialAnalyses }: AnalysisHistoryProps) {
  const { data: analyses } = useAnalyses(productId, initialAnalyses);
  const [selected, setSelected] = useState<Analysis | null>(null);

  if (!analyses || analyses.length === 0) return null;

  return (
    <div className='mt-10 pt-8 border-t border-border'>
      <h3 className='text-base font-semibold text-text-primary font-heading mb-4'>분석 기록</h3>
      <div className='space-y-2'>
        {analyses.map((analysis, index) => (
          <button
            key={analysis.id}
            onClick={() => setSelected(selected?.id === analysis.id ? null : analysis)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-200 ${
              selected?.id === analysis.id
                ? 'border-primary/40 bg-primary-dim text-primary'
                : 'border-border bg-surface text-text-secondary hover:border-border-hover hover:bg-surface-hover'
            }`}
          >
            <div className='flex items-center justify-between'>
              <span className='font-medium font-heading'>분석 #{analyses.length - index}</span>
              <span className='text-xs text-text-muted font-mono'>{formatDateShort(analysis.createdAt)}</span>
            </div>
            {analysis.summary && (
              <p className='mt-1 text-xs text-text-muted truncate'>{analysis.summary}</p>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className='mt-6 animate-fade-in'>
          <AnalysisResult analysis={selected} />
        </div>
      )}
    </div>
  );
}
