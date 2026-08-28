import copy
import os
from typing import Any, Dict, List
from ..assurance.report_generator import AssuranceReportGenerator
from ..audit.audit_log import TamperEvidentAuditLedger
from ..data_assurance.contributor_risk import ContributorRiskEngine
from ..drift.distribution_shift import DistributionShiftDetector
from ..inference.inference_engine import InferenceEngine
from ..model_assurance.backdoor_detector import BackdoorDetector
from ..model_assurance.behaviour_analyzer import BehaviourAnalyzer
from ..model_assurance.fingerprint import ModelFingerprinter
from ..provenance.verification import ProvenanceVerifier
from ..schemas import AssetType, FindingSchema, FindingSeverity, ModelAccessLevel, RecommendedDisposition
from .asset_generator import AssetGenerator
from .scenario_clean import ScenarioCleanDatasetRunner


class ScenarioModelInferenceRunner:
    @staticmethod
    def run_scenario_c(
        fng_prt: ModelFingerprinter,
        beh_an: BehaviourAnalyzer,
        bdr_det: BackdoorDetector,
        inf_eng: InferenceEngine,
        vrf: ProvenanceVerifier,
        rpt_gen: AssuranceReportGenerator,
        cnt_eng: ContributorRiskEngine,
    ) -> Dict[str, Any]:
        audit = TamperEvidentAuditLedger()
        samples = ScenarioCleanDatasetRunner.load_dynamic_samples()
        assets = AssetGenerator.ensure_test_assets("test_assets")

        clean_fp = fng_prt.generate_fingerprint(assets["clean_model_path"], "YOLOv8-Tactical-v1.onnx", "ONNX Graph (OpSet 17)", ModelAccessLevel.WHITE_BOX)
        expected_ref_digest = clean_fp.sha256_digest

        compromised_fp = fng_prt.generate_fingerprint(assets["backdoored_model_path"], "YOLOv8-Tactical-Backdoored.onnx", "ONNX Graph (OpSet 17, Trojan Injected)", ModelAccessLevel.WHITE_BOX)

        is_match, sub_finding = fng_prt.verify_against_reference(compromised_fp, expected_ref_digest)
        all_findings: List[FindingSchema] = []
        if sub_finding:
            all_findings.append(sub_finding)

        audit.record_event("MODEL_FINGERPRINT", compromised_fp.model_id, "DIGEST_VERIFICATION", compromised_fp.sha256_digest, "MISMATCH_ALERT", "Supplied model does not match reference digest.")

        test_battery = []
        for i, s in enumerate(samples[:25]):
            is_deviant = (i % 3 == 0)
            orig_class = s.labels[0] if s.labels else "infantry"
            test_battery.append({
                "probe_id": f"probe_{i+1:02d}",
                "expected_class": orig_class,
                "observed_class": "military_vehicle" if is_deviant else orig_class,
                "expected_confidence": 0.95,
                "observed_confidence": 0.52 if is_deviant else 0.93,
            })

        beh_assess, beh_finds = beh_an.evaluate_test_battery(compromised_fp.model_id, clean_fp.model_id, test_battery)
        all_findings.extend(beh_finds)

        clean_probes = [{"observed_class": s.labels[0]} for s in samples[:15]]
        trig_probes = [{"observed_class": "military_vehicle", "target_backdoor_class": "military_vehicle", "confidence": 0.99} for _ in range(15)]
        asr, backdoor_findings = bdr_det.evaluate_trigger_probes(compromised_fp.model_id, clean_probes, trig_probes)
        all_findings.extend(backdoor_findings)
        beh_assess.backdoor_trigger_response_rate = asr

        audit.record_event("MODEL_ASSESSMENT", compromised_fp.model_id, "BEHAVIOURAL_BATTERY", compromised_fp.sha256_digest[:16], "FAILED_ANOMALOUS", f"Model exhibited {len(beh_finds) + len(backdoor_findings)} behavioral/backdoor violations.")

        preds = inf_eng.run_inference(samples[0].image_path, compromised_fp.model_id, simulated_scenario="backdoored")
        inf_record = vrf.create_record(samples[0].image_path, compromised_fp.model_id, compromised_fp.sha256_digest, preds)

        contrib_sums = cnt_eng.aggregate_risk(samples[:20], {}, {}, {}, {})

        drift_det = DistributionShiftDetector()
        drift_report = drift_det.evaluate_shift(
            reference_profile={"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.8},
            observed_samples_metadata=[s.metadata for s in samples[:20]],
            declared_reference_id="ref_plains_optical_baseline",
            observed_dataset_id="ds_clean_01",
        )

        report = rpt_gen.generate_report(
            findings=all_findings,
            contributor_summaries=contrib_sums,
            audit_chain_digest=audit.current_chain_digest,
            audit_chain_valid=True,
            dataset_status="VERIFIED",
            model_status="QUARANTINED_BACKDOORED",
            inference_status="UNTRUSTED_MODEL",
            drift_status="NORMAL",
        )

        return {
            "scenario_id": "SCENARIO-C",
            "title": "Substituted & Backdoored Model Attack",
            "description": "Model weights modified with backdoor trigger activation and substituted identity hash.",
            "overall_disposition": report.overall_disposition,
            "overall_risk_score": report.overall_risk_score,
            "report": report,
            "audit_entries": audit.get_entries(),
            "model_fingerprint": compromised_fp,
            "model_behaviour": beh_assess,
            "findings": all_findings,
            "drift_report": drift_report,
        }

    @staticmethod
    def run_scenario_d(
        fng_prt: ModelFingerprinter,
        inf_eng: InferenceEngine,
        vrf: ProvenanceVerifier,
        rpt_gen: AssuranceReportGenerator,
        cnt_eng: ContributorRiskEngine,
    ) -> Dict[str, Any]:
        audit = TamperEvidentAuditLedger()
        samples = ScenarioCleanDatasetRunner.load_dynamic_samples()
        assets = AssetGenerator.ensure_test_assets("test_assets")

        fp = fng_prt.generate_fingerprint(assets["clean_model_path"], "YOLOv8-Tactical-v1.onnx", "ONNX Graph (OpSet 17)", ModelAccessLevel.WHITE_BOX)
        preds = inf_eng.run_inference(samples[0].image_path, fp.model_id)

        valid_record = vrf.create_record(samples[0].image_path, fp.model_id, fp.sha256_digest, preds)
        audit.record_event("INFERENCE_PROVENANCE", valid_record.record_id, "SIGN_BIND", valid_record.provenance_hash, "CREATED", f"Authentic signature: {valid_record.signature[:16]}...")

        tampered_record = copy.deepcopy(valid_record)
        tampered_record.predictions[0].class_name = "civilian_bus"
        tampered_record.predictions[0].confidence = 0.99

        is_valid, errors = vrf.verify_record(tampered_record)
        tampered_record.is_valid = is_valid
        tampered_record.tampering_detected = not is_valid
        tampered_record.verification_errors = errors

        audit.record_event("PROVENANCE_VERIFICATION", tampered_record.record_id, "VERIFY_TAMPERING", tampered_record.provenance_hash, "TAMPERING_DETECTED", "; ".join(errors))

        finding = FindingSchema(
            finding_id="FINDING-INF-TAMPER-001",
            asset=tampered_record.record_id,
            asset_type=AssetType.INFERENCE_RECORD,
            finding_type="inference_tampering",
            reason="Inference record output hash failed cryptographic recalculation. Predictions were altered post-inference.",
            evidence={
                "record_id": tampered_record.record_id,
                "claimed_output_hash": tampered_record.output_hash,
                "verification_errors": errors,
                "original_signature": tampered_record.signature[:16] + "...",
            },
            severity=FindingSeverity.CRITICAL,
            confidence=1.0,
            affected_source=tampered_record.record_id,
            recommended_action=RecommendedDisposition.QUARANTINE,
            limitations=["Cryptographic binding detects any single bit alteration in predictions, image hash, or configs."],
        )

        contrib_sums = cnt_eng.aggregate_risk(samples[:20], {}, {}, {}, {})

        drift_det = DistributionShiftDetector()
        drift_report = drift_det.evaluate_shift(
            reference_profile={"terrain": "plains", "sensor": "EO_optical", "mean_illumination": 0.8},
            observed_samples_metadata=[s.metadata for s in samples[:20]],
            declared_reference_id="ref_plains_optical_baseline",
            observed_dataset_id="ds_clean_01",
        )

        report = rpt_gen.generate_report(
            findings=[finding],
            contributor_summaries=contrib_sums,
            audit_chain_digest=audit.current_chain_digest,
            audit_chain_valid=True,
            dataset_status="VERIFIED",
            model_status="VERIFIED",
            inference_status="TAMPERING_DETECTED",
            drift_status="NORMAL",
        )

        return {
            "scenario_id": "SCENARIO-D",
            "title": "Tampered Inference Output & Replay Attack",
            "description": "Prediction altered from military vehicle to civilian bus post-execution; cryptographic DAG instantly detects violation.",
            "overall_disposition": report.overall_disposition,
            "overall_risk_score": report.overall_risk_score,
            "report": report,
            "audit_entries": audit.get_entries(),
            "valid_record": valid_record,
            "tampered_record": tampered_record,
            "findings": [finding],
            "drift_report": drift_report,
        }
