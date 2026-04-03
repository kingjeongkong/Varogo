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
      <div className='glass-card p-5 space-y-5'>
        <div>
          <h3 className='text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-heading'>
            분석 요약
          </h3>
          <p className='text-sm text-text-secondary leading-relaxed'>{analysis.summary}</p>
        </div>
        <div className='border-t border-border pt-5'>
          <h3 className='text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-heading'>
            타겟 오디언스
          </h3>
          <p className='text-sm text-text-secondary leading-relaxed'>{analysis.targetAudience}</p>
        </div>
      </div>

      {analysis.strategies.length > 0 && (
        <div>
          <h3 className='text-sm font-semibold text-text-primary font-heading mb-4'>채널별 전략</h3>
          <div className='border-b border-border mb-4'>
            <nav className='-mb-px flex gap-1 overflow-x-auto'>
              {analysis.strategies.map((strategy, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                    activeTab === index
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-hover'
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
          <h3 className='text-sm font-semibold text-text-primary font-heading mb-4'>실행 플랜</h3>
          <div className='glass-card p-5'>
            <PlanTimeline plan={analysis.plan} />
          </div>
        </div>
      )}
    </div>
  );
}
