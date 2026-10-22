# JC-SAVAGE API Anything — Phase 6 Verified Owner Path and Conditional Integration Proposal

**Status:** READ-ONLY GOVERNANCE AUDIT COMPLETE; PRODUCTION / INTEGRATION NOT APPROVED
**Date:** 2026-10-21 America/Chicago (live connector readback)
**Canonical project:** Supabase `vxubjwmiizjyrxuflxhu`
**Evidence sources:** live read-only Supabase SQL in `jc_savage` and `public` schemas, GitHub `jshonuff/jc-savage-ai-workforce` default branch and the isolated `jshonuff/auto-browser` pilot branch.
**Classification:** proposal, not executable production directive.

## Critical correction to Phase 5

Earlier Phase 5 source scans emphasized the `public` schema and did **not** resolve the full JC-SAVAGE owner registry. Phase 6 inspected live `jc_savage.action_ownership_registry`, `jc_savage.ownership_routes`, `jc_savage.canonical_entity_ownership`, `jc_savage.tool_routes`, `jc_savage.system_components`, `jc_savage.approvals`, `jc_savage.workflow_execution_control`, and `jc_savage.book_x_owner_registry`. The proper existing external evidence intake owner is now independently verified:

| Role | Verified live identifier | Governing boundary |
|---|---|---|
| External source intake, provenance, classification and recommendation | `jc_savage.action_ownership_registry.action_key='muncher_x_intake_external_evidence'`; `accountable_owner_ref=MUNCHER-X`, `owner_state=ASSIGNED` | `canon_mutation_authority=false`, `target_execution_authority=false`; owning a function record does **not** prove a deployed callable runtime |
| Ambiguous or mixed-domain owner resolution | `TOOL:CHAIN-ROUTER-X`; `jcs_chain_owner_resolve`, `jcs_chain_router_resolve` | read-only owner/route lookup, no mutation; direct owner first when unambiguous |
| Approval lifecycle | `TOOLS:TOOL:IMC-1` / `DOC:JCS-FID-000041` | explicit Human JC approval required; no autonomous authority |
| Routine public web extract/research/crawl | `jc_savage.tool_routes` `ROUTE-WEB-EXTRACT`, `ROUTE-WEB-RESEARCH`, `ROUTE-WEB-CRAWL` | `ACTIVE` with `CHATGPT_WEB` primary; **do not change or replace** existing provider route as a side effect of pilot |
| Book-X domain truth and data | `jc_savage.book_x_owner_registry` + `jc_savage.book_authority_registry`; `jc_savage.book_projects`, book canon datasets as applicable | `BOOK-X` and its active owner registry; external titles/IDs are never canonical book project identifiers |
| Source control and history | `ROUTE-SOURCE-CONTROL` -> `GITHUB` | repository artifacts are software/evidence, not authoritative domain state |
| Existing workforce demo | `jshonuff/jc-savage-ai-workforce` `README.md` and `.github/workflows/jc-savage-worker.yml` | code currently reads `sample_jobs.json` only, dispatch disabled, no network/external runtime or production task claims |

**Live readback counts:** external-intake MUNCHER-X ownership records with no canonical mutation authority: 1; active `ROUTE-WEB-EXTRACT`: 1; active `ROUTE-JC-SESSION-INTAKE`: 1; `api-anything`-named provider routes, routing registry entries, action owner entries, system components: 0; `api-anything`-named entries in `jc_savage.approvals`: 0. The user has explicitly authorized sandbox tests in Chat; absence from the canonical approval ledger **does not negate that sandbox authorization**, but it also does not grant production promotion.

`jc_savage.workflow_execution_control` singleton readback: `production_dispatch_enabled=false`, `claims_enabled=false`, `codex_writes_enabled=false`, `evidence_required=true`. Do not change.

## Conditional proposal (not installed)

**Design principle:** API Anything is an OPTIONAL technical adapter beneath already-approved web retrieval, **not** a replacement web provider, a new intelligence owner, a new approval system, a cron worker or a canonical table.

