import React from 'react'
import clsx from 'clsx'
import { ShieldCheck, Skull, Cpu, AlertOctagon, Play, Repeat, FileWarning } from 'lucide-react'
import { StatusBadge } from '../ui/StatusBadge'

interface ScenarioSelectorProps {
  activeScenario: string
  loading: boolean
  onSelectScenario: (scenarioId: string) => void
}

const SCENARIOS = [
  {
    id: 'A',
    title: 'Scenario A: Clean Pipeline',
    subtitle: 'Clean Dataset + Original Model + Valid Inference',
    badge: 'ACCEPT',
    icon: ShieldCheck,
    tone: 'emerald',
  },
  {
    id: 'B',
    title: 'Scenario B: Compromised Dataset',
    subtitle: 'Poisoned Triggers + Label Flipping + Near-Duplicate Flooding',
    badge: 'QUARANTINE',
    icon: Skull,
    tone: 'rose',
  },
  {
    id: 'C',
    title: 'Scenario C: Substituted Model',
    subtitle: 'Substituted SHA-256 Digest + Behavioural Divergence Battery',
    badge: 'QUARANTINE',
    icon: Cpu,
    tone: 'amber',
  },
  {
    id: 'D',
    title: 'Scenario D: Tampered Inference',
    subtitle: 'Post-Hoc Prediction Alteration Detected via Hash Recalculation',
    badge: 'QUARANTINE',
    icon: AlertOctagon,
    tone: 'rose',
  },
  {
    id: 'E',
    title: 'Scenario E: Replay & Reordering',
    subtitle: 'Nonce Replay of a Signed Record + Out-of-Sequence Injection',
    badge: 'QUARANTINE',
    icon: Repeat,
    tone: 'rose',
  },
  {
    id: 'F',
    title: 'Scenario F: Audit-Log Tamper',
    subtitle: 'Post-Hoc Ledger Rewrite Detected via Hash Chain + Signature',
    badge: 'QUARANTINE',
    icon: FileWarning,
    tone: 'amber',
  },
]

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  activeScenario,
  loading,
  onSelectScenario,
}) => {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 font-mono">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h2 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
              Reproducible Attack & Assurance Test Matrix (PRD Section 19)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select a controlled test vector to evaluate multi-contributor CV pipeline integrity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-3">
        {SCENARIOS.map((sc) => {
          const Icon = sc.icon
          const isSelected = activeScenario === sc.id

          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              disabled={loading}
              className={clsx(
                'group relative flex flex-col justify-between rounded border p-3 text-left transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'border-cyan-500/80 bg-zinc-900 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70',
                loading && 'opacity-60 cursor-not-allowed'
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded',
                    isSelected ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/50' : 'bg-zinc-800 text-zinc-400'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <StatusBadge status={sc.badge} size="sm" />
                </div>

                <div className="mt-2.5">
                  <div className="text-xs font-bold text-zinc-100">{sc.title}</div>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {sc.subtitle}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[10px]">
                <span className="text-zinc-500">VECTOR ID: {sc.id}</span>
                <span className={clsx(
                  'flex items-center gap-1 font-semibold',
                  isSelected ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-zinc-200'
                )}>
                  <Play className="h-2.5 w-2.5" />
                  {isSelected ? 'ACTIVE' : 'RUN VECTOR'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
