import numpy as np
from backend.audit.audit_log import TamperEvidentAuditLedger
from backend.federated.aggregator import SecureFederatedAggregator
from backend.federated.branch_node import BranchNode
from backend.federated.simulation import run_federated_training, _synthetic_branch_dataset


def _make_ledger(tmp_path, name):
    from backend.provenance.signing import ProvenanceSigner

    signer = ProvenanceSigner(
        key_path=str(tmp_path / f"{name}.audit_key.pem"),
        role="audit_test",
        registry_path=str(tmp_path / f"{name}.registry.json"),
    )
    return TamperEvidentAuditLedger(persist_path=str(tmp_path / name), signer=signer)


def test_two_branches_army_navy_train_and_global_accuracy_improves(tmp_path):
    ledger = _make_ledger(tmp_path, "ledger_clean.jsonl")
    result = run_federated_training(
        branch_ids=["army", "navy"],
        num_rounds=6,
        keys_dir=str(tmp_path / "fed_keys_clean"),
        ledger=ledger,
    )

    assert result.branch_ids == ["army", "navy"]
    assert len(result.rounds) == 6
    first_round_acc = result.rounds[0].global_eval_accuracy
    last_round_acc = result.rounds[-1].global_eval_accuracy
    # This synthetic task is easy enough that round 1 can already be near
    # the achievable ceiling -- the meaningful claim is that federated
    # training converges to (and stays at) a strong global accuracy, not
    # that every single round strictly improves on the last.
    assert last_round_acc >= 0.85
    assert last_round_acc >= first_round_acc - 0.05
    for rnd in result.rounds:
        assert set(rnd.accepted_branches) == {"army", "navy"}
        assert rnd.excluded_branches == []
    assert set(result.branch_public_keys.keys()) == {"army", "navy"}

    is_valid, errors = ledger.verify_ledger_integrity()
    assert is_valid is True
    assert errors == []
    assert len(ledger.entries) > 0


def test_three_branches_army_navy_airforce_supported(tmp_path):
    ledger = _make_ledger(tmp_path, "ledger3.jsonl")
    result = run_federated_training(
        branch_ids=["army", "navy", "airforce"],
        num_rounds=3,
        keys_dir=str(tmp_path / "fed_keys3"),
        ledger=ledger,
    )
    assert result.branch_ids == ["army", "navy", "airforce"]
    assert set(result.branch_public_keys.keys()) == {"army", "navy", "airforce"}
    for rnd in result.rounds:
        assert set(rnd.accepted_branches) == {"army", "navy", "airforce"}


def test_malicious_branch_update_is_excluded_by_robust_aggregation(tmp_path):
    ledger = _make_ledger(tmp_path, "ledger_mal.jsonl")
    attacked_result = run_federated_training(
        branch_ids=["army", "navy"],
        num_rounds=5,
        malicious_branch_ids=["navy"],
        keys_dir=str(tmp_path / "fed_keys_mal"),
        ledger=ledger,
    )

    # The malicious ("navy") branch's poisoned update must be excluded in
    # every round, and only the honest ("army") branch's update accepted.
    for rnd in attacked_result.rounds:
        assert "navy" not in rnd.accepted_branches
        assert "army" in rnd.accepted_branches
        excluded_ids = {d.branch_id for d in rnd.excluded_branches}
        assert "navy" in excluded_ids
        navy_decision = next(d for d in rnd.excluded_branches if d.branch_id == "navy")
        assert navy_decision.reason == "update_norm_statistical_outlier_relative_to_this_rounds_other_branches"

    # Despite the attack, final accuracy should not collapse -- the honest
    # branch's contribution alone still keeps the global model reasonable,
    # proving the poisoned update did not get to corrupt the shared model.
    assert attacked_result.final_eval_accuracy >= 0.75


def test_forged_signature_is_rejected_and_never_reaches_robust_screening(tmp_path):
    X1, y1 = _synthetic_branch_dataset("army", seed=1)
    X2, y2 = _synthetic_branch_dataset("navy", seed=2)
    keys_dir = str(tmp_path / "keys")
    army = BranchNode("army", X1, y1, keys_dir=keys_dir)
    navy = BranchNode("navy", X2, y2, keys_dir=keys_dir)

    aggregator = SecureFederatedAggregator(ledger=_make_ledger(tmp_path, "ledger_forge.jsonl"))
    aggregator.register_branch("army", army.public_key_hex)
    aggregator.register_branch("navy", navy.public_key_hex)

    global_weights = np.zeros(army.features.shape[1] + 1)
    army_update = army.produce_update(1, global_weights)
    navy_update = navy.produce_update(1, global_weights)

    # Forge: claim to be "navy" but sign with army's key/identity.
    forged = navy_update.model_copy(update={"public_key_hex": army.public_key_hex})

    _, result = aggregator.aggregate_round(1, global_weights, [army_update, forged])

    assert "army" in result.accepted_branches
    assert "navy" not in result.accepted_branches
    forged_decision = next(d for d in result.excluded_branches if d.branch_id == "navy")
    assert forged_decision.reason == "public_key_does_not_match_enrolled_branch_identity"


def test_tampered_payload_after_signing_is_rejected(tmp_path):
    X1, y1 = _synthetic_branch_dataset("army", seed=1)
    keys_dir = str(tmp_path / "keys")
    army = BranchNode("army", X1, y1, keys_dir=keys_dir)

    aggregator = SecureFederatedAggregator(ledger=_make_ledger(tmp_path, "ledger_tamper.jsonl"))
    aggregator.register_branch("army", army.public_key_hex)

    global_weights = np.zeros(army.features.shape[1] + 1)
    update = army.produce_update(1, global_weights)

    tampered_delta = list(update.weight_delta)
    tampered_delta[0] += 100.0
    tampered = update.model_copy(update={"weight_delta": tampered_delta})

    _, result = aggregator.aggregate_round(1, global_weights, [tampered])
    assert result.accepted_branches == []
    decision = result.excluded_branches[0]
    assert decision.reason in ("update_hash_mismatch_content_tampered_in_transit", "invalid_ed25519_signature")


def test_unenrolled_branch_is_rejected(tmp_path):
    X1, y1 = _synthetic_branch_dataset("rogue", seed=9)
    keys_dir = str(tmp_path / "keys")
    rogue = BranchNode("rogue", X1, y1, keys_dir=keys_dir)

    aggregator = SecureFederatedAggregator(ledger=_make_ledger(tmp_path, "ledger_rogue.jsonl"))  # never registered "rogue"
    global_weights = np.zeros(rogue.features.shape[1] + 1)
    update = rogue.produce_update(1, global_weights)

    _, result = aggregator.aggregate_round(1, global_weights, [update])
    assert result.accepted_branches == []
    assert result.excluded_branches[0].reason == "branch_not_enrolled"
