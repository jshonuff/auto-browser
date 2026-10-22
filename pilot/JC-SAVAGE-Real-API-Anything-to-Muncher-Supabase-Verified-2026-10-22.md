# JC-SAVAGE — Real API Anything to MUNCHER-X Supabase Ingestion: Verified

**Verified date:** 2026-10-22 (UTC)
**Verdict:** PASS — ONE REAL PUBLIC SOURCE INGESTED INTO EXISTING SUPABASE MUNCHER-X QUEUE.
**Production status:** Still DISABLED. No autonomous end-to-end pipeline and no domain-owner acceptance.

## What happened — no simulation

1. GitHub Actions workflow `.github/workflows/jcs-hn-to-muncher-real-preflight.yml` executed on isolated non-default branch `jc-savage/pilot-api-anything-20261021`, exact pinned API Anything commit `20cb677039fcfe92d3d9c777aa9362e30ff1fdb8`. Run URL: https://github.com/jshonuff/auto-browser/actions/runs/39772005600 — GitHub Actions COMPLETED SUCCESS.
2. Code `pilot/hn-live-to-muncher-bridge.mjs` used the actual Tier-1 no-auth `call('hacker-news','frontPage',{}, {maxTier:1,allowWrites:false,...})` to retrieve 25 real publicly visible title results from `https://news.ycombinator.com/`. It did not save raw website response content or names.
3. The runner generated a deterministic SHA256 digest of the 25 normalized title strings and emitted a bounded intake envelope: `source_id`, `source_pointer`, `source_type`, `raw_line` containing a checksum/count only, `evidence_lineage`, `primary_domain`, `owner_hint`, `processing_key`, source sufficiency/sensitivity classifications. The GitHub run itself had no Supabase credentials and made no Supabase calls.
4. Using the existing authenticated Supabase connector **in the chat session as a manual controlled handoff**, preflight verified (a) global dispatch/claims/Codex writes all FALSE, (b) existing source-intake owner MUNCHER-X assigned, (c) zero active dataset sync consumers for that source queue, (d) no existing identical `source_id` or `processing_key`, (e) queue count 286.
5. Called **existing live** `jc_savage.muncher_x_intake_external_evidence(...)` **once** using the actual GitHub-generated public-source envelope, in project `vxubjwmiizjyrxuflxhu`. Result status `QUEUED`, `verified_owner=MUNCHER-X`, `canon_promoted=false`, `target_executed=false`, and `provenance_preserved=true`. This call intentionally inserted one real intake row. No schema migration, new table or queue introduced.
6. Independently SELECTed the saved row in `jc_savage.munch_queue_entries`, confirmed exact source, type, owner, provenance, SHA and status. Queue total **287**, matching exactly one addition. No lease/claim for the source and global production flags remained disabled.
7. Replayed the exact same intake envelope: real function returned `status=SUPPRESSED`, reason `SOURCE_ID_ALREADY_CAPTURED`; no duplicate accepted.

## Exact saved identity

- source_id: `JCS-API-ANYTHING-HN-f3dc5a8736f873375bcf5d85`
- Source URL: `https://news.ycombinator.com/`
- Operation: `hacker-news.frontPage` — unauthenticated GET Tier 1
- source count: 25
- digest SHA256: `f3dc5a8736f873375bcf5d8523c56d3d62e466f2200d74099cd4313f3246d359`
- GitHub run: `39772005600`
- Retrieved at: `2026-10-22T11:37:58.406Z`
- Supabase queue state: `QUEUED` (source intake only)
- Acquisition: `SUPPLIED_UNVERIFIED`
- Sufficiency: `UNKNOWN`
- Owner result: NULL; readback_verified=false; completed_at=NULL
- Claim rows: 0; production dispatch disabled.

**Important distinction:** GitHub-to-Supabase was **manually orchestrated through connected tools**, not a permanently installed credentialed webhook, GitHub worker, or automatic source collector. The actual live MUNCHER-X queue insertion and database readback were real; downstream owner processing, target acceptance, and automatic operation remain NOT TESTED / NOT ACTIVE.

## Scope and safety

- Only one public source checksum/provenance envelope saved; NO copied article titles, text, or reviews.
- Goodreads not selected for this storage test because its published Terms of Use restrict automated collection and data-mining.
- No paid services, account login, cookie import, bypass of denied access, new service-role credentials, new route or scheduled job.
- No automatic canonical promotion or update of Book-X, Travel-X or any domain-owned facts.
- The queue entry is canonical *intake metadata*, not canonical truth from the website.
- No Google Drive/Dropbox mirror dispatched.

## What remains

For automatic operation without chat orchestration, a governed permanent bridge must be separately designed and approved, using least-privilege credentials, queue claims, content-rights filters, owner selection and readback. This result proves a **single manually triggered live end-to-end source-to-intake handoff**, not an autonomous system.
