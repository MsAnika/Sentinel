import hashlib
import os
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
from PIL import Image
from ..ingestion.dataset_loader import SampleItem
from ..schemas import AssetType, FindingSchema, FindingSeverity, RecommendedDisposition


class DuplicateDetector:
    def __init__(self, hash_size: int = 8, hamming_threshold: int = 4):
        self.hash_size = hash_size
        self.hamming_threshold = hamming_threshold

    def compute_dhash(self, image_path: str, fallback_bytes: Optional[bytes] = None) -> int:
        try:
            if os.path.exists(image_path):
                with Image.open(image_path) as img:
                    img_gray = img.convert("L").resize((self.hash_size + 1, self.hash_size), Image.Resampling.LANCZOS)
                    pixels = np.asarray(img_gray)
                    diff = pixels[:, 1:] > pixels[:, :-1]
                    hash_val = 0
                    for bit in diff.flatten():
                        hash_val = (hash_val << 1) | int(bit)
                    return hash_val
        except Exception:
            pass

        digest = hashlib.sha256(image_path.encode("utf-8")).digest()
        val = int.from_bytes(digest[:8], "big")
        return val

    def hamming_distance(self, h1: int, h2: int) -> int:
        return bin(h1 ^ h2).count("1")

    def analyze(self, samples: List[SampleItem], dataset_id: str = "dataset_01") -> Tuple[List[FindingSchema], Dict[str, Any]]:
        hashes: Dict[str, int] = {}
        for sample in samples:
            hashes[sample.sample_id] = self.compute_dhash(sample.image_path)

        clusters: List[List[str]] = []
        visited: Set[str] = set()

        for i, s1 in enumerate(samples):
            if s1.sample_id in visited:
                continue
            current_cluster = [s1.sample_id]
            visited.add(s1.sample_id)
            h1 = hashes[s1.sample_id]

            for s2 in samples[i + 1:]:
                if s2.sample_id in visited:
                    continue
                h2 = hashes[s2.sample_id]
                dist = self.hamming_distance(h1, h2)
                if dist <= self.hamming_threshold:
                    current_cluster.append(s2.sample_id)
                    visited.add(s2.sample_id)

            if len(current_cluster) > 1:
                clusters.append(current_cluster)

        findings: List[FindingSchema] = []
        flooding_by_contributor: Dict[str, int] = {}
        total_duplicates = sum(len(c) for c in clusters)

        sample_map = {s.sample_id: s for s in samples}

        for idx, cluster in enumerate(clusters):
            contributors_in_cluster = [sample_map[sid].contributor_id for sid in cluster if sid in sample_map]
            primary_contributor = max(set(contributors_in_cluster), key=contributors_in_cluster.count) if contributors_in_cluster else "unknown"
            flooding_by_contributor[primary_contributor] = flooding_by_contributor.get(primary_contributor, 0) + len(cluster)

            if len(cluster) >= 3:
                severity = FindingSeverity.CRITICAL if len(cluster) >= 8 else FindingSeverity.HIGH
                findings.append(
                    FindingSchema(
                        finding_id=f"FINDING-DUP-{idx + 1:03d}",
                        asset=dataset_id,
                        asset_type=AssetType.DATASET,
                        finding_type="near_duplicate_flooding",
                        reason=f"Detected near-duplicate cluster #{idx + 1} with {len(cluster)} redundant samples.",
                        evidence={
                            "cluster_id": f"cluster_{idx + 1}",
                            "cluster_size": len(cluster),
                            "sample_ids": cluster[:10],
                            "truncated": len(cluster) > 10,
                            "hamming_distance_max": self.hamming_threshold,
                            "primary_contributor": primary_contributor,
                        },
                        severity=severity,
                        confidence=0.96,
                        affected_source=primary_contributor,
                        recommended_action=RecommendedDisposition.QUARANTINE if severity == FindingSeverity.CRITICAL else RecommendedDisposition.REVIEW,
                        limitations=["Perceptual hashing captures visual similarity; extreme occlusions might produce false negatives."],
                    )
                )

        stats = {
            "total_duplicate_clusters": len(clusters),
            "total_duplicated_samples": total_duplicates,
            "flooding_by_contributor": flooding_by_contributor,
            "clusters": clusters,
        }
        return findings, stats
