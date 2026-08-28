import {
  AssuranceReport,
  DistributionShiftReport,
  InferenceRecord,
  ModelFingerprint,
  ScenarioRunResult,
} from '@/shared/types/assurance'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class AssuranceApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`API Error ${res.status}: ${errorText}`)
    }

    return res.json()
  }

  static async listScenarios(): Promise<Array<{ id: string; name: string; badge: string; disposition: string; description: string }>> {
    return this.request('/api/scenarios/list')
  }

  static async runScenario(scenarioId: string): Promise<ScenarioRunResult> {
    return this.request(`/api/scenarios/run/${scenarioId}`, {
      method: 'POST',
    })
  }

  static async verifyInferenceRecord(record: InferenceRecord, checkReplay = false): Promise<{ is_valid: boolean; errors: string[] }> {
    return this.request('/api/inference/verify', {
      method: 'POST',
      body: JSON.stringify({ record, check_replay: checkReplay }),
    })
  }

  static async simulateTampering(record: InferenceRecord, modifiedClass: string, modifiedConfidence: number): Promise<{
    original_provenance_hash: string
    tampered_record: InferenceRecord
    is_valid: boolean
    verification_errors: string[]
  }> {
    return this.request('/api/inference/tamper-simulate', {
      method: 'POST',
      body: JSON.stringify({
        record,
        modified_class: modifiedClass,
        modified_confidence: modifiedConfidence,
      }),
    })
  }

  static async verifyAuditLedger(): Promise<{ is_chain_valid: boolean; chain_digest: string; errors: string[] }> {
    return this.request('/api/audit/verify', {
      method: 'POST',
    })
  }
}
