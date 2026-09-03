import React from 'react'
import { Compass, Sun, Mountain, Radio, Layers, Inbox } from 'lucide-react'
import { DistributionShiftReport } from '@/shared/types/assurance'
import { StatusBadge } from '../ui/StatusBadge'
import { StatCard } from '../ui/StatCard'

interface DistributionShiftViewProps {
  report?: DistributionShiftReport
}

const PRIMARY_DIMENSIONS = new Set(['terrain_shift', 'sensor_divergence', 'illumination_delta'])

const DIMENSION_LABELS: Record<string, string> = {
  seasonal_variance: 'Seasonal Variance',
  blur_shift: 'Blur Shift',
  contrast_shift: 'Contrast Shift',
  resolution_shift: 'Resolution Shift',
  compression_artifact_shift: 'Compression Artifact Shift',
  embedding_shift: 'Embedding-Space Shift',
}

export const DistributionShiftView: React.FC<DistributionShiftViewProps> = ({ report }) => {
  if (!report) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-10 text-center font-mono">
        <Inbox className="h-6 w-6 text-zinc-600" />
        <p className="text-xs text-zinc-500">No distribution-shift analysis was run for this assessment.</p>
        <p className="text-[11px] text-zinc-600">Requires a declared reference distribution and an observed sample set.</p>
      </div>
    )
  }

  const dims = report.affected_dimensions || {}
  const overallScore = (report.overall_drift_score * 100).toFixed(1)
  const isDrift = report.drift_detected
  const statusStr = isDrift ? 'ANOMALIES_DETECTED' : 'NORMAL'

  // Every dimension beyond the three primary StatCards below -- seasonal
  // variance is always present, blur/contrast/resolution/compression only
  // when observed samples carried a resolvable image_path, and
  // embedding_shift only when both a reference and observed image set
  // were supplied. Rendered generically so a new dimension added to the
  // backend shows up here without another UI change.
  const additionalDimensions = Object.entries(dims).filter(([key]) => !PRIMARY_DIMENSIONS.has(key))
  const embeddingEvidence = report.image_quality_evidence?.embedding_comparison as
    | Record<string, number>
    | undefined

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
          subtitle={`Confidence: ${(report.confidence * 100).toFixed(1)}%`}
          icon={<Compass className="h-4 w-4" />}
          tone={isDrift ? 'rose' : 'emerald'}
        />
      </div>

      {additionalDimensions.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Layers className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
              Additional Signal Dimensions
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
            {additionalDimensions.map(([key, value]) => (
              <div key={key} className="rounded border border-zinc-800/80 bg-zinc-900/40 p-2.5">
                <div className="text-[9px] uppercase text-zinc-500 font-semibold">{DIMENSION_LABELS[key] || key.replace(/_/g, ' ')}</div>
                <div className={`text-sm font-bold ${value > 0.5 ? 'text-rose-400' : 'text-zinc-200'}`}>{(value * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
          {embeddingEvidence && (
            <div className="rounded border border-cyan-900/40 bg-cyan-950/10 p-3 text-[10px] text-zinc-400 space-y-1">
              <div className="text-cyan-400/80 font-semibold uppercase text-[9px]">
                Real CNN Embedding-Space Comparison (32-dim, diagonal Frechet distance)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                <span>Reference samples: <span className="text-zinc-200">{embeddingEvidence.reference_samples_embedded}</span></span>
                <span>Observed samples: <span className="text-zinc-200">{embeddingEvidence.observed_samples_embedded}</span></span>
                <span>Frechet distance: <span className="text-zinc-200">{embeddingEvidence.embedding_frechet_distance}</span></span>
                <span>Embedding dim: <span className="text-zinc-200">{embeddingEvidence.embedding_dim}</span></span>
              </div>
            </div>
          )}
        </div>
      )}

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
            <StatusBadge status={report.classification} size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="text-zinc-400 font-semibold uppercase text-[11px]">DECLARED OPERATIONAL ENVELOPE</div>
            <div className="space-y-2 text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Baseline Reference:</span>
                <span className="font-semibold text-zinc-200">{report.declared_reference_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Observed Dataset ID:</span>
                <span className="font-semibold text-zinc-200">{report.observed_dataset_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Suspected Mechanism:</span>
                <span className="font-semibold text-cyan-300">{report.suspected_cause}</span>
              </div>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="text-zinc-400 font-semibold uppercase text-[11px]">DRIFT VS MANIPULATION ARBITRATION (FR-12)</div>
            <p className="text-zinc-300 leading-relaxed text-[11px]">
              {report.characterization}
            </p>
            <div className="rounded bg-zinc-950 p-2.5 text-[10px] text-zinc-400 border border-zinc-800">
              <span className="text-zinc-500 font-semibold">REASONING: </span>
              {report.reasoning}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
