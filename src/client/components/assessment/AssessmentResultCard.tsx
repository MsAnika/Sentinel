import React from 'react'
import clsx from 'clsx'
import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { AssuranceReport, FindingSchema, FindingSeverity, RecommendedDisposition } from '@/shared/types/assurance'
import { StatusBadge } from '@/client/components/ui/StatusBadge'
import { RiskMeter } from '@/client/components/ui/RiskMeter'

const SEVERITY_RANK: Record<FindingSeverity, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 }

function topRiskDrivers(findings: FindingSchema[], limit = 3): FindingSchema[] {
  return [...findings]
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.confidence - a.confidence)
    .slice(0, limit)
}

function dispositionCopy(disposition: RecommendedDisposition): { headline: string; guidance: string; Icon: typeof ShieldCheck } {
  switch (disposition) {
    case 'ACCEPT':
      return { headline: 'TRUSTED', guidance: 'No blocking issues found under current coverage. Safe to proceed.', Icon: ShieldCheck }
    case 'QUARANTINE':
      return { headline: 'QUARANTINE', guidance: 'Do not deploy. Critical integrity issues require resolution first.', Icon: ShieldX }
    case 'REVIEW':
    default:
      return { headline: 'REVIEW REQUIRED', guidance: 'Review the evidence below before this asset is deployed.', Icon: ShieldAlert }
  }
}

interface AssessmentResultCardProps {
  title: string
  subtitle?: string
  report: AssuranceReport
  onInvestigate?: () => void
  investigateLabel?: string
}

/** The single "center of gravity" surface for one assessment: one score,
 * one disposition, and the handful of findings that actually drove it --
 * everything else (per-detector tabs, raw evidence) is a drill-down from
 * here, not a competing top-level destination. */
export const AssessmentResultCard: React.FC<AssessmentResultCardProps> = ({
  title,
  subtitle,
  report,
  onInvestigate,
  investigateLabel = 'Investigate Findings',
}) => {
  const { headline, guidance, Icon } = dispositionCopy(report.overall_disposition)
  const drivers = topRiskDrivers(report.findings)
  const toneByDisposition: Record<RecommendedDisposition, 'emerald' | 'amber' | 'rose'> = {
    ACCEPT: 'emerald',
    REVIEW: 'amber',
    QUARANTINE: 'rose',
  }
  const tone = toneByDisposition[report.overall_disposition]

  const severityCounts = report.findings.reduce<Record<FindingSeverity, number>>(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1
      return acc
    },
    { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  )

  const categoryCards: Array<{ label: string; status: string }> = [
    { label: 'Dataset', status: report.dataset_assurance_status },
    { label: 'Model', status: report.model_assurance_status },
    { label: 'Inference', status: report.inference_provenance_status },
    { label: 'Distribution Shift', status: report.distribution_shift_status },
  ]

  return (
    <div
      className={clsx(
        'rounded-lg border-2 bg-zinc-950 p-5 font-mono shadow-lg',
        tone === 'emerald' && 'border-emerald-700/50',
        tone === 'amber' && 'border-amber-700/50',
        tone === 'rose' && 'border-rose-700/60'
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Assessment Result</div>
          <h2 className="mt-0.5 truncate text-lg font-bold text-zinc-100">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-400">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Icon
            className={clsx(
              'h-9 w-9',
              tone === 'emerald' && 'text-emerald-400',
              tone === 'amber' && 'text-amber-400',
              tone === 'rose' && 'text-rose-400'
            )}
          />
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-zinc-100">
              {report.overall_risk_score.toFixed(0)}
              <span className="text-sm text-zinc-500"> /100</span>
            </div>
            <StatusBadge status={headline} size="sm" />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <RiskMeter score={report.overall_risk_score} showLabel={false} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {categoryCards.map((c) => (
          <div key={c.label} className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{c.label}</div>
            <StatusBadge status={c.status} size="sm" className="mt-1" />
          </div>
        ))}
      </div>

      {drivers.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
            <AlertTriangle className="h-3 w-3" /> Why
          </div>
          <ul className="space-y-1.5">
            {drivers.map((f) => (
              <li key={f.finding_id} className="flex items-center justify-between gap-3 rounded border border-zinc-800/70 bg-zinc-900/40 px-3 py-1.5 text-xs">
                <span className="truncate text-zinc-300">{f.reason}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={f.severity} size="sm" />
                  <span className="text-zinc-500">{Math.round(f.confidence * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-wider text-zinc-500">
            {severityCounts.CRITICAL > 0 && <span className="text-rose-400 font-bold">{severityCounts.CRITICAL} critical</span>}
            {severityCounts.HIGH > 0 && <span className="text-amber-400 font-bold">{severityCounts.HIGH} high</span>}
            {severityCounts.MEDIUM > 0 && <span>{severityCounts.MEDIUM} medium</span>}
            {severityCounts.LOW > 0 && <span>{severityCounts.LOW} low</span>}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-zinc-800/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Recommended Action</div>
          <p className="mt-0.5 text-sm text-zinc-300">{guidance}</p>
        </div>
        {onInvestigate && (
          <button
            onClick={onInvestigate}
            className={clsx(
              'shrink-0 rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer',
              tone === 'emerald' && 'bg-emerald-950 text-emerald-300 border border-emerald-600/50 hover:bg-emerald-900/60',
              tone === 'amber' && 'bg-amber-950 text-amber-300 border border-amber-600/50 hover:bg-amber-900/60',
              tone === 'rose' && 'bg-rose-950 text-rose-300 border border-rose-600/50 hover:bg-rose-900/60'
            )}
          >
            {investigateLabel}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500">
        <ShieldCheck className={clsx('h-3 w-3', report.audit_chain_valid ? 'text-emerald-500' : 'text-rose-500')} />
        Audit integrity {report.audit_chain_valid ? 'VERIFIED' : 'FAILED'} · chain {report.audit_chain_digest.slice(0, 12)}…
      </div>
    </div>
  )
}
