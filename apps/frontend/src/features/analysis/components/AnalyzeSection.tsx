'use client';

import type { Analysis } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { useAnalyze } from '../hooks/use-analyze';
import AnalysisResult from './AnalysisResult';
import { useState } from 'react';

interface AnalyzeSectionProps {
  productId: string;
  initialAnalysis?: Analysis | null;
}

export default function AnalyzeSection({ productId, initialAnalysis }: AnalyzeSectionProps) {
  const { mutate: analyze, isPending, error, data: newAnalysis } = useAnalyze(productId);
  const [dismissed, setDismissed] = useState(false);

  const displayAnalysis = newAnalysis ?? (dismissed ? null : initialAnalysis);

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <button
          onClick={() => {
            setDismissed(false);
            analyze();
          }}
          disabled={isPending}
          className='inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
        >
          {isPending ? (
            <>
              <svg
                className='animate-spin h-4 w-4 text-white'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                />
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                />
              </svg>
              AI 분석 중... (최대 20초)
            </>
          ) : (
            <>
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                />
              </svg>
              {displayAnalysis ? '다시 분석하기' : '분석하기'}
            </>
          )}
        </button>
        {isPending && (
          <p className='text-xs text-gray-400'>Claude AI가 마케팅 전략을 생성하고 있습니다...</p>
        )}
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm'>
          {error.message}
        </div>
      )}

      {displayAnalysis && !isPending && (
        <div>
          <div className='flex items-center gap-3 mb-4'>
            <h3 className='text-base font-semibold text-gray-900'>최신 분석 결과</h3>
            <span className='text-xs text-gray-400'>
              {formatDateTime(displayAnalysis.createdAt)}
            </span>
          </div>
          <AnalysisResult analysis={displayAnalysis} />
        </div>
      )}
    </div>
  );
}
