import React from 'react'
import clsx from 'clsx'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className }) => {
  const norm = status?.toUpperCase() || 'UNKNOWN'

  let tone: 'emerald' | 'amber' | 'rose' | 'zinc' = 'zinc'

  if (['ACCEPT', 'VERIFIED', 'LOW', 'NORMAL', 'VALID', 'MATCH', 'PROBABLE_OPERATIONAL_DRIFT'].includes(norm)) {
    tone = 'emerald'
  } else if (['REVIEW', 'MEDIUM', 'ANOMALIES_DETECTED', 'PARTIAL', 'ANOMALY_REQUIRES_REVIEW', 'NO_REFERENCE'].includes(norm)) {
    tone = 'amber'
  } else if (['QUARANTINE', 'HIGH', 'CRITICAL', 'TAMPERING_DETECTED', 'COMPROMISED', 'MISMATCH', 'ANOMALOUS', 'MANIPULATION_INDICATORS_PRESENT'].includes(norm)) {
    tone = 'rose'
  } else if (['INSUFFICIENT_EVIDENCE', 'HASH_ONLY'].includes(norm)) {
    tone = 'zinc'
  }

  const colorClasses = {
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse',
    zinc: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  }[tone]

  const dotClasses = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    zinc: 'bg-zinc-400',
  }[tone]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-mono',
    md: 'px-2.5 py-1 text-xs font-mono font-semibold tracking-wider',
    lg: 'px-3.5 py-1.5 text-sm font-mono font-bold tracking-widest',
  }[size]

  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded border uppercase', sizeClasses, colorClasses, className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', dotClasses)} />
      {norm}
    </span>
  )
}
