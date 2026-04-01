'use client';

import { useState } from 'react';
import type { Analysis } from '@/lib/types';
import AnalysisResult from '@/components/analysis/AnalysisResult';

interface AnalysisHistoryProps {
  analyses: Analysis[];
}

export default function AnalysisHistory({ analyses }: AnalysisHistoryProps) {
  const [selected, setSelected] = useState<Analysis | null>(null);

  if (analyses.length === 0) {
    return null;
  }

  return (
    <div className='mt-10 pt-8 border-t border-gray-200'>
      <h3 className='text-base font-semibold text-gray-900 mb-4'>분석 기록</h3>
      <div className='space-y-2'>
        {analyses.map((analysis, index) => (
          <button
            key={analysis.id}
            onClick={() => setSelected(selected?.id === analysis.id ? null : analysis)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
              selected?.id === analysis.id
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className='flex items-center justify-between'>
              <span className='font-medium'>분석 #{analyses.length - index}</span>
              <span className='text-xs text-gray-400'>
                {new Date(analysis.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {analysis.summary && (
              <p className='mt-0.5 text-xs text-gray-500 truncate'>{analysis.summary}</p>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <div className='mt-6'>
          <AnalysisResult analysis={selected} />
        </div>
      )}
    </div>
  );
}
