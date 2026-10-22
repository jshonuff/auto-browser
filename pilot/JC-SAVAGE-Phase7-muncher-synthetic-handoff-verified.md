# JC-SAVAGE Phase 7 — MUNCHER-X Synthetic Handoff Verification

**Status:** PASS: 27/27 isolated contract tests; **PRODUCTION HOLD**
**Date:** 2026-10-21 America/Chicago (GitHub execution UTC 2026-10-22)
**Canonical project:** `vxubjwmiizjyrxuflxhu`
**Safety:** Existing production state untouched. No use of MUNCHER-X's live mutation function.

## Source of truth and implementation inspection

- Verified live `jc_savage.muncher_x_intake_external_evidence` SQL signature, arguments, validation, and body from `pg_get_functiondef`.
- Crucial: **the real function contains an INSERT into `jc_savage.munch_queue_entries`**. It is `VOLATILE` and not a purely read-only callable. It was **not executed** in this test.
- The real function enforces nonempty source ID, source pointer, source type, raw line and evidence lineage; enumerated acquisition, sufficiency and sensitivity values; duplicate checks by `source_id` and `processing_key`; owner lookup via `jcs_chain_owner_resolve`; `QUEUED` on resolved owner, `DEFERRED` otherwise; `canon_promoted:false`, `target_executed:false`.
- Real function derives default `processing_key` from MD5 of lowercase/trimmed `source_pointer + "|" + raw_line`. This **differs** from the SHA256 provider-ID/content-revision candidate-key proposal in Phase 5; the external envelope mapping therefore needs a deliberate stable source-ID/version strategy before any production writing.
- `p_metadata` exists in the real function signature, but no corresponding persistence of this argument was evident in the inspected function body. **Do not claim metadata retention via this argument.**
- `jc_savage.jcs_chain_owner_resolve` is STABLE and was safely executed **read-only** on synthetic owner hints: BOOK-X, MUNCHER-X and TOOL:CHAIN-ROUTER-X resolve; invalid hint with valid BOOK-X primary-domain fallback resolves to BOOK-X; unresolved/missing owner hints yield HOLD.
- Live MUNCHER-X doctrine `DOC:JCS-FID-000209` v18 ACTIVE was read for purpose, ownership, classification, provenance and sensitive-data boundaries. It explicitly distinguishes external evidence from domain authority, requires owner/classification/duplicate checks, and rejects a generic vault or phantom module.
- MUNCHER-X registry function owner: `MUNCHER-X`; no canonical mutation or target execution authority.

## Isolated GitHub test

- Code: [pilot/muncher-phase7-synthetic-handoff.test.mjs](https://github.com/jshonuff/auto-browser/blob/jc-savage/pilot-api-anything-20261021/pilot/muncher-phase7-synthetic-handoff.test.mjs).
- Workflow: [jcs-api-anything-muncher-phase7.yml](https://github.com/jshonuff/auto-browser/blob/jc-savage/pilot-api-anything-20261021/.github/workflows/jcs-api-anything-muncher-phase7.yml).
- Verified Actions run: [39725881414](https://github.com/jshonuff/auto-browser/actions/runs/39725881414).
- GitHub Actions log: `# tests 27`, `# pass 27`, `# fail 0`.
- Test code uses built-in Node.js only, no third-party dependencies, website requests, credentials, Supabase connection or database access. This is a **pure in-memory subset simulation** based on the independently inspected live function, **NOT** execution of the actual production function and not end-to-end deployment.

Test families:
1. Owner resolution and fallback, missing owner HOLD.
2. New candidate admitted into *simulated* `QUEUED` state; same ID+version suppressed; changed version treated as a distinct candidate; old version suppressed again; different ID with identical content kept separate.
3. A duplicate `processing_key` with another source ID is suppressed in the model.
4. Missing mandatory fields and invalid acquisition/source sufficiency/sensitivity enumerations fail closed.
5. Adapter-level policy blocks POST, wrong host, unknown provider, logged-in recipe, cookies, sensitive material, missing external ID, missing provenance, and URL-embedded credentials **before modeled intake**.
6. Every modeled result explicitly has `canon_promoted:false`, `target_executed:false`; no queue insert function is invoked.

## Live independent readback — after GitHub execution

- `jc_savage.munch_queue_entries` total: **286**, unchanged from the pretest **286**.
- `source_id LIKE 'JCS-API-ANYTHING-SYN-%'`: **0** both before and after.
- `jc_savage.workflow_execution_control` singleton: `production_dispatch_enabled=false`, `claims_enabled=false`, `codex_writes_enabled=false`, `evidence_required=true`.
- No API Anything-named production approval row was found in checked `jc_savage.approvals` scope. Earlier sandbox permission belongs to the conversation and must not be misrepresented as a production authorization.
- No Supabase schema modifications, queue inserts, uploads, Google Drive mirrors, background schedules or production activations were performed.

## Remaining integration decisions and next safe gate

1. **No actual MUNCHER-X queue insertion has been proven**; owner receipt/acceptance remains untested. A queue `QUEUED` state would not mean domain owner acceptance or verification.
2. MUNCHER-X stores source pointer, raw-line, and lineage in live database when called. A future implementation must minimize/review privacy, licensing, retention and source-data semantics; never pass raw site payloads or secrets.
3. If a future authorized implementation transmits candidate metadata, map allowed fields to *persisted* columns or existing owner-managed records; do not rely on ignored `p_metadata`.
4. Verify how owner results, `readback_verified`, and final status transition work, plus separate user approval for any **real queue write**, route activation, scheduled scraping, or new persistence.
5. Continue using current `CHATGPT_WEB` web routes. API Anything remains optional, read-only and *sandbox-only*.

**Conclusion:** Phase 7 sandbox handoff contract **PASS**. Production integration **HOLD**, no authority expansion.
