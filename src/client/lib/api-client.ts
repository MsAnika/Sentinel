import {
  AssuranceReport,
  ContributorRiskSummary,
  DatasetProfile,
  FindingSchema,
  InferenceRecord,
  ModelBehaviourAssessment,
  ModelFingerprint,
  ScenarioRunResult,
  TrendSummary,
} from '@/shared/types/assurance'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface DatasetAnalysisResult {
  profile: DatasetProfile
  findings: FindingSchema[]
  duplicate_stats: Record<string, unknown>
  label_stats: Record<string, unknown>
  ood_stats: Record<string, unknown>
  poison_stats: Record<string, unknown>
  structure_warnings: string[]
  label_verification_method: string
  visual_check_truncated_to: number | null
}

export interface DatasetUploadResult {
  extracted_to: string
  coco_json_candidates: string[]
  yolo_dir_candidate: string | null
  size_bytes: number
}

export interface ParameterAnalysisResult {
  stats: Record<string, unknown>
  findings: FindingSchema[]
}

export interface BehaviourBatteryResult {
  assessment: ModelBehaviourAssessment
  findings: FindingSchema[]
  battery: Array<Record<string, unknown>>
}

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

  private static async requestForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: formData,
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

  static async getTrends(limit = 200): Promise<TrendSummary> {
    return this.request(`/api/report/trends/summary?limit=${limit}`)
  }

  /** Direct download URL for a stored report -- opened in a new tab / used
   * as an <a href>, not fetched as JSON, so the browser handles the
   * Content-Disposition attachment itself. */
  static reportExportUrl(reportId: string, format: 'html' | 'pdf'): string {
    return `${API_BASE}/api/report/${encodeURIComponent(reportId)}/export.${format}`
  }

  // -- Live analysis: real, user-supplied files, no canned scenario involved --

  static async uploadModel(file: File): Promise<ModelFingerprint> {
    const form = new FormData()
    form.append('file', file)
    return this.requestForm('/api/model/upload', form)
  }

  static async uploadDatasetArchive(file: File): Promise<DatasetUploadResult> {
    const form = new FormData()
    form.append('file', file)
    return this.requestForm('/api/dataset/upload', form)
  }

  static async uploadProbeImage(file: File): Promise<{ image_path: string; size_bytes: number }> {
    const form = new FormData()
    form.append('file', file)
    return this.requestForm('/api/inference/upload-image', form)
  }

  static async analyzeDatasetProfile(params: {
    datasetId: string
    formatType: 'COCO' | 'YOLO'
    cocoPath?: string
    imagesDir?: string
    yoloDir?: string
    referenceModelPath?: string
  }): Promise<DatasetAnalysisResult> {
    return this.request('/api/dataset/analyze-profile', {
      method: 'POST',
      body: JSON.stringify({
        dataset_id: params.datasetId,
        format_type: params.formatType,
        coco_path: params.cocoPath,
        images_dir: params.imagesDir,
        yolo_dir: params.yoloDir,
        reference_model_path: params.referenceModelPath,
      }),
    })
  }

  static async executeInference(imagePath: string, modelPath: string, confidenceThreshold = 0.25): Promise<InferenceRecord> {
    return this.request('/api/inference/execute', {
      method: 'POST',
      body: JSON.stringify({
        image_path: imagePath,
        model_path: modelPath,
        config: { confidence_threshold: confidenceThreshold },
      }),
    })
  }

  static async runParameterAnalysis(modelPath: string, modelId?: string): Promise<ParameterAnalysisResult> {
    return this.request('/api/model/parameter-analysis', {
      method: 'POST',
      body: JSON.stringify({ model_path: modelPath, model_id: modelId }),
    })
  }

  /** Compiles whatever findings/contributor evidence Live Analysis has
   * accumulated so far into one governance-ready AssuranceReport -- the
   * same object shape a Scenario Replay run produces, so the Live
   * Analysis result can be shown through the exact same
   * AssessmentResultCard/FindingsTriage UI rather than a separate,
   * bespoke "live results" presentation. */
  static async generateReport(params: {
    findings: FindingSchema[]
    contributorSummaries?: ContributorRiskSummary[]
    datasetStatus?: string
    modelStatus?: string
    inferenceStatus?: string
    driftStatus?: string
  }): Promise<AssuranceReport> {
    return this.request('/api/report/generate', {
      method: 'POST',
      body: JSON.stringify({
        findings: params.findings,
        contributor_summaries: params.contributorSummaries ?? [],
        dataset_status: params.datasetStatus ?? 'VERIFIED',
        model_status: params.modelStatus ?? 'VERIFIED',
        inference_status: params.inferenceStatus ?? 'VERIFIED',
        drift_status: params.driftStatus ?? 'NORMAL',
      }),
    })
  }

  static async runBehaviourBattery(params: {
    referenceModelPath: string
    candidateModelPath: string
    probeImagePaths: string[]
    confidenceThreshold?: number
  }): Promise<BehaviourBatteryResult> {
    return this.request('/api/model/behaviour-battery', {
      method: 'POST',
      body: JSON.stringify({
        reference_model_path: params.referenceModelPath,
        candidate_model_path: params.candidateModelPath,
        probe_image_paths: params.probeImagePaths,
        confidence_threshold: params.confidenceThreshold ?? 0.25,
      }),
    })
  }
}