For a future specifically approved eligible operation:
1. Session intake obtains exact requested research intent. Default active `CHATGPT_WEB` routes remain unchanged. If a caller with an approved API Anything runtime explicitly selects a supported public non-authenticated `GET` endpoint, validate the operation against the reviewed repository commit and per-host allowlist. **No independent autonomous crawler or scheduled job**.
2. Execute the one public operation with `maxTier:1`, `allowWrites:false`, no browser login or session-cookie import, no credential or auth header forwarding; stop on HTTP access controls or rate limits. Disable API Anything capture/recapture and self-healing browser fallback for the bounded adapter.
3. Normalize only permitted fields into an in-memory **unpromoted candidate envelope**, carrying `provider`, exact request/source URI, stable provider ID if present, observed_at timestamp, `source_type`, operation+revision, content SHA256, extraction method, and trust/rights notes. Exclude raw response payload from logs, GitHub source, Memory or general retention.
4. Route the unpromoted candidate into **MUNCHER-X intake disposition** conceptually; it owns classification/provenance/recommendation. If domain unambiguous, use existing direct-owner route. Invoke CHAIN-ROUTER-X only for mixed/ambiguous domain identity. Missing/ambiguous destination -> HOLD.
5. Dedup entity by `(provider, external_resource_id)` with a verified identity; revision by normalized allowed-fields SHA256. Already observed identical revision -> NOOP. Changed revision -> REVIEW. Titles alone cannot merge or update existing Book-X projects.
6. For a Goodreads catalog item, default disposition is **external research reference only**; never insert a Goodreads listing into `jc_savage.book_projects`, `public.book_x_projects`, or source registries without independent Book-X owner acceptance and Human JC approval. Domain-specific destinations require independent live authority review.
7. Any **future** canonical mutation uses approved owner-controlled workflow and IMC-1/Human JC approval, with independent provider/database readback and immutable evidence. Dropbox and Google Drive are derived/mirror providers only when their existing transports specifically require it.

## Security and licensing gates

- Current pinned upstream source: `goodnight000/api-anything` commit `20cb677039fcfe92d3d9c777aa9362e30ff1fdb8`; ephemeral pilot patched transitive Hono to `4.13.11` with no remaining npm production advisory at that test time; no claim of formal secure release or permanent upstream patch.
- Need review of present third-party host terms, robots/technical restrictions, access rights and content use before each integration. A website response may be publicly reachable yet unsuitable for automation or retention.
- Do **not** use API Anything to circumvent 403/login/security restrictions, copy session cookies, bypass rate limits or site API pricing, or perform writes.
- Enforce zero-credit requirement and verify GitHub Actions usage/cost independently before longer or regular execution.
- Explicitly avoid arbitrary network input parameters, untrusted downloaded shared specs, SSRF, redirects to unallowlisted hosts, content-driven agent instructions, and credentialed pages.
- MUNCHER-X governance ownership has been verified **as a registry record**. A production-capable ingestion runtime has **not** been demonstrated by this pilot.
- No new table, RLS policy, Storage bucket, route activation, secret, background automation or deploy is necessary or authorized by Phase 6.

## Tested evidence and limits

- Hacker News bundled `frontPage` passed public read-only test; after warm-up the API Anything library was faster than Chromium but slower than plain HTTP on that endpoint, in a constrained pilot.
- Goodreads `searchBooks` public HTTP operation returned 5/5 matching book IDs across three read-only comparisons with direct HTTP. Chromium hit HTTP 403; the test **did not bypass or retry** the denied browser access.
- Supabase Phase 5 synthetic classifier passed 10/10 cases. No actual Goodreads result was ingested or persistently stored.
- Current Phase 6 governance readbacks confirmed existing owners/controls, but did **not** call MUNCHER-X or an actual CHAIN-ROUTER-X runtime or test an ingestion write. Registered capability ≠ deployed integration.

## Decision and smallest next authorization

**PHASE 6 REVIEW COMPLETE; INTEGRATION HOLD.** Keep `CHATGPT_WEB` as existing active web provider and continue using manually triggered read-only sandbox proofs. If JC authorizes actual integration later, the exact bounded approval request should be:

> **Approve only an API Anything read-only adapter behind the existing web-extract routing path for an explicitly listed public GET operation and host. Preserve CHATGPT_WEB as primary, MUNCHER-X as intake owner, CHAIN-ROUTER-X as ambiguity-only router, and existing Book-X / other domain canonical owners. No credentials, no new registry tables, no automatic source persistence, no schedules, no production claims or canon writes. Review host terms, security, zero-dollar impact, and require independent runtime readback before any activation.**

That is an approval **proposal**, not a recorded or consumed approval. Implementing any live route/production trigger requires separate explicit Human JC authorization and security readback.
