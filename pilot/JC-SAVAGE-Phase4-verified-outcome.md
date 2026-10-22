# JC-SAVAGE — API Anything Phase 4 Second-Site Pilot
Date: 2026-10-21 CT (GitHub Actions execution in UTC October 22)
Authority: live JC-SAVAGE Supabase remains canonical; Human JC final approving authority.
Environment: existing GitHub branch `jc-savage/pilot-api-anything-20261021` in `jshonuff/auto-browser`, no default-branch changes.

## Confirmed run results

1. **Initial three-path Goodreads test** — GitHub Actions run [39719360908](https://github.com/jshonuff/auto-browser/actions/runs/39719360908): FAIL as expected due to a Chromium GET receiving **HTTP 403**. This is a website access denial, not evidence of a functional browser speed comparison. No login imported and no attempt to circumvent access control.
2. **Corrected two-path public GET test** — run [39719702738](https://github.com/jshonuff/auto-browser/actions/runs/39719702738): **SUCCESS**. It did not retry the denied Chromium request.
3. Operation: `goodreads.searchBooks`, public Goodreads autocomplete GET query `hyperion`, API Anything source commit `20cb677039fcfe92d3d9c777aa9362e30ff1fdb8`. Temporary dependency override `hono=4.13.11`, no upstream or production change.
4. API Anything median: **207.5 ms** across three requests (207.5, 227.7, 198.2 ms).
5. Plain Node HTTP median: **196.8 ms** across three requests (315.1, 196.8, 187.1 ms).
6. **Content parity: 5/5 matching book IDs in each of all three trials**.
7. API Anything was **about 5.4% slower** than direct HTTP for this particular endpoint, approximately 10.7 ms median overhead.
8. No model-token or dollar-cost benchmark was performed; no claim of overall cost reduction.

## Security and persistence review
- No authenticated operations, browser session cookies, private account access, paid services, or write operations.
- No scraped Goodreads text or book data persisted to GitHub source, GitHub artifacts, Supabase, Storage, Dropbox, Google Drive, or ChatGPT Memory. GitHub Actions logs retain counts, latencies, and the fixed public test query.
- Execution home was a disposable GitHub Actions directory.
- Live Supabase was inspected **read-only**. `public.book_x_sources` and `public.book_x_projects` have provenance fields but are owned by Book-X; they are **not generic website caches**.
- Refer to `pilot/JC-SAVAGE-source-intake-contract-DRAFT.md` for a proposed owner-gated candidate envelope, provenance key, and deduplication mechanism. Design is **not implemented**.

## Decision
**Second-site public read-only operation passed.** Public direct API-style requests can execute and retrieve results consistent with plain HTTP; they do not confer access to denied Chromium requests, are not always faster than native fetch, and should remain narrow, owner-controlled, and optional.

**PRODUCTION HOLD remains unchanged.** No user authorization for canonical state writes, credentials, background recrawls, or dispatch activation has been issued under this pilot.
