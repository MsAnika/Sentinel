from typing import List, Tuple
from ..schemas import FindingSchema, FindingSeverity, RecommendedDisposition


class RiskEngine:
    """Disposition policy: severity weights and ACCEPT/REVIEW/QUARANTINE
    cutoffs. Bump POLICY_VERSION whenever these constants change -- the
    PRD (section 9.3) requires policy thresholds to be versioned and
    carried in every assurance report, so a report generated under one
    policy can never be silently misread as having been evaluated under
    another."""

    POLICY_VERSION = "policy-2026.1"

    SEVERITY_WEIGHTS = {
        FindingSeverity.LOW: 5.0,
        FindingSeverity.MEDIUM: 18.0,
        FindingSeverity.HIGH: 40.0,
        FindingSeverity.CRITICAL: 80.0,
    }

    def compute_overall_risk(
        self,
        findings: List[FindingSchema],
    ) -> Tuple[float, RecommendedDisposition]:
        if not findings:
            return 4.2, RecommendedDisposition.ACCEPT

        has_critical = any(f.severity == FindingSeverity.CRITICAL for f in findings)
        high_count = sum(1 for f in findings if f.severity == FindingSeverity.HIGH)
        med_count = sum(1 for f in findings if f.severity == FindingSeverity.MEDIUM)

        weighted_sum = sum(
            self.SEVERITY_WEIGHTS.get(f.severity, 10.0) * f.confidence for f in findings
        )
        normalized_score = float(min(100.0, max(0.0, round(weighted_sum, 1))))

        if has_critical or high_count >= 2 or normalized_score >= 60.0:
            disposition = RecommendedDisposition.QUARANTINE
        elif high_count == 1 or med_count >= 2 or normalized_score >= 25.0:
            disposition = RecommendedDisposition.REVIEW
        else:
            disposition = RecommendedDisposition.ACCEPT

        return normalized_score, disposition
