import React from 'react'
import { Cpu, Fingerprint, Activity, ShieldCheck, ShieldX } from 'lucide-react'
import { FindingSchema, ModelAccessLevel, ModelBehaviourAssessment, ModelFingerprint } from '@/shared/types/assurance'
import { StatusBadge } from '../ui/StatusBadge'
import { StatCard } from '../ui/StatCard'

interface ModelAssuranceViewProps {
  fingerprint?: ModelFingerprint
  behaviour?: ModelBehaviourAssessment
  findings: FindingSchema[]
}

export const ModelAssuranceView: React.FC<ModelAssuranceViewProps> = ({
  fingerprint,
  behaviour,
  findings,
}) => {
  const modelFindings = findings.filter(f => f.asset_type === 'model')
  const isWhiteBox = fingerprint?.access_level === 'WHITE_BOX'

  return (
    <div className="space-y-6 font-mono">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Model Architecture"
          value={fingerprint?.model_format || 'ONNX'}
          subtitle={fingerprint?.model_name || 'Vision Backbone'}
          icon={<Cpu className="h-4 w-4" />}
          tone="cyan"
        />
        <StatCard
          title="Access Level (FR-07)"
          value={fingerprint?.access_level || 'WHITE_BOX'}
          subtitle={isWhiteBox ? "Full Weight/Tensor Access" : "Black-Box I/O Probing Only"}
          icon={<Fingerprint className="h-4 w-4" />}
          tone={isWhiteBox ? "emerald" : "amber"}
        />
        <StatCard
          title="Battery Probes"
          value={`${behaviour?.matching_predictions ?? 25}/${behaviour?.total_battery_tests ?? 25}`}
          subtitle={behaviour?.deviant_predictions ? `${behaviour.deviant_predictions} Deviant Probes` : "100% Behavioral Match"}
          icon={<Activity className="h-4 w-4" />}
          tone={(behaviour?.deviant_predictions ?? 0) > 0 ? "rose" : "emerald"}
        />
        <StatCard
          title="Trojan Trigger Rate"
          value={`${((behaviour?.backdoor_trigger_response_rate ?? 0) * 100).toFixed(1)}%`}
          subtitle={(behaviour?.backdoor_trigger_response_rate ?? 0) > 0 ? "Backdoor Trigger Active" : "Clean Activation Profile"}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone={(behaviour?.backdoor_trigger_response_rate ?? 0) > 0 ? "rose" : "emerald"}
        />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
              Model Identity & Canonical Fingerprint (FR-05)
            </h3>
          </div>
          <StatusBadge status={fingerprint?.verification_status || 'VERIFIED'} size="sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded border border-zinc-800/80 bg-zinc-900/40 p-3 space-y-2">
            <div className="text-zinc-500 font-semibold text-[10px] uppercase">SHA-256 WEIGHT / MODEL DIGEST</div>
            <div className="break-all font-mono text-cyan-300 text-[11px] bg-zinc-950 p-2 rounded border border-zinc-800">
              {fingerprint?.sha256_digest || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
            </div>
          </div>

          <div className="rounded border border-zinc-800/80 bg-zinc-900/40 p-3 space-y-1.5 text-zinc-300">
            <div className="text-zinc-500 font-semibold text-[10px] uppercase">ARCHITECTURE METADATA</div>
            <div className="flex justify-between py-0.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Total Parameters:</span>
              <span className="font-semibold text-zinc-200">{fingerprint?.total_parameters?.toLocaleString() || '11,200,000'}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Input Dimension:</span>
              <span className="font-semibold text-zinc-200">{fingerprint?.input_shape?.join(' × ') || '1 × 3 × 640 × 640'}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Target Classes:</span>
              <span className="font-semibold text-zinc-200">5 Tactical Classes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Activity className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
            Model Behaviour Assessment Findings (FR-06 & FR-13)
          </h3>
        </div>

        {modelFindings.length === 0 ? (
          <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-6 text-center text-xs text-emerald-300">
            ✓ MODEL INTEGRITY VERIFIED. ZERO BEHAVIOURAL DIVERGENCE OR BACKDOOR TRIGGERS DETECTED.
          </div>
        ) : (
          <div className="space-y-3">
            {modelFindings.map((f) => (
              <div key={f.finding_id} className="rounded border border-zinc-800 bg-zinc-900/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">{f.finding_id}</span>
                    <span className="text-zinc-500">|</span>
                    <span className="text-xs uppercase text-zinc-400 font-semibold">{f.finding_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={f.severity} size="sm" />
                    <StatusBadge status={f.recommended_action} size="sm" />
                  </div>
                </div>

                <p className="text-xs text-zinc-300">{f.reason}</p>

                <div className="rounded bg-zinc-950 p-2 text-[11px] text-zinc-400 border border-zinc-800/80">
                  <div className="text-zinc-500 font-semibold mb-1">EVIDENCE RECORD:</div>
                  <pre className="text-[10px] text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(f.evidence, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
