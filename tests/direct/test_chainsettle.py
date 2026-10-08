"""Direct Mode test suite for ChainSettle v1.2.0."""

from datetime import datetime, timedelta, timezone
import pytest


CONTRACT = "contracts/chainsettle.py"
BRIEF = "Build a responsive Next.js landing page with Stripe checkout integration."
CRITERIA_3 = (
    "Mobile responsive layout\n"
    "Stripe webhook handles checkout.session.completed\n"
    "Public deployment displays product catalog"
)

VALID_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567"
VALID_REPO_URL = f"https://github.com/bob/store/commit/{VALID_COMMIT_SHA}"
VALID_DEPLOY_URL = "https://bob-store.example.com/"
VALID_EVIDENCE_PATHS = "src/app/page.tsx\npackage.json"
VALID_SUMMARY = "Implemented full responsive store and tested Stripe webhook integration."
ZERO_ADDRESS = b"\x00" * 20


def future_timestamp(days: int = 7) -> int:
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp())


def deploy_contract(direct_deploy):
    return direct_deploy(CONTRACT)


def create_agreement(
    direct_vm,
    contract,
    client,
    worker=None,
    reward=50_000,
    title="Storefront build",
    brief=BRIEF,
    criteria=CRITERIA_3,
    deadline=None,
    review_window=0,
):
    direct_vm.sender = client
    direct_vm.value = reward
    if deadline is None:
        deadline = future_timestamp(7)
    if worker is None:
        worker = ZERO_ADDRESS
    agreement_id = contract.create_agreement(
        worker, title, brief, criteria, deadline, review_window
    )
    direct_vm.value = 0
    return agreement_id


# ==============================================================================
# 1. DEPLOYMENT & BASICS
# ==============================================================================


def test_deploy_and_version(direct_deploy):
    contract = deploy_contract(direct_deploy)
    assert contract.get_contract_version() == "1.2.0"
    assert contract.get_agreement_count() == 0
    assert contract.get_ruling_count() == 0


# ==============================================================================
# 2. HYBRID CREATION & OPEN MARKETPLACE BOUNTY
# ==============================================================================


