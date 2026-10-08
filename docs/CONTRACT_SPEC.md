# ChainSettle Contract Specification

## Contract Version
`"1.2.0"` - returned by `get_contract_version()`.

## Core Invariants
1. Every agreement escrow reward is funded with native GEN at creation (`msg.value > 0`).
2. An agreement can only be cancelled by the client if no delivery has been submitted.
3. Only the designated worker can submit delivery to an agreement.
4. Client cannot submit delivery to their own agreement.
5. Direct approval pays 100% of the escrow reward to the worker.
6. A dispute can only be filed while the agreement is in `delivered` status.
7. An adjudicated ruling distributes exactly 100% of the reward using Basis Points (0-10,000): `worker_share = (reward * worker_bps) // 10000; client_refund = reward - worker_share; worker_share + client_refund == reward`.
8. Proportional partial splits are calculated dynamically based on criteria weighting and tangible completion percentage, with step-by-step math documented in `calculation_breakdown`.
9. An `UNDETERMINED` ruling does not transfer funds and leaves the agreement in `disputed` status for retry.
10. All external value transfers are performed via GenLayer external messages (`_Recipient(address).emit_transfer(value=amount)`).
11. Agreement and dispute history are append-only.

## Storage Schema

### Agreement
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `u256` | Monotonically increasing agreement identifier |
| `client` | `Address` | Escrow creator and funding account |
| `worker` | `Address` | Assigned contractor account |
| `title` | `str` | Short title (3-120 characters) |
| `brief` | `str` | Work description (20-10,000 characters) |
| `criteria` | `str` | Newline-separated criteria (1-5 items, each ≤ 600 chars) |
| `reward` | `u256` | Locked escrow amount in GEN |
| `deadline` | `u64` | Delivery deadline timestamp |
| `review_window` | `u64` | Review window in seconds (default: 604,800 / 7 days) |
| `status` | `str` | `open`, `assigned`, `delivered`, `audited`, `disputed`, `settled`, `cancelled` |
| `worker_payout` | `u256` | Final payout amount disbursed to worker |
| `client_refund` | `u256` | Final refund amount returned to client |
| `ruling_id` | `u32` | Associated ruling ID (0 if settled without dispute) |
| `audit_status` | `str` | `none`, `pending`, `passed`, `deficient` |
| `audit_report` | `str` | Itemized report from initial AI audit |

### Delivery
| Field | Type | Description |
| :--- | :--- | :--- |
| `agreement_id` | `u256` | Agreement identifier |
| `repository_url` | `str` | Canonical GitHub commit permalink |
| `repository_owner` | `str` | Parsed GitHub owner |
| `repository_name` | `str` | Parsed GitHub repository name |
| `commit_sha` | `str` | 40-character lowercase hex SHA |
| `evidence_paths` | `str` | Newline-separated file manifest (1-6 paths) |
| `deployment_url` | `str` | Public HTTPS live URL |
| `summary` | `str` | Delivery explanation (10-3,000 characters) |
| `delivered_at` | `u64` | Submission timestamp |

### Dispute
| Field | Type | Description |
| :--- | :--- | :--- |
| `agreement_id` | `u256` | Agreement identifier |
| `disputant` | `Address` | Account that initiated the dispute |
| `complaint` | `str` | Statement of deficiency (10-3,000 characters) |
| `defense` | `str` | Contractor rebuttal statement (10-3,000 characters) |
| `disputed_at` | `u64` | Dispute filing timestamp |
| `adjudication_count`| `u32` | Number of adjudication attempts |

### Ruling
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `u32` | Monotonically increasing ruling identifier |
| `agreement_id` | `u256` | Associated agreement identifier |
| `verdict` | `str` | `FULL_PAYOUT_WORKER`, `PARTIAL_SETTLEMENT`, `FULL_REFUND_CLIENT`, `UNDETERMINED` |
| `worker_basis_points`| `u16` | Basis points awarded to worker (0-10,000 BPS = 0.00% to 100.00%) |
| `criteria_results` | `str` | Pipe-delimited list of results (`PASS\|PARTIAL\|FAIL`) |
| `criteria_report` | `str` | Itemized human-readable report |
| `calculation_breakdown` | `str` | Exact arithmetic derivation of criteria weighting & completion |
| `reasoning` | `str` | Consensus rationale |
| `evidence_note` | `str` | Validator notes regarding evidence accessibility |
| `ruled_at` | `u64` | Finalization timestamp |

## Limits & Validation Constants
* `MAX_TITLE_LENGTH = 120`
* `MAX_BRIEF_LENGTH = 10_000`
* `MAX_CRITERIA_LENGTH = 3_000`
* `MAX_CRITERION_LENGTH = 600`
* `MAX_CRITERIA_COUNT = 5`
* `MAX_COMPLAINT_LENGTH = 3_000`
* `MAX_SUMMARY_LENGTH = 3_000`
* `MAX_EVIDENCE_PATHS = 6`
* `MAX_EVIDENCE_PATH_LENGTH = 240`
* `MAX_SOURCE_CHARS_PER_FILE = 12_000`
* `MAX_SOURCE_CHARS_TOTAL = 42_000`
* `MAX_DEPLOYMENT_CHARS = 20_000`
