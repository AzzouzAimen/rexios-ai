# Support and Policies Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. User requested plan then implementation; no approval stop or subagents.

**Goal:** Add readable policies, persisted content reports and a simple support form.

**Architecture:** Add two small Postgres models and Nest POST endpoints; public React reading/contact pages and a shared reporting dialog integrate with current detail screens.

**Tech Stack:** Existing React, Tailwind, Nest, Prisma and PostgreSQL. No new packages.

**Spec:** `docs/superpowers/specs/2026-10-29-support-and-policies-design.md`

## Global Constraints

- Work directly on main; preserve existing work and theme; commit working stages.
- Public bilingual policy/support pages; authenticated reporting only.
- Persist submissions; no public inbox, email delivery, moderation dashboard or automatic content removal.
- No browser verification, downloads, external deployment or destructive resets.

## Review Focus

- Guests can contact support but cannot report content without signing in.
- Blank/oversized/unknown fields fail validation; free text is displayed as plain text.
- Missing or unpublished targets cannot create reports.
- Repeated reports return the same reference; callers cannot forge reporter identity or content URLs.
- Successful responses contain only references, never message bodies or other users' details.

### Task 1: Persist support requests and content reports

**Files:** `server/prisma/schema.prisma`, additive migration, `server/src/support/support.controller.ts`, `server/src/main.ts`, `server/test/support.test.ts`.

**Interfaces:** POST `/api/support/requests` accepts `{name,email,topic,message,language}` and returns `{reference}`. POST `/api/reports` accepts `{targetType,targetId,reason,details?,language}` under SessionGuard and returns `{reference}`. Target types: PROBLEM, QUESTION, ANSWER. Reasons: SPAM, ABUSE, CONFIDENTIAL, MISLEADING, OTHER. Topics: GENERAL, TECHNICAL, ACCOUNT, PRIVACY.

- [x] Add focused integration tests for Review Focus cases and observe missing endpoints fail.
- [x] Add `SupportRequest` and `ContentReport` models, additive migration, trimmed DTOs, target validation and report upsert; register controllers.
- [x] Build API, migrate local database, run focused test and commit.

### Task 2: Add policies and contact/support pages

**Files:** `src/data/policies.ts`, `src/components/InfoPage.tsx`, `src/pages/PolicyPage.tsx`, `src/pages/SupportPage.tsx`, `src/api/support.ts`, `src/App.tsx`, footer and signup.

**Interfaces:** Public `/terms`, `/privacy`, `/support`; localized structured article data. `sendSupportRequest(input)` returns `{reference}`.

- [x] Add shared page framing and bilingual policy content aligned with implemented functionality.
- [x] Add support form with required fields, pending/error/success/reference states and privacy link.
- [x] Connect routes, footer links and signup terms links; build frontend and commit.

### Task 3: Integrate reporting and verify

**Files:** `src/components/ReportButton.tsx`, challenge and community detail pages, `docs/SUPPORT.md`.

**Interfaces:** `ReportButton({targetType,targetId})` handles authentication, reason/details form, request state and confirmation. Native dialog supplies focus/Escape/backdrop behavior; do not stack an auth modal over it.

- [ ] Add reusable localized reporting dialog and integrate challenge/question/answer detail actions.
- [ ] Document routes, saved-data retrieval and policy factual edits.
- [ ] Build both apps, lint, run relevant integration coverage, review diff and commit.

## Progress

- Planning complete; implementation authorized by the current user request.
- Task 1 complete: API build passes; local additive migration applied; support integration test passes 5/5. Test fixtures corrected to follow existing registration password requirements and list-valued challenge requirements. No runtime behavior changes beyond the plan.
- Task 2 complete: frontend build passes. Public policy/support routes, footer and signup links wired; contact alias redirects to support. Policy factual edits documented in the design.