def test_create_direct_escrow_happy_path(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    deadline = future_timestamp(5)

    agreement_id = create_agreement(
        direct_vm,
        contract,
        client=direct_alice,
        worker=direct_bob,
        reward=25_000,
        title="Direct Freelance Gig",
        brief=BRIEF,
        criteria=CRITERIA_3,
        deadline=deadline,
        review_window=86_400,
    )

    assert agreement_id == 1
    assert contract.get_agreement_count() == 1

    agreement = contract.get_agreement(agreement_id)
    assert agreement["id"] == 1
    assert agreement["client"].as_bytes == direct_alice
    assert agreement["worker"].as_bytes == direct_bob
    assert agreement["title"] == "Direct Freelance Gig"
    assert agreement["reward"] == 25_000
    assert agreement["deadline"] == deadline
    assert agreement["review_window"] == 86_400
    assert agreement["status"] == "assigned"
    assert agreement["audit_status"] == "none"


def test_create_open_marketplace_bounty_and_claim(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    deadline = future_timestamp(7)

    # 1. Alice creates an Open Marketplace Bounty (worker: ZERO_ADDRESS)
    agreement_id = create_agreement(
        direct_vm,
        contract,
        client=direct_alice,
        worker=ZERO_ADDRESS,
        reward=35_000,
        title="Open Bounty: Fix Stripe Bug",
    )

    agreement = contract.get_agreement(agreement_id)
    assert agreement["status"] == "open"
    assert agreement["worker"].as_bytes == ZERO_ADDRESS

    # 2. Alice cannot claim her own bounty
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Client cannot claim their own bounty"):
        contract.claim_agreement(agreement_id)

    # 3. Bob claims the open bounty
    direct_vm.sender = direct_bob
    contract.claim_agreement(agreement_id)

    agreement_after = contract.get_agreement(agreement_id)
    assert agreement_after["status"] == "assigned"
    assert agreement_after["worker"].as_bytes == direct_bob


def test_create_agreement_requires_positive_reward(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 0

    with direct_vm.expect_revert("Escrow reward must be greater than zero"):
        contract.create_agreement(
            direct_bob, "Zero Reward", BRIEF, CRITERIA_3, future_timestamp(5), 0
        )


def test_create_agreement_cannot_be_own_worker(direct_vm, direct_deploy, direct_alice):
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 10_000

    with direct_vm.expect_revert("Worker cannot be the agreement client"):
        contract.create_agreement(
            direct_alice, "Self assign", BRIEF, CRITERIA_3, future_timestamp(5), 0
        )


def test_create_agreement_requires_future_deadline(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 10_000
    past = int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp())

    with direct_vm.expect_revert("Deadline must be in the future"):
        contract.create_agreement(
            direct_bob, "Past Deadline", BRIEF, CRITERIA_3, past, 0
        )


# ==============================================================================
# 3. CANCELLATION & GHOSTING SAFEGUARDS
# ==============================================================================


def test_cancel_unaccepted_open_bounty_by_client(direct_vm, direct_deploy, direct_alice):
    contract = deploy_contract(direct_deploy)
    agreement_id = create_agreement(
        direct_vm, contract, client=direct_alice, worker=ZERO_ADDRESS, reward=30_000
    )

    direct_vm.sender = direct_alice
    contract.cancel_unaccepted_agreement(agreement_id)

    agreement = contract.get_agreement(agreement_id)
    assert agreement["status"] == "cancelled"
    assert agreement["client_refund"] == 30_000
    assert agreement["worker_payout"] == 0


def test_client_cannot_arbitrarily_cancel_assigned_agreement(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    agreement_id = create_agreement(
        direct_vm, contract, client=direct_alice, worker=direct_bob, reward=30_000
    )

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Agreement cannot be cancelled once delivery started or assigned"):
        contract.cancel_unaccepted_agreement(agreement_id)


def test_reclaim_expired_escrow_when_worker_ghosts(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    # Deadline set 10 seconds in future
    deadline = int((datetime.now(timezone.utc) + timedelta(seconds=1)).timestamp())

    agreement_id = create_agreement(
        direct_vm,
        contract,
        client=direct_alice,
        worker=direct_bob,
        reward=50_000,
        deadline=deadline,
    )

    # Calling before deadline expires reverts
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Agreement deadline has not yet passed"):
        contract.reclaim_expired_escrow(agreement_id)


def test_reopen_expired_agreement_when_worker_ghosts(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    deadline = future_timestamp(1)

    agreement_id = create_agreement(
        direct_vm,
        contract,
        client=direct_alice,
        worker=direct_bob,
        reward=40_000,
        deadline=deadline,
    )

    # Calling before expiry reverts
    direct_vm.sender = direct_alice
    new_dl = future_timestamp(14)
    with direct_vm.expect_revert("Agreement deadline has not yet passed"):
        contract.reopen_expired_agreement(agreement_id, new_dl)


# ==============================================================================
# 4. DELIVERY SUBMISSION
# ==============================================================================


def test_submit_delivery_happy_path(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    agreement_id = create_agreement(
        direct_vm, contract, client=direct_alice, worker=direct_bob
    )

    direct_vm.sender = direct_bob
    contract.submit_delivery(
        agreement_id=agreement_id,
        repository_url=VALID_REPO_URL,
        deployment_url=VALID_DEPLOY_URL,
        summary=VALID_SUMMARY,
        evidence_paths=VALID_EVIDENCE_PATHS,
    )

    agreement = contract.get_agreement(agreement_id)
    assert agreement["status"] == "delivered"
    assert agreement["audit_status"] == "pending"

    delivery = contract.get_delivery(agreement_id)
    assert delivery["agreement_id"] == agreement_id
    assert delivery["repository_owner"] == "bob"
    assert delivery["repository_name"] == "store"
    assert delivery["commit_sha"] == VALID_COMMIT_SHA
    assert delivery["deployment_url"] == VALID_DEPLOY_URL


def test_submit_delivery_only_worker_allowed(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_contract(direct_deploy)
    agreement_id = create_agreement(
        direct_vm, contract, client=direct_alice, worker=direct_bob
    )

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Only designated worker can submit delivery"):
        contract.submit_delivery(
            agreement_id=agreement_id,
            repository_url=VALID_REPO_URL,
            deployment_url=VALID_DEPLOY_URL,
            summary=VALID_SUMMARY,
            evidence_paths=VALID_EVIDENCE_PATHS,
        )


# ==============================================================================
# 5. INITIAL AUTONOMOUS VALIDATOR REVIEW (VERIFY_DELIVERY)
# ==============================================================================


def test_verify_delivery_100_percent_pass_autonomous_release(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    reward = 80_000
    agreement_id = create_agreement(
        direct_vm, contract, client=direct_alice, worker=direct_bob, reward=reward
    )

    direct_vm.sender = direct_bob
    contract.submit_delivery(
        agreement_id=agreement_id,
        repository_url=VALID_REPO_URL,
        deployment_url=VALID_DEPLOY_URL,
        summary=VALID_SUMMARY,
        evidence_paths=VALID_EVIDENCE_PATHS,
    )

    direct_vm.mock_web(
        r"raw\.githubusercontent\.com/.*",
        {"status": 200, "body": "export const app = 'perfect';"},
    )
    direct_vm.mock_web(
        r"bob-store\.example\.com",
        {"status": 200, "body": "<html><body>Online Storefront</body></html>"},
    )
    direct_vm.mock_llm(
        r"initial audit on a submitted deliverable",
        '{"criterion_results": ["PASS", "PASS", "PASS"], "verdict": "FULL_PAYOUT_WORKER", "worker_basis_points": 10000, "calculation_breakdown": "All 3 criteria verified.", "reasoning": "Flawless delivery."}',
    )

    # Builder or anyone invokes initial audit
    result = contract.verify_delivery(agreement_id)
    assert result["all_passed"] is True
    assert result["audit_status"] == "passed"

    # 100% funds autonomously released to worker!
    agreement = contract.get_agreement(agreement_id)
    assert agreement["status"] == "settled"
    assert agreement["audit_status"] == "passed"
    assert agreement["worker_payout"] == reward
    assert agreement["client_refund"] == 0


def test_verify_delivery_deficient_flags_for_creator_choice(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    reward = 60_000
    agreement_id = create_agreement(
        direct_vm, contract, client=direct_alice, worker=direct_bob, reward=reward
    )

    direct_vm.sender = direct_bob
    contract.submit_delivery(
        agreement_id=agreement_id,
        repository_url=VALID_REPO_URL,
        deployment_url=VALID_DEPLOY_URL,
        summary=VALID_SUMMARY,
        evidence_paths=VALID_EVIDENCE_PATHS,
    )

    direct_vm.mock_web(
        r"raw\.githubusercontent\.com/.*",
        {"status": 200, "body": "export const app = 'partial';"},
    )
    direct_vm.mock_web(
        r"bob-store\.example\.com",
        {"status": 200, "body": "<html><body>Online Storefront</body></html>"},
    )
    direct_vm.mock_llm(
        r"initial audit on a submitted deliverable",
        '{"criterion_results": ["PASS", "PARTIAL", "FAIL"], "verdict": "PARTIAL_SETTLEMENT", "worker_basis_points": 5000, "calculation_breakdown": "1 passed, 1 partial, 1 failed.", "reasoning": "Webhook missing."}',
    )

    result = contract.verify_delivery(agreement_id)
    assert result["all_passed"] is False
    assert result["audit_status"] == "deficient"

    # Agreement is flagged as audited; funds remain safely in escrow
    agreement = contract.get_agreement(agreement_id)
    assert agreement["status"] == "audited"
    assert agreement["audit_status"] == "deficient"
    assert agreement["worker_payout"] == 0


# ==============================================================================
# 6. CREATOR SOVEREIGN OVERRIDE
# ==============================================================================


def test_creator_sovereign_override_pays_100_percent_despite_deficiencies(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    reward = 50_000
    agreement_id = create_agreement(
        direct_vm, contract, client=direct_alice, worker=direct_bob, reward=reward
    )

    direct_vm.sender = direct_bob
    contract.submit_delivery(
        agreement_id=agreement_id,
        repository_url=VALID_REPO_URL,
        deployment_url=VALID_DEPLOY_URL,
        summary=VALID_SUMMARY,
        evidence_paths=VALID_EVIDENCE_PATHS,
    )

    direct_vm.mock_web(r"raw\.githubusercontent\.com/.*", {"status": 200, "body": "code"})
    direct_vm.mock_web(r"bob-store\.example\.com", {"status": 200, "body": "html"})
    direct_vm.mock_llm(
        r"initial audit on a submitted deliverable",
        '{"criterion_results": ["PASS", "FAIL", "PASS"], "verdict": "PARTIAL_SETTLEMENT", "worker_basis_points": 6600, "calculation_breakdown": "Criterion 2 failed", "reasoning": "Minor bug."}',
    )

    contract.verify_delivery(agreement_id)

    agreement = contract.get_agreement(agreement_id)
    assert agreement["status"] == "audited"

    # Alice decides to be generous and approve full payment anyway!
    direct_vm.sender = direct_alice
    contract.approve_delivery(agreement_id)

    agreement_final = contract.get_agreement(agreement_id)
    assert agreement_final["status"] == "settled"
    assert agreement_final["worker_payout"] == reward
    assert agreement_final["client_refund"] == 0


# ==============================================================================
# 7. BUILDER DISPUTE DEFENSE WINDOW & ADJUDICATION
# ==============================================================================


def test_builder_defense_submission_and_bps_adjudication(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy_contract(direct_deploy)
    reward = 100_000
    agreement_id = create_agreement(
        direct_vm, contract, client=direct_alice, worker=direct_bob, reward=reward
    )

    direct_vm.sender = direct_bob
    contract.submit_delivery(
        agreement_id=agreement_id,
        repository_url=VALID_REPO_URL,
        deployment_url=VALID_DEPLOY_URL,
        summary=VALID_SUMMARY,
        evidence_paths=VALID_EVIDENCE_PATHS,
    )

    # Client raises dispute
    direct_vm.sender = direct_alice
    contract.raise_dispute(
        agreement_id=agreement_id,
        complaint="The webhook fails under test load and product catalog pagination is missing.",
    )

    # Builder submits counter-defense
    direct_vm.sender = direct_bob
    defense_note = "Webhook was configured according to Stripe v2024 docs; pagination was out of scope."
    contract.submit_dispute_defense(agreement_id, defense_note)

    dispute = contract.get_dispute(agreement_id)
    assert dispute["defense"] == defense_note

    # Validators adjudicate with prompt containing both complaint and defense
    direct_vm.mock_web(r"raw\.githubusercontent\.com/.*", {"status": 200, "body": "const test = 1;"})
    direct_vm.mock_web(r"bob-store\.example\.com", {"status": 200, "body": "<html><body>App</body></html>"})
    direct_vm.mock_llm(
        r"arbitrating a freelance milestone dispute",
        '{"criterion_results": ["PASS", "PARTIAL", "PASS"], "verdict": "PARTIAL_SETTLEMENT", "worker_basis_points": 8600, "calculation_breakdown": "Criterion 1 (30%): PASS (3000 BPS). Criterion 2 (40%): PARTIAL (2600 BPS). Criterion 3 (30%): PASS (3000 BPS). Total = 8600 BPS (86.00%).", "reasoning": "Strong deliverable, defense partially substantiated."}',
    )

    ruling = contract.adjudicate_dispute(agreement_id)
    assert ruling["verdict"] == "PARTIAL_SETTLEMENT"
    assert ruling["worker_basis_points"] == 8600
    assert ruling["worker_percentage_display"] == "86%"

    agreement = contract.get_agreement(agreement_id)
    assert agreement["status"] == "settled"
    assert agreement["worker_payout"] == 86_000
    assert agreement["client_refund"] == 14_000
