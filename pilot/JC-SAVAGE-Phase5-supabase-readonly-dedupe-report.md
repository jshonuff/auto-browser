# JC-SAVAGE Phase 5 — Supabase owner routing and deduplication dry run

**Status:** VERIFIED READ-ONLY DRY RUN — not deployed
**Date:** October 21, 2026 CT
**Canonical state:** Existing live Supabase project `vxubjwmiizjyrxuflxhu`
**Evidence:** Read-only SQL results observed in the Supabase connector; zero DDL and DML operations.

## Scope
Evaluate where results from the previous public Goodreads `searchBooks` pilot would be routed, how to avoid duplicate records, and whether existing owners can safely be reused. The synthetic fixture does not contain the actual book IDs from the ephemeral pilot and does not claim to reconcile individual external titles with the live Book-X record set.

## Verified existing database (read only)
- `public.book_x_sources`: 105 current rows; unique primary key on `source_key`; 105 populated `source_provenance` fields; only 3 rows have nonempty `content_text`. Existing roles include source files, summaries, notes, and one external reference. This is not a general web cache.
- `public.book_x_projects`: 10 current rows; unique primary key on `book_key`, existing `source_provenance` populated on all 10 rows. A project is a governed Book-X object, not an arbitrary Goodreads listing.
- Relevant `book_x_sources`, `book_x_projects`, `health_x_source_findings`, and `dev_evidence_links` tables have RLS enabled and existing primary/unique indexes. RLS enabled does *not* prove each policy is secure; no full RLS policy audit performed.
- A bounded check found **zero Goodreads-marked records** in Book-X project/source provenance and zero Goodreads URLs in `dev_evidence_links`; this absence applies only to the examined fields, not all JC-SAVAGE records.
- A test using an actual Book-X title *as an in-memory comparison value* found one title collision; no content or project name was exported, and no canonical promotion was performed. Similar titles are not identity evidence.
- No matching API Anything/Goodreads owner was found by a limited keyword search in `dev_projects`. This is **not proof that no owner exists elsewhere**. Full owner determination remains a live governance gate.

## Executed synthetic deduplication simulation
A single, read-only SQL query composed 10 `VALUES` records and classified them using owner/provider/URL gates, `sha256(convert_to(jsonb::text,'UTF8'))` and preceding **eligible** observations. No transaction wrote any rows.

| Case | Expected and observed |
|---|---|
| 1 | NEW_CANDIDATE |
| 2 | UNCHANGED_DUPLICATE (same ID/hash with reordered JSON keys) |
| 3 | NEW_VERSION_REVIEW (same ID, changed normalized content) |
| 4 | NEW_CANDIDATE (distinct ID, same title/content) |
| 5 | BLOCK_NO_ID |
| 6 | BLOCK_HOST |
| 7 | BLOCK_PROVIDER |
| 8 | BLOCK_OWNER |
| 9 | UNCHANGED_DUPLICATE (replay of older version; not just previous version) |
| 10 | NEW_CANDIDATE (same ID as blocked host request; invalid prior request ignored) |

**Actual SQL assertion:** `synthetic_cases=10`, `passing=10`, `all_pass=true`.

### Proposed deterministic identifiers (not deployed)
- Entity: `(provider, external_id)` after host and owner checks, not title.
- Observation revision: `(provider, external_id, normalized_content_sha256)`. Hash equivalence on canonicalized allowed fields only.
- Raw public observations are candidates, never authoritative Book-X projects.
- Matching old hash: no-op; changed hash: review; title-only similarity: never auto-merge; missing owner: quarantine.
- Citation must carry original URL, retrieval timestamp, operation name, operation source commit, source identity and confidence.
- Domain owner authorization and independent human approval gates determine whether *anything* can be promoted.

## Caveats before implementation
1. SQL dry-run fixtures exercise classification, not a live ingestion pipeline or complete information-security audit.
2. There is not yet a verified live owner for a general cross-domain API Anything intake service; do **not** create one implicitly.
3. No schema changes, new registry tables, GitHub Actions schedules, provider credential imports, production dispatch, Storage uploads, Drive mirrors or Supabase writes were authorized or performed.
4. The Goodreads Chromium test received HTTP 403. No follow-up request attempted to bypass its access denial.
5. Website content and response data were not persisted; the preceding GitHub runs retained aggregate timings and counts only.
6. GitHub source in this pilot branch is development/provenance material, **not** canonical JC-SAVAGE state.

## Result and next gate
**PHASE 5 VERIFIED; PRODUCTION HOLD.**
Reusing existing domain owners and permitting read-only candidate proposals is viable as a design direction, but cannot be promoted until exact live ownership, policy, source-rights/terms checks and a separate authorized write path are reviewed. No new infrastructure is recommended simply to store website responses.
