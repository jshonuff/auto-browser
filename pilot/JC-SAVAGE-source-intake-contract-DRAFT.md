# JC-SAVAGE API Anything — External-source intake contract (draft, NOT activated)
Status: DRAFT / READ-ONLY EVALUATION
Prepared: 2026-10-21 (America/Chicago)
Executor: existing GitHub Actions isolated pilot branch only
Canonical project: `vxubjwmiizjyrxuflxhu` (live schema inspected, metadata read only)

## Governance
- Canonical mutable state: **live Supabase**; Human JC is final approving authority.
- This design does not introduce a new owner, table, schema, credential, task, queue, or production job.
- Existing domain owners supersede generic ingest. Reconcile against canonical owner before proposal of any write.
- Dropbox and Google Drive are derived mirrors, exports, recovery, or provenance surfaces; never silent primary authority.
- ChatGPT Memory is routing/context only, never a structured source store.

## Data disposition
1. **Execution**: `api-anything` operates in isolated runner with `API_ANYTHING_HOME` in ephemeral temporary directory. No browser profile import, site login, cookies, secrets, account session, or writable operation allowed in this pilot.
2. **Raw page and captured payload**: temporary for one test only; never uploaded to runner artifacts or copied into GitHub log output. No scheduled recrawl.
3. **Testing evidence**: source commit, dependency version, site name and operation, run id, request counts, result counts, code/test checks, redacted timings. Only this metadata may appear in GitHub logs.
4. **Future substantive intelligence** (not active): First classify dataset and owning domain. Propose a *candidate* record with citation/provenance, never directly overwrite governed canonical facts.
5. **Large approved documents** (future separate approval): private Supabase Storage; database row indexes checksum and storage path. No automatic Google Drive mirror unless its established owner dispatches an authorized derived copy.

## Candidate envelope (SPECIFICATION ONLY — no deployed table)
```json
{
  "status": "candidate_unpromoted",
  "owner_domain": "requires_live_resolution",
  "provider": "goodreads",
  "operation": "searchBooks",
  "external_resource_id": "bookId",
  "source_uri": "https://www.goodreads.com/book/show/{bookId}",
  "retrieved_at": "ISO-8601 UTC observation time",
  "api_anything_commit": "20cb677039fcfe92d3d9c777aa9362e30ff1fdb8",
  "recipe_digest_sha256": "SHA256 of reviewed operation JSON",
  "normalized_content_sha256": "SHA256 of allowed normalized fields (not entire page)",
  "field_confidence": "unverified_external",
  "evidence_locator": "authenticated provenance supplied by owning subsystem",
  "promoted_at": null
}
```

## Deterministic deduplication
- **Entity identity key**: `(provider, external_resource_id)` when supplied. If no stable resource id: `(provider, normalized canonical URL)` as a weaker candidate key.
- **Version key**: `(entity identity key, normalized_content_sha256)`. A re-fetch with matching hash is unchanged; a different hash is a *new observation*, not an automatic mutation of the canonical row.
- **Provenance**: source URI, retrieval timestamp, extraction operation/revision, canonical owner and evidence confidence accompany any candidate.
- **Human/owner gate**: verify source trust, attribution, license/terms, source-date freshness, record identity, nonduplicate match, and conflicts before any promotion. No domain owner bypass.

## Existing owner observations (verified via live information_schema)
- `public.book_x_sources` includes `source_key`, `book_key`, `content_text`, `capture_context`, `source_provenance`. It indexes Book-X source material and **is not automatically the destination for Goodreads search responses**.
- `public.book_x_projects` has `book_key`, `source_provenance`. Its canonical project entries are not bulk-expanded by external book searches.
- `public.health_x_source_pages` is health-source specific, not a general web document cache.
- Do not add `web_scrapes`, `knowledge_base`, `ingestion_jobs` or duplicate generic tables without fresh owner resolution, architectural review and Human JC approval.

## Security and retention gates
- Public HTTPS, fixed approved hosts, GET-only, one operation at a time; no authenticated endpoints.
- No cookies, credential handling, prompts embedded in website text, PII, private pages or other accounts.
- `allowWrites:false`, `maxTier:1` and strict operation verification in code.
- No publishing learned operations, no automatic third-party API key reuse and no website ToS bypass.
- Respect access restrictions and rate limits, no repeated retries against blocks.
- Isolated GitHub runner may log only operation metadata; never website payloads.
- Review dependency advisories before any promotion; temporary Hono 4.13.11 override is not an upstream patch.

## Current decision gates
- Technical proof for second site: see separately verified GitHub Actions logs.
- Canonical data writes: **NOT AUTHORIZED**.
- Production dispatch or scheduled website collection: **NOT AUTHORIZED**.
- Private credentials and browser session imports: **NOT AUTHORIZED**.
- No paid services or schema changes.
