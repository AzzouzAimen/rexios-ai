# Platform Chat Implementation Plan

> Execute inline with superpowers:executing-plans, following the user's request to build this demo and existing main-only/no-subagents preferences.

**Goal:** A bilingual streamed platform guide grounded in a curated local JSON file.

**Architecture:** Static guide + few-shot messages + recent chat → existing Featherless client → validated answer and source IDs → streamed React panel.

**Tech Stack:** Existing React/Nest/LangChain/Zod/PostgreSQL sessions; no new packages.

**Spec:** `docs/superpowers/specs/2026-10-29-platform-chat-design.md`.

## Constraints and review focus

- Public endpoint, but account role comes from the server session; no identity/private records enter inference.
- Only completed exchanges enter history; user input/history never receives system-message authority.
- Unknown source IDs cannot create unsafe or nonexistent navigation links.
- Stops, failed streams, retries, route/language/account changes preserve a coherent UI.
- Static information never becomes a claim about live applications, payments, NDA verification or actions performed by the bot.
- Stay on main, no browser checks, no dependencies, no deployments or database changes.

### Task 1: Guide, prompt and generation

Files: `server/src/ai/knowledge/platform-guide.json`, `platform-chat.schema.ts`, `platform-chat.prompt.ts`, `platform-chat.ts`, `server/tsconfig.json`, `server/test/platform-chat.test.ts`.

- [x] Write meaningful failing tests for request/history/source validation, prompt examples, partial streaming, repairs and cancellation.
- [x] Add curated guide, typed JSON import, few-shot messages and grounded JSON answer validation/repair using the shared Featherless model interface.
- [x] Verify tests/build, verify JSON emitted into dist, commit.

### Task 2: Streaming HTTP integration

Files: `server/src/ai/platform-chat.controller.ts`, `server/src/main.ts`, `server/test/platform-chat-api.test.ts`.

Interface: POST `/api/ai/platform-chat/stream`, request `{message,history?,lang,page?}`; SSE preview `{type:'preview',answer}`, phase `{type:'phase',phase,attempt}`; complete `{type:'complete',result:{answer,resources:[{id,title,path}]}}`.

- [x] Test public access, invalid input before inference, session-derived role, safe errors and no domain writes against local inference stubs.
- [x] Register controller, normalize page context, pass only account type, handle disconnect/timeout/heartbeat and safe terminal errors.
- [x] Build API, run focused HTTP tests, commit.

### Task 3: Chat panel and handoff

Files: `src/api/platformChat.ts`, `src/hooks/usePlatformChat.ts`, `src/components/PlatformChat.tsx`, `src/App.tsx`, `src/data/policies.ts`, `docs/PLATFORM-CHAT.md`.

- [ ] Add chat client/hook with completed-turn history, smooth previews, safe resource buttons, cancel/retry/clear, account-reset and unmount cleanup.
- [ ] Add responsive global launcher/panel and role-aware starters in the existing theme; disclose AI status and memory/privacy behavior briefly.
- [ ] Update privacy copy for chat processing and document guide maintenance, local testing and architecture sources.
- [ ] Build/lint, run regression coverage, live-test normal/Arabic/follow-up/refusal/unsupported questions, review changes and commit.

## Progress

- Design and plan prepared from current routes, permissions and existing streaming code. Implementation authorized by the user's request.
- Task 1 complete: five focused tests pass; backend build passes and `dist/ai/knowledge/platform-guide.json` exists. The guide covers 18 public product topics and the prompt includes nine positive/refusal/uncertainty examples.
- Task 2 complete: backend build and five HTTP tests pass. Public streams include previews and validated source buttons; account context uses role only; invalid/forged requests never invoke inference and safe errors omit provider diagnostics.
