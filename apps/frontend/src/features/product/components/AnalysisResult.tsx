'use client'

import Link from 'next/link'
import type { ProductWithAnalysis } from '@/lib/types'

interface AnalysisResultProps {
  product: ProductWithAnalysis
}

export function AnalysisResult({ product }: AnalysisResultProps) {
  const analysis = product.analysis

  if (!analysis) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-text-muted mb-4">분석 결과가 없습니다.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    )
  }

  const {
    targetAudience,
    problem,
    alternatives,
    comparisonTable,
    differentiators,
    positioningStatement,
    keywords
  } = analysis

  // Collect unique competitor names from the comparison table
  const competitorNames =
    comparisonTable.length > 0
      ? [...new Set(comparisonTable.flatMap((row) => row.competitors.map((c) => c.name)))]
      : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          {product.name}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{product.url}</p>
      </div>

      {/* 타겟 고객 */}
      <section
        className="glass-card p-6 animate-slide-up"
        style={{ animationDelay: '0.05s', opacity: 0 }}
      >
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary text-sm">
            01
          </span>
          타겟 고객
        </h2>
        <p className="text-text-secondary mb-4">{targetAudience.definition}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-elevated p-4">
            <h3 className="text-sm font-medium text-text-muted mb-2">주요 행동</h3>
            <ul className="space-y-1.5">
              {targetAudience.behaviors.map((b) => (
                <li key={b} className="text-sm text-text-secondary flex gap-2">
                  <span className="text-primary mt-0.5 shrink-0">&#8250;</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-surface-elevated p-4">
            <h3 className="text-sm font-medium text-text-muted mb-2">고충</h3>
            <ul className="space-y-1.5">
              {targetAudience.painPoints.map((p) => (
                <li key={p} className="text-sm text-text-secondary flex gap-2">
                  <span className="text-accent mt-0.5 shrink-0">&#8250;</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-surface-elevated p-4">
            <h3 className="text-sm font-medium text-text-muted mb-2">활동 커뮤니티</h3>
            <ul className="space-y-1.5">
              {targetAudience.activeCommunities.map((c) => (
                <li key={c} className="text-sm text-text-secondary flex gap-2">
                  <span className="text-success mt-0.5 shrink-0">&#8250;</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 핵심 문제 */}
      <section
        className="glass-card p-6 animate-slide-up"
        style={{ animationDelay: '0.1s', opacity: 0 }}
      >
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary text-sm">
            02
          </span>
          핵심 문제
        </h2>
        <p className="text-text-secondary leading-relaxed">{problem}</p>
      </section>

      {/* 대체재 분석 */}
      <section
        className="glass-card p-6 animate-slide-up"
        style={{ animationDelay: '0.15s', opacity: 0 }}
      >
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary text-sm">
            03
          </span>
          대체재 분석
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {alternatives.map((alt) => (
            <div key={alt.name} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-text-primary">{alt.name}</h3>
                <span className="text-xs font-mono text-text-muted bg-surface-elevated px-2 py-0.5 rounded">
                  {alt.price}
                </span>
              </div>
              <p className="text-sm text-text-secondary mb-3">{alt.problemSolved}</p>
              {alt.limitations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">한계점</p>
                  <ul className="space-y-1">
                    {alt.limitations.map((l) => (
                      <li key={l} className="text-xs text-text-muted flex gap-1.5">
                        <span className="text-error shrink-0">&#8212;</span>
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 비교 표 */}
      {comparisonTable.length > 0 && (
        <section
          className="glass-card p-6 animate-slide-up"
          style={{ animationDelay: '0.2s', opacity: 0 }}
        >
          <h2 className="font-heading text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary text-sm">
              04
            </span>
            경쟁 비교
          </h2>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 pr-4 text-text-muted font-medium">
                    항목
                  </th>
                  <th className="text-left py-2.5 pr-4 text-primary font-medium">
                    {product.name}
                  </th>
                  {competitorNames.map((name) => (
                    <th
                      key={name}
                      className="text-left py-2.5 pr-4 text-text-muted font-medium"
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonTable.map((row) => (
                  <tr key={row.aspect} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-text-secondary font-medium">
                      {row.aspect}
                    </td>
                    <td className="py-2.5 pr-4 text-text-primary">{row.myProduct}</td>
                    {competitorNames.map((name) => (
                      <td key={name} className="py-2.5 pr-4 text-text-muted">
                        {row.competitors.find((c) => c.name === name)?.value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 차별점 */}
      <section
        className="glass-card p-6 animate-slide-up"
        style={{ animationDelay: '0.25s', opacity: 0 }}
      >
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary text-sm">
            05
          </span>
          차별점
        </h2>
        <ul className="space-y-2">
          {differentiators.map((d) => (
            <li key={d} className="flex gap-3 text-text-secondary">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {d}
            </li>
          ))}
        </ul>
      </section>

      {/* 포지셔닝 */}
      <section
        className="glass-card p-6 animate-slide-up"
        style={{ animationDelay: '0.3s', opacity: 0 }}
      >
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary text-sm">
            06
          </span>
          포지셔닝
        </h2>
        <blockquote className="border-l-2 border-primary pl-4 text-text-secondary leading-relaxed italic">
          {positioningStatement}
        </blockquote>
      </section>

      {/* 키워드 */}
      <section
        className="glass-card p-6 animate-slide-up"
        style={{ animationDelay: '0.35s', opacity: 0 }}
      >
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary text-sm">
            07
          </span>
          마케팅 키워드
        </h2>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-block rounded-full bg-primary-dim text-primary px-3 py-1 text-sm font-medium"
            >
              {kw}
            </span>
          ))}
        </div>
      </section>

      {/* 다음 단계 */}
      <div
        className="animate-slide-up pt-2"
        style={{ animationDelay: '0.4s', opacity: 0 }}
      >
        <button
          disabled
          className="w-full px-4 py-3 text-base font-medium rounded-lg border border-border text-text-muted bg-surface cursor-not-allowed flex items-center justify-center gap-2"
        >
          채널 분석하기
          <span className="text-xs bg-surface-elevated px-2 py-0.5 rounded-full">
            Coming Soon
          </span>
        </button>
      </div>
    </div>
  )
}
