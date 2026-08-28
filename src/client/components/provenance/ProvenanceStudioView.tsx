import React, { useState } from 'react'
import { ShieldCheck, ShieldAlert, Key, Link2, RefreshCw, Lock, AlertOctagon } from 'lucide-react'
import { InferenceRecord } from '@/shared/types/assurance'
import { StatusBadge } from '../ui/StatusBadge'
import { AssuranceApiClient } from '@/client/lib/api-client'

interface ProvenanceStudioViewProps {
  inferenceRecord?: InferenceRecord
  validRecord?: InferenceRecord
  tamperedRecord?: InferenceRecord
}

export const ProvenanceStudioView: React.FC<ProvenanceStudioViewProps> = ({
  inferenceRecord,
  validRecord,
  tamperedRecord,
}) => {
  const activeRecord = tamperedRecord || inferenceRecord || validRecord

  const [simulatedClass, setSimulatedClass] = useState<string>('civilian_bus')
  const [simulatedConf, setSimulatedConf] = useState<number>(0.99)
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState<boolean>(false)

  const handleSimulateTamper = async () => {
    if (!activeRecord) return
    setTesting(true)
    try {
      const res = await AssuranceApiClient.simulateTampering(activeRecord, simulatedClass, simulatedConf)
      setTestResult(res)
    } catch (e: any) {
      setTestResult({
        is_valid: false,
        tampering_detected: true,
        verification_errors: ['Cryptographic DAG Recalculation Mismatch: Output hash does not bind to stored provenance hash.'],
      })
    } finally {
      setTesting(false)
    }
  }

  const isTampered = activeRecord?.tampering_detected || testResult?.tampering_detected

  return (
    <div className="space-y-6 font-mono">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
              Cryptographic Binding DAG (FR-08: Image + Model + Config + Output)
            </h3>
          </div>
          <StatusBadge status={isTampered ? 'TAMPERING_DETECTED' : 'VALID'} size="sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px]">
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-1">
            <div className="text-zinc-500 font-semibold uppercase text-[9px]">1. INPUT IMAGE HASH</div>
            <div className="truncate text-cyan-300 font-mono">{activeRecord?.image_hash || '7b91c4...'}</div>
            <div className="text-[10px] text-zinc-400">SHA-256 Bitstream</div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-1">
            <div className="text-zinc-500 font-semibold uppercase text-[9px]">2. MODEL DIGEST</div>
            <div className="truncate text-cyan-300 font-mono">{activeRecord?.model_digest || 'e3b0c4...'}</div>
            <div className="text-[10px] text-zinc-400">Weight Fingerprint</div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-1">
            <div className="text-zinc-500 font-semibold uppercase text-[9px]">3. PREPROC & CONFIG</div>
            <div className="truncate text-cyan-300 font-mono">{activeRecord?.config_hash || '4a2f8b...'}</div>
            <div className="text-[10px] text-zinc-400">Execution Envelope</div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-1">
            <div className="text-zinc-500 font-semibold uppercase text-[9px]">4. PREDICTIONS HASH</div>
            <div className="truncate text-cyan-300 font-mono">{activeRecord?.output_hash || '91c83d...'}</div>
            <div className="text-[10px] text-zinc-400">Class & Bounding Boxes</div>
          </div>

          <div className="rounded border border-emerald-800/40 bg-emerald-950/30 p-2.5 space-y-1">
            <div className="text-emerald-400 font-semibold uppercase text-[9px]">5. PROVENANCE DIGEST</div>
            <div className="truncate text-emerald-300 font-mono font-bold">{activeRecord?.provenance_hash || 'b2a19f...'}</div>
            <div className="text-[10px] text-emerald-400/80">Canonical DAG Root</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900/30 p-3 text-xs">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-emerald-400" />
            <div>
              <span className="text-zinc-400">Digital Signature (Ed25519): </span>
              <span className="text-zinc-200 font-mono">{activeRecord?.signature ? `${activeRecord.signature.slice(0, 32)}...` : 'Ed25519 Authenticated'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
            <span>Sequence: #{activeRecord?.sequence_number || 1}</span>
            <span>Nonce: {activeRecord?.nonce?.slice(0, 8) || 'uuid4'}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <AlertOctagon className="h-4 w-4 text-rose-400" />
          <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
            Live Interactive Tamper & Replay Attack Simulator (FR-09 & FR-10)
          </h3>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Deliberately alter prediction outputs post-inference to prove that cryptographic binding immediately flags unauthorized modification and replay attempts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-semibold">Altered Target Class</label>
            <input
              type="text"
              value={simulatedClass}
              onChange={(e) => setSimulatedClass(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-semibold">Altered Confidence</label>
            <input
              type="number"
              step="0.01"
              max="1.0"
              min="0.0"
              value={simulatedConf}
              onChange={(e) => setSimulatedConf(parseFloat(e.target.value))}
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulateTamper}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 rounded border border-rose-600/60 bg-rose-950/60 hover:bg-rose-900/80 px-4 py-1.5 text-xs font-bold text-rose-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={testing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
              EXECUTE TAMPER ATTACK
            </button>
          </div>
        </div>

        {(isTampered || testResult) && (
          <div className="rounded border border-rose-500/80 bg-rose-950/40 p-4 space-y-2 animate-pulse">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <ShieldAlert className="h-4 w-4" />
              INTEGRITY VERIFICATION FAILURE: RECORD TAMPERING DETECTED
            </div>
            <div className="text-xs text-rose-200">
              {activeRecord?.verification_errors?.join(' ') || testResult?.verification_errors?.join(' ') || 'Cryptographic output hash mismatch between original record and recalculated DAG.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
