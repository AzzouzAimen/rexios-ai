# Semantic Platform Chat Implementation Plan

**Goal:** Replace full-guide prompts with small multilingual semantic retrieval, preserving few-shot behavior, streaming and current UI.

**Approach:** Use Featherless `Qwen/Qwen3-Embedding-0.6B` (verified live: two English/Arabic embeddings returned 1024 dimensions). Precompute the 18 public section vectors once into a versioned JSON artifact. At runtime embed the question, compare locally with cosine similarity, and provide a handful of relevant sections to the existing Gemma chat model. No vector database, packages or model downloads. Retain the existing positive, uncertainty, off-topic and injection few-shot examples as explicitly requested.

**Scope:** Inline on main, regular commits, no subagents. Local implementation and tests only; Playwright MCP explicitly authorized for final review. No push/deployment or database reset.

## Task 1: Embedding client and versioned index

- [x] Add failing tests for ordered batch vectors, safe errors, cancellation, invalid vectors, index freshness and cosine ranking.
- [x] Implement backend embedding client sharing existing base URL/key, optional `FEATHERLESS_EMBEDDING_MODEL`, default Qwen 0.6B.
- [x] Implement public-guide fingerprint/index validation and an explicit index-generation command. Store generated vectors in a committed JSON file; build requires no API call or key.
- [x] Generate the real index, verify backend build/tests and commit.

## Task 2: Retrieval and chat integration

- [x] Test semantic section selection, weak-match behavior, follow-up context and exclusion of unrelated guide content from prompts.
- [x] Retrieve a few best sections in memory, carrying the previous question only for ambiguous follow-ups. Calibrate relevance using actual English/Arabic examples. Never fall back to the full guide.
- [x] Keep short scope rules and all existing few-shot examples; use only selected facts as authority. Limit final source IDs to provided sections plus the support fallback.
- [x] Add retrieval phase to SSE/frontend loading text; use the same timeout/disconnect budget for embeddings and generation. Fail safely if the index is stale or the provider fails.
- [x] Update API tests with embedding stubs, verify focused coverage and commit.

## Task 3: Live browser review and handoff

- [x] Update environment examples, guide maintenance and privacy documentation. Explain the new question-embedding call and index rebuild workflow.
- [x] Build/lint and run regression suite. Measure selected context size and inspect retrieval on varied questions.
- [x] Use Playwright MCP to exercise English, Arabic, paraphrases, follow-ups, topic switches, unrelated requests, prompt injection, unsupported capabilities, source links, Stop/retry/clear and mobile layout. Review actual replies and fix meaningful issues found.
- [x] Commit verified work and report evidence/limitations.

## Review focus

- No secret or private record enters the index; only public guide vectors are committed.
- Guide hash/model/dimension/section mismatch requires rebuilding, never a full-guide fallback.
- Arabic semantic retrieval works despite mostly English guide facts.
- History cannot dominate explicit topic changes; an unrelated question still gets an appropriate refusal.
- Few-shot examples remain; their unrelated example facts do not override retrieved knowledge.
- An embedding outage or cancelled request must not produce an ungrounded answer or leave the UI busy.

## Progress

- Read current implementation. Confirmed the small embedding model works with the existing Featherless credentials; no downloads or additional provider required.
- Task 1 complete: three focused tests and backend build pass; generated 18 x 1024 vectors in a roughly 390 KB JSON artifact. Real bilingual calibration found full factual paragraphs produced overly broad matches, so indexing now uses concise bilingual representative questions/titles, while answers still receive authoritative facts. Comparing 8B did not justify replacing 0.6B; improved topic descriptions made the smaller model useful. Prompt injection remains a scope-rule concern, not a similarity-score security boundary.
- Task 2 complete: both builds pass, focused chat coverage 15/15 passes, lint has the same four existing warnings. Retrieval supplies up to four relevant sections, using a calibrated floor and relative score window; profile requirements accompany application guidance. Weak matches provide no facts rather than the full guide. All nine few-shot examples remain. Local API restarted; browser review in progress.
- Browser finding/fix: an application follow-up correctly said My Applications but linked to applying because tracking facts were not retrieved. Added a failing regression, then included small next-step workflow hints for ambiguous follow-ups and required answer/navigation alignment. Regression passes and Playwright recheck now shows the My Applications button.
- Live Playwright cases: engineer/application paraphrase; contextual tracking; CV/GitHub alternative; AI shortlisting without automatic selection; football refusal; prompt override/hidden-instruction/acceptance refusal; NDA/escrow limitations; Arabic application, comparison, privacy/deletion, reporting and Google-placeholder help; natural-language challenge drafting guidance. Source navigation reaches Support, conversation survives navigation/minimize, New chat clears, and Stop/Retry succeeds against the real provider.
- Layout: 1440px desktop and 390x844 Arabic mobile reviewed; mobile body/panel have no horizontal overflow. Ignored screenshots saved under `.superpowers/semantic-chat-*.png`. Browser console has no current errors. Source edits during early development triggered normal Vite reloads; final browser checks were run after UI edits stopped.
- Final verification: backend/frontend builds pass; full suite 112/112 passes, then final prompt localization refinement verified with focused chat tests 16/16 and live Arabic replies. Lint has zero errors and four unchanged existing warnings. Demo Compose and layered VPS Compose configurations validate. No installs, model downloads, database changes, GitHub push or VPS deployment.
- Measured representative on-topic guide context: 0.6–3.1K characters versus 12.8K full factual context, about 76–95% less guide text. All nine few-shot examples remain; this does not imply an equal token-cost or latency reduction. One embedding request precedes each normal chat request. The shared runtime timeout/cancellation covers both.
