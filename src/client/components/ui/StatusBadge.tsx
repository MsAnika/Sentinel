import React from 'react'
import clsx from 'clsx'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className }) => {
  const norm = status?.toUpperCase() || 'UNKNOWN'

  let colorClasses = 'bg-zinc-800 text-zinc-300 border-zinc-700'

  if (norm === 'ACCEPT' || norm === 'VERIFIED' || norm === 'LOW' || norm === 'NORMAL' || norm === 'VALID' || norm === 'MATCH') {
    colorClasses = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
  } else if (norm === 'REVIEW' || norm === 'MEDIUM' || norm === 'ANOMALIES_DETECTED' || norm === 'PARTIAL') {
    colorClasses = 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
  } else if (norm === 'QUARANTINE' || norm === 'HIGH' || norm === 'CRITICAL' || norm === 'TAMPERING_DETECTED' || norm === 'COMPROMISED' || norm === 'MISMATCH' || norm === 'ANOMALOUS') {
    colorClasses = 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-mono',
    md: 'px-2.5 py-1 text-xs font-mono font-semibold tracking-wider',
    lg: 'px-3.5 py-1.5 text-sm font-mono font-bold tracking-widest',
  }[size]

  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded border uppercase', sizeClasses, colorClasses, className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', {
        'bg-emerald-400': norm === 'ACCEPT' || norm === 'VERIFIED' || norm === 'LOW' || norm === 'NORMAL',
        'bg-amber-400': norm === 'REVIEW' || norm === 'MEDIUM',
        'bg-rose-400': norm === 'QUARANTINE' || norm === 'HIGH' || norm === 'CRITICAL' || norm === 'TAMPERING_DETECTED',
        'bg-zinc-400': !['ACCEPT', 'VERIFIED', 'LOW', 'NORMAL', 'REVIEW', 'MEDIUM', 'QUARANTINE', 'HIGH', 'CRITICAL', 'TAMPERING_DETECTED'].includes(norm),
      })} />
      {norm}
    </span>
  )
}
