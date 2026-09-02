import React from 'react'
import clsx from 'clsx'
import { AlertTriangle, ArrowRight, Inbox, Loader2, Plus } from 'lucide-react'
import { useReportList } from '@/client/lib/useReportList'
import { AssuranceReport, FindingSeverity } from '@/shared/types/assurance'
import { StatusBadge } from '@/client/components/ui/StatusBadge'

function severityCounts(report: AssuranceReport | null): Record<FindingSeverity, number> {
  const counts: Record<FindingSeverity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  if (!report) return counts
  for (const f of report.findings) counts[f.severity] += 1
  return counts
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface HomeViewProps {
  onOpenReport: (reportId: string, report: AssuranceReport) => void
  onNewAssessment: () => void
}

/** The Home screen answers exactly one question -- "what requires my
 * attention?" -- across every assessment this deployment has ever
 * generated (scenario replay and live analysis alike, since both write
 * into the same assurance_reports table). Reports needing REVIEW or
 * QUARANTINE surface here; the complete unfiltered history lives on the
 * separate Reports screen so this one doesn't turn back into a KPI
 * dashboard the analyst has to scroll through. */
export const HomeView: React.FC<HomeViewProps> = ({ onOpenReport, onNewAssessment }) => {
  const { cards, error } = useReportList(30)

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
        <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments...
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="space-y-4 font-mono">
        <HomeHeader needingAttention={0} />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-12 text-center">
          <Inbox className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-400">No assessments yet.</p>
          <p className="text-xs text-zinc-500">Run a Scenario Replay vector or a Live Analysis to generate one.</p>
          <button
            onClick={onNewAssessment}
            className="mt-2 inline-flex items-center gap-2 rounded bg-cyan-950 border border-cyan-600/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-900/60 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Assessment
          </button>
        </div>
      </div>
    )
  }

  // Home is triage, not history: only what needs a decision, most urgent
  // first, capped so it never turns into a long scroll -- the full list
  // lives on the Reports screen.
  const needingAttention = cards.filter((c) => c.summary.overall_disposition !== 'ACCEPT')
  const sorted = [...needingAttention].sort((a, b) => {
    const rank = (d: string) => (d === 'QUARANTINE' ? 2 : d === 'REVIEW' ? 1 : 0)
    const rankDiff = rank(b.summary.overall_disposition) - rank(a.summary.overall_disposition)
    if (rankDiff !== 0) return rankDiff
    return new Date(b.summary.generated_at).getTime() - new Date(a.summary.generated_at).getTime()
  })
  const visible = sorted.slice(0, 12)

  return (
    <div className="space-y-4 font-mono">
      <HomeHeader needingAttention={needingAttention.length} />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/10 p-10 text-center">
          <p className="text-sm text-emerald-300 font-semibold">Everything is trusted.</p>
          <p className="text-xs text-zinc-500">No assessment currently needs review or quarantine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ summary, report }) => {
            const counts = severityCounts(report)
            const tone = summary.overall_disposition === 'QUARANTINE' ? 'rose' : 'amber'
            return (
              <button
                key={summary.report_id}
                onClick={() => report && onOpenReport(summary.report_id, report)}
                disabled={!report}
                className={clsx(
                  'flex flex-col gap-2 rounded-lg border bg-zinc-950 p-4 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                  tone === 'rose' && 'border-rose-800/50 hover:border-rose-600/70',
                  tone === 'amber' && 'border-amber-800/50 hover:border-amber-600/70'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {summary.report_id.slice(0, 18)}
                  </span>
                  <span className="text-[10px] text-zinc-500">{timeAgo(summary.generated_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={summary.overall_disposition} />
                  <span className="text-xl font-bold tabular-nums text-zinc-100">
                    {summary.overall_risk_score.toFixed(0)}
                    <span className="text-xs text-zinc-500">/100</span>
                  </span>
                </div>
                {report && (
                  <div className="flex gap-3 text-[10px] uppercase tracking-wider text-zinc-500">
                    {counts.CRITICAL > 0 && <span className="text-rose-400 font-bold">{counts.CRITICAL} critical</span>}
                    {counts.HIGH > 0 && <span className="text-amber-400 font-bold">{counts.HIGH} high</span>}
                    {counts.MEDIUM > 0 && <span>{counts.MEDIUM} medium</span>}
                    {counts.LOW > 0 && <span>{counts.LOW} low</span>}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Review <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={onNewAssessment}
        className="inline-flex items-center gap-2 rounded bg-zinc-900 border border-zinc-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:border-cyan-600/60 hover:text-cyan-300 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> New Assessment
      </button>
    </div>
  )
}

const HomeHeader: React.FC<{ needingAttention: number }> = ({ needingAttention }) => (
  <div>
    <h2 className="text-lg font-bold text-zinc-100">
      {needingAttention > 0 ? `${needingAttention} assessment${needingAttention === 1 ? '' : 's'} require attention` : 'All assessments trusted'}
    </h2>
    <p className="text-xs text-zinc-500">Assessments needing review or quarantine, most urgent first. See Reports for the full history.</p>
  </div>
)
