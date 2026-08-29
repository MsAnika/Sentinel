export type AssetType = 'dataset' | 'model' | 'inference_record' | 'pipeline'

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type RecommendedDisposition = 'ACCEPT' | 'REVIEW' | 'QUARANTINE'

export type ModelAccessLevel = 'WHITE_BOX' | 'BLACK_BOX' | 'HASH_ONLY'

export type ModelDigestStatus = 'MATCH' | 'MISMATCH' | 'NO_REFERENCE'

export type DriftClassification =
  | 'probable_operational_drift'
  | 'anomaly_requires_review'
  | 'manipulation_indicators_present'
  | 'insufficient_evidence'

export interface FindingSchema {
  finding_id: string
  asset: string
  asset_type: AssetType
  finding_type: string
  reason: string
  evidence: Record<string, unknown>
  severity: FindingSeverity
  confidence: number
  affected_source?: string
  recommended_action: RecommendedDisposition
  limitations: string[]
  access_assumptions: string[]
}

export interface ContributorRiskSummary {
  contributor_id: string
  total_samples: number
  suspicious_samples: number
  near_duplicates: number
  label_anomalies: number
  ood_samples: number
  trigger_suspects: number
  risk_score: number
  risk_level: FindingSeverity
  recommended_action: RecommendedDisposition
}

export interface DatasetProfile {
  dataset_id: string
  format: string
  total_images: number
  total_annotations: number
  classes: string[]
  class_distribution: Record<string, number>
  contributors: string[]
  batches: string[]
  duplicate_clusters_count: number
  label_anomaly_count: number
  ood_sample_count: number
  trigger_anomaly_count: number
  contributor_risks: ContributorRiskSummary[]
}

export interface ModelFingerprint {
  model_id: string
  model_name: string
  model_format: string
  access_level: ModelAccessLevel
  sha256_digest: string
  architecture: string
  total_parameters?: number
  input_shape: number[]
  output_classes: string[]
  metadata: Record<string, unknown>
  verification_status: string
}

export interface ModelBehaviourAssessment {
  model_id: string
  reference_model_id?: string
  access_level: ModelAccessLevel
  total_battery_tests: number
  matching_predictions: number
  deviant_predictions: number
  mean_confidence_drift: number
  backdoor_trigger_response_rate: number
  whitebox_parameter_anomaly_score?: number
  whitebox_activation_anomaly_score?: number
  assessment_status: string
  limitations: string[]
}

export interface BoundingBox {
  class_name: string
  confidence: number
  box: number[]
}

export interface InferenceRecord {
  record_id: string
  timestamp: string
  nonce: string
  sequence_number: number
  image_hash: string
  model_digest: string
  preprocessing_hash: string
  config_hash: string
  output_hash: string
  provenance_hash: string
  signature: string
  predictions: BoundingBox[]
  image_metadata: Record<string, unknown>
  model_id: string
  is_valid: boolean
  tampering_detected: boolean
  replay_detected: boolean
  verification_errors: string[]
}

export interface DistributionShiftReport {
  declared_reference_id: string
  observed_dataset_id: string
  overall_drift_score: number
  drift_detected: boolean
  confidence: number
  affected_dimensions: Record<string, number>
  characterization: string
  suspected_cause: string
  is_manipulation_suspected: boolean
  reasoning: string
  classification: DriftClassification
  image_quality_evidence: Record<string, unknown>
  limitations: string[]
}

export interface AuditLogEntry {
  sequence_id: number
  timestamp: string
  event: string
  asset_id: string
  operation: string
  input_digest: string
  result: string
  evidence_reference: string
  previous_entry_hash: string
  entry_hash: string
  signature?: string
}

export interface CoverageItem {
  attack_class: string
  status: 'SUPPORTED' | 'PARTIAL' | 'NOT_SUPPORTED'
  description: string
  validation_method: string
}

export interface AssuranceReport {
  report_id: string
  generated_at: string
  problem_statement_id: string
  organization: string
  policy_version: string
  overall_disposition: RecommendedDisposition
  overall_risk_score: number
  dataset_assurance_status: string
  model_assurance_status: string
  inference_provenance_status: string
  distribution_shift_status: string
  findings: FindingSchema[]
  contributor_summaries: ContributorRiskSummary[]
  coverage_statements: CoverageItem[]
  assumptions: string[]
  limitations: string[]
  audit_chain_digest: string
  audit_chain_valid: boolean
}

export interface ScenarioRunResult {
  scenario_id: string
  title: string
  description: string
  overall_disposition: RecommendedDisposition
  overall_risk_score: number
  report: AssuranceReport
  audit_entries: AuditLogEntry[]
  model_fingerprint?: ModelFingerprint
  model_behaviour?: ModelBehaviourAssessment
  inference_record?: InferenceRecord
  valid_record?: InferenceRecord
  tampered_record?: InferenceRecord
  contributor_summaries?: ContributorRiskSummary[]
  findings?: FindingSchema[]
  samples_count?: number
  drift_report?: DistributionShiftReport
}
