import React from 'react'
import { Compass, Sun, Mountain, Radio } from 'lucide-react'
import { DistributionShiftReport } from '@/shared/types/assurance'
import { StatusBadge } from '../ui/StatusBadge'
import { StatCard } from '../ui/StatCard'

interface DistributionShiftViewProps {
  report?: DistributionShiftReport
}

export const DistributionShiftView: React.FC<DistributionShiftViewProps> = ({ report }) => {
  const dims = report?.affected_dimensions || {
    terrain_shift: 0.124,
    sensor_divergence: 0.041,
    illumination_delta: 0.082,
    seasonal_variance: 0.099,
  }

  const overallScore = report ? (report.overall_drift_score * 100).toFixed(1) : '12.4'
  const isDrift = report?.drift_detected ?? false
  const statusStr = isDrift ? 'ANOMALIES_DETECTED' : 'NORMAL'

  return (
    <div className="space-y-6 font-mono">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Terrain Shift"
          value={`${((dims.terrain_shift || 0) * 100).toFixed(1)}%`}
          subtitle="Declared Geography Delta"
          icon={<Mountain className="h-4 w-4" />}
          tone={dims.terrain_shift > 0.3 ? 'rose' : 'cyan'}
        />
        <StatCard
          title="Sensor Noise"
          value={`${((dims.sensor_divergence || 0) * 100).toFixed(1)}%`}
          subtitle="Spectrum / Modality Profile"
          icon={<Radio className="h-4 w-4" />}
          tone={dims.sensor_divergence > 0.3 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Illumination Delta"
          value={`${((dims.illumination_delta || 0) * 100).toFixed(1)}%`}
          subtitle="Solar Angle Variance"
          icon={<Sun className="h-4 w-4" />}
          tone={dims.illumination_delta > 0.3 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Aggregate Drift"
          value={`${overallScore}%`}
          subtitle={`Confidence: ${((report?.confidence ?? 0.93) * 100).toFixed(1)}%`}
          icon={<Compass className="h-4 w-4" />}
          tone={isDrift ? 'rose' : 'emerald'}
        />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
              Distribution-Shift & Environmental Drift Radar (FR-11 & FR-12)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={statusStr} size="sm" />
            <StatusBadge status={report?.classification || 'insufficient_evidence'} size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="text-zinc-400 font-semibold uppercase text-[11px]">DECLARED OPERATIONAL ENVELOPE</div>
            <div className="space-y-2 text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Baseline Reference:</span>
                <span className="font-semibold text-zinc-200">{report?.declared_reference_id || 'ref_plains_optical_baseline'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Observed Dataset ID:</span>
                <span className="font-semibold text-zinc-200">{report?.observed_dataset_id || 'dataset_obs_01'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Suspected Mechanism:</span>
                <span className="font-semibold text-cyan-300">{report?.suspected_cause || 'Normal operational variance within bounds'}</span>
              </div>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="text-zinc-400 font-semibold uppercase text-[11px]">DRIFT VS MANIPULATION ARBITRATION (FR-12)</div>
            <p className="text-zinc-300 leading-relaxed text-[11px]">
              {report?.characterization || 'Observed inputs operate within certified operational bounds. No systematic domain tampering detected.'}
            </p>
            <div className="rounded bg-zinc-950 p-2.5 text-[10px] text-zinc-400 border border-zinc-800">
              <span className="text-zinc-500 font-semibold">REASONING: </span>
              {report?.reasoning || 'All feature distribution divergences remain within statistical confidence margins.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
