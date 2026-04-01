'use client';

import { useState } from 'react';
import type { Analysis } from '@/lib/types';
import StrategyCard from './StrategyCard';
import PlanTimeline from './PlanTimeline';

interface AnalysisResultProps {
  analysis: Analysis;
}

export default function AnalysisResult({ analysis }: AnalysisResultProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className='space-y-8'>
      <div className='bg-white border border-gray-200 rounded-lg p-5 space-y-4'>
        <div>
          <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'>
            분석 요약
          </h3>
          <p className='text-sm text-gray-700 leading-relaxed'>{analysis.summary}</p>
        </div>
        <div>
          <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'>
            타겟 오디언스
          </h3>
          <p className='text-sm text-gray-700 leading-relaxed'>{analysis.targetAudience}</p>
        </div>
      </div>

      {analysis.strategies.length > 0 && (
        <div>
          <h3 className='text-sm font-semibold text-gray-900 mb-4'>채널별 전략</h3>
          <div className='border-b border-gray-200 mb-4'>
            <nav className='-mb-px flex gap-1 overflow-x-auto'>
              {analysis.strategies.map((strategy, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === index
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {strategy.channel}
                </button>
              ))}
            </nav>
          </div>
          <StrategyCard strategy={analysis.strategies[activeTab]} />
        </div>
      )}

      {analysis.plan.length > 0 && (
        <div>
          <h3 className='text-sm font-semibold text-gray-900 mb-4'>실행 플랜</h3>
          <div className='bg-white border border-gray-200 rounded-lg p-5'>
            <PlanTimeline plan={analysis.plan} />
          </div>
        </div>
      )}
    </div>
  );
}
