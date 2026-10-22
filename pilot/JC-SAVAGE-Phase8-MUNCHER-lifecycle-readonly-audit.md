# JC-SAVAGE — API Anything / MUNCHER-X Phase 8 Lifecycle Audit

**Result: VERIFIED READ-ONLY AUDIT + 32/32 ISOLATED SYNTHETIC TESTS PASS. INTEGRATION / PRODUCTION HOLD.**

Observed in live Supabase project `vxubjwmiizjyrxuflxhu` (no DDL/DML).
Sandbox workflow [run 39726576449](https://github.com/jshonuff/auto-browser/actions/runs/39726576449); isolated test [muncher-phase8-lifecycle-synthetic.test.mjs](https://github.com/jshonuff/auto-browser/blob/jc-savage/pilot-api-anything-20261021/pilot/muncher-phase8-lifecycle-synthetic.test.mjs).

## Exact live functions reviewed

1. `jc_savage.claim_munch_queue` (**VOLATILE**): leases `QUEUED` sources after a worker identity, 1–100 limit, and 30–86,400-second lease checks. Real function reads and INSERTs/UPSERTs `munch_queue_leases`. It does **not** itself inspect the singleton global production-dispatch flag; invoking it cannot be presumed harmless merely because dispatch is globally disabled.
2. `jc_savage.process_munch_queue` (**VOLATILE**): requires active owned lease and processing key, writes classified owner/duplication/confidence/sensitivity/target fields and calls `finish_munch_queue`.
3. `jc_savage.finish_munch_queue` (**VOLATILE**): requires live lease and worker match. `ROUTED` requires accepted source-readability state, sufficient evidence, nonempty lineage, owner, duplicate/conflict classification, three confidence fields, sensitivity classification and next action; live owner identity is resolved again. It changes queue status and lease. **ROUTED is not proof that the destination owner accepted or verified the result.**
4. `jc_savage.validate_munch_target_version` (**VOLATILE** despite read-only body): checks target version baseline and rejects missing/stale version.
5. `jc_savage.verify_munch_queue_outcome` (**VOLATILE**): requires status `ROUTED`, a nonempty outcome and allowed owner-result state. Positive outcomes (`ACCEPTED_INSTALLED`, `ABSORBED`, `SUPPORT_REFERENCE_ONLY`) require `readback_verified=true`, a matching target identity in the receipt, version validation and independent target verification:
   - `DOC:`, `STORAGEDOC:`, `JCS-FID-` documents: ACTIVE, current content hash recomputed, hash in receipt and version matched;
   - `MUSIC-CONTENT:` records: Supabase canonical authority, source-ID lineage included in target metadata, version matched;
   - other target types: **explicitly unsupported** in the current implementation. A generic `BOOK-X:` destination cannot be declared successfully read back via this function.
   - Non-delivery outcomes (`REJECTED`, `DEFERRED`, `SUPERSEDED`, `NO_ACTION`) must **not** claim readback. `TARGET_VERIFIED` is not an allowed input owner-result state.
6. A trigger `trg_dataset_sync_outbox` runs on every INSERT/UPDATE/DELETE of `jc_savage.munch_queue_entries`. It can cause a separate derived `dataset_sync_outbox` write when configured material consumers exist. At audit time, no enabled consumer was found matching this source/queue. Do **not** infer a future write would always have only one database side effect.

## Read-only live state at Phase 8 end

- MUNCHER queue total: **286**; 214 `DEFERRED`; 69 `ROUTED`.
- Of 69 routed records: **49** have an owner-result label without `readback_verified`; this includes 39 `SUPPORT_REFERENCE_ONLY`, 8 `NO_ACTION`, 2 `DEFERRED`. No-action/deferred outcomes are not deliveries, so their absent readback is legitimate; the 39 support-reference cases need owner-specific/legacy-context review against present verifier semantics. **Do not bulk relabel or invalidate them from count alone.**
- 2 routed records have `owner_result_state='TARGET_VERIFIED'` and `readback_verified=true`, a historical label absent from the present `verify_munch_queue_outcome` whitelist. Record reconciliation is a governance review, not automatic deletion.
- 0 readback-verified rows lacked readback-reference text in the bounded check.
- 187 deferred rows have no `last_reviewed_at` value (absence of this timestamp does not prove the source has never been reviewed by another process).
- `munch_queue_leases`: **0** rows; no active leases.
- Neither `munch_queue_entries` nor `munch_queue_leases` has an explicit row in `jc_savage.lifecycle_retention_policy`. Existing `vw_queue_retention_sheet` covers other outboxes, not MUNCHER-X. This means the audit found **no explicit MUNCHER-X retention/compaction schedule** in that policy, not that the queue must be deleted.
- Both the queue and lease tables have RLS enabled. RLS-policy completeness was not exhaustively security audited.
- `JCS-API-ANYTHING-SYN-%` queue rows: **0** before and after; total remains **286**.
- Singleton workflow execution control: production dispatch false, claims false, Codex writes false, evidence required true.
- The pilot did not create a route, cron, owner, Storage object, secret, or schema change.

## Isolated contract simulation

- [GitHub Actions run 39726576449](https://github.com/jshonuff/auto-browser/actions/runs/39726576449) executed `node --test` against a pure in-memory representation of the read-only-inspected MUNCHER lifecycle.
- **32/32 passed, 0 failed**, using only built-in Node modules, no website requests, no Supabase token, no live function invocation, and no external worker.
- Test categories: lease ownership/expiry, source readability and sufficiency, provenance, owner resolution, duplicate/conflict and confidence gates, positive delivery target-version/readback receipt, unsupported types, negative/no-action outcomes, intact document hash, MUSIC canonical lineage, no implicit retention/delete permissions.
- These tests validate the simulation's chosen behavior against the inspected gate descriptions; they do **not** constitute an end-to-end execution or automatic proof that the production verifier is correct.

## Required bounded disposition / next gate

**PHASE 8 AUDIT COMPLETE. PRODUCTION INTEGRATION HOLD.**

1. Keep API Anything as an optional sandbox tool. Preserve current `CHATGPT_WEB` primary retrieval routes; `MUNCHER-X` source-intake owner; Human JC / IMC-1 approval before any real queue insertion or activation.
2. For a future external `goodreads.searchBooks` result, MUNCHER-X may classify evidence, but no positive owner-acceptance claim is supported for a generic `BOOK-X:` target via the current verifier. Do not broaden verifier target types without explicit owner approval, independent test and idempotent target readback.
3. Resolve the 39 legacy support-reference entries and two historical `TARGET_VERIFIED` labels by **read-only evidence review first**, rather than bulk edit.
4. Retention policy needs owner-approved design. Treat the MUNCHER queue as provenance-bearing and preserve it. No implicit 1-day TTL, cleanup trigger, or auto deletion.
5. If future adapter promotion is separately authorized, review data handling, website rights, origin/identity, PII, API Anything capture behavior, target versioning, material sync consumers and readback behavior; no credentials or paid services.
