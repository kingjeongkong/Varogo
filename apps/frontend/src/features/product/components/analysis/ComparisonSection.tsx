import type { ComparisonItem } from '@/lib/types'
import { SectionLabel } from './SectionLabel'

interface ComparisonSectionProps {
  productName: string
  comparisonTable: ComparisonItem[]
}

export function ComparisonSection({ productName, comparisonTable }: ComparisonSectionProps) {
  const competitorNames = [
    ...new Set(comparisonTable.flatMap((row) => row.competitors.map((c) => c.name)))
  ]

  return (
    <section
      className="animate-slide-up"
      style={{ animationDelay: '0.2s', opacity: 0 }}
    >
      <SectionLabel number="04" title="경쟁 비교" />
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-elevated">
                <th className="text-left py-3 px-4 text-text-muted font-medium border-b border-border">
                  항목
                </th>
                <th className="text-left py-3 px-4 font-semibold border-b border-border bg-primary-dim/60 text-primary">
                  <span className="flex items-center gap-1.5">
                    {productName}
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  </span>
                </th>
                {competitorNames.map((name) => (
                  <th
                    key={name}
                    className="text-left py-3 px-4 text-text-muted font-medium border-b border-border"
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonTable.map((row, i) => (
                <tr
                  key={row.aspect}
                  className={i % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/40'}
                >
                  <td className="py-3 px-4 text-text-secondary font-medium border-b border-border/50">
                    {row.aspect}
                  </td>
                  <td className="py-3 px-4 text-text-primary font-medium border-b border-border/50 bg-primary-dim/30">
                    {row.myProduct}
                  </td>
                  {competitorNames.map((name) => (
                    <td key={name} className="py-3 px-4 text-text-muted border-b border-border/50">
                      {row.competitors.find((c) => c.name === name)?.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
