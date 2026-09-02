import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { AlertTriangle, ArrowRight, Download, Inbox, Loader2 } from 'lucide-react'
import { useReportList } from '@/client/lib/useReportList'
import { AssuranceApiClient } from '@/client/lib/api-client'
import { AssuranceReport, RecommendedDisposition } from '@/shared/types/assurance'
import { StatusBadge } from '@/client/components/ui/StatusBadge'

type DispositionFilter = 'ALL' | RecommendedDisposition
type SortMode = 'newest' | 'oldest' | 'risk_desc'

interface ReportsViewProps {
  onOpenReport: (reportId: string, report: AssuranceReport) => void
}

/** The complete, unfiltered history of every assessment this deployment
 * has ever generated -- distinct from Home, which only surfaces what
 * currently needs a decision. This is where an analyst goes to look
 * something up ("what did we find on the model we ran last Tuesday?"),
 * not where they go to triage today's work. */
export const ReportsView: React.FC<ReportsViewProps> = ({ onOpenReport }) => {
  const { cards, error } = useReportList(200)
  const [filter, setFilter] = useState<DispositionFilter>('ALL')
  const [sort, setSort] = useState<SortMode>('newest')

  const filtered = useMemo(() => {
    if (!cards) return []
    let rows = cards
    if (filter !== 'ALL') rows = rows.filter((c) => c.summary.overall_disposition === filter)
    const sorted = [...rows]
    sorted.sort((a, b) => {
      if (sort === 'risk_desc') return b.summary.overall_risk_score - a.summary.overall_risk_score
      const diff = new Date(b.summary.generated_at).getTime() - new Date(a.summary.generated_at).getTime()
      return sort === 'oldest' ? -diff : diff
    })
    return sorted
  }, [cards, filter, sort])

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    )
  }

  if (cards === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-12 text-xs text-zinc-400 font-mono">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading report history...
      </div>
    )
  }

  return (
    <div className="space-y-4 font-mono">
      <div>
        <h2 className="text-lg font-bold text-zinc-100">Reports</h2>
        <p className="text-xs text-zinc-500">Every assessment ever generated ({cards.length} total).</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex gap-1.5">
          {(['ALL', 'QUARANTINE', 'REVIEW', 'ACCEPT'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'rounded border px-2.5 py-1 font-bold uppercase tracking-wider transition-colors cursor-pointer',
                filter === f
                  ? 'border-cyan-600/60 bg-zinc-900 text-cyan-300'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="risk_desc">Highest risk first</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-10 text-center">
          <Inbox className="h-6 w-6 text-zinc-600" />
          <p className="text-xs text-zinc-500">No reports match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2 text-left">Report</th>
                <th className="px-3 py-2 text-left">Generated</th>
                <th className="px-3 py-2 text-left">Disposition</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Findings</th>
                <th className="px-3 py-2 text-right">Export</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ summary, report }) => (
                <tr
                  key={summary.report_id}
                  className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/40 cursor-pointer"
                  onClick={() => report && onOpenReport(summary.report_id, report)}
                >
                  <td className="px-3 py-2 font-mono text-zinc-300">{summary.report_id}</td>
                  <td className="px-3 py-2 text-zinc-500">{new Date(summary.generated_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={summary.overall_disposition} size="sm" />
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums text-zinc-200">
                    {summary.overall_risk_score.toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-400">{report ? report.findings.length : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <a
                      href={AssuranceApiClient.reportExportUrl(summary.report_id, 'html')}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                    >
                      <Download className="h-3 w-3" /> HTML
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
