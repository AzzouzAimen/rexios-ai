# AI proposal prioritization

Companies open a challenge's **Review proposals** page and choose **Compare proposals with AI**. Real explanations stream first; after validation the page switches to **AI priority · Pending**. Rank, fit label, strengths, gaps and a follow-up question explain the order. **View full proposal** opens the original approach and profile. **Newest · All proposals** restores ordinary review. Decisions remain manual.

The latest comparison is saved per challenge, including both languages. Reloading or changing language does not require inference. Changed requirements, pending proposal membership/content/timeline or declared skills mark the saved result **Needs refresh**. Stale results cannot drive ordering. A comparison needs an open challenge and at least two pending proposals.

## Implementation

- Uses the existing Featherless/Gemma configuration, LangChain adapter and LangGraph, with ordinary JSON output and Zod validation. No new runtime packages, model service or API key variables.
- Sanitized context contains public challenge fields, proposal text, delivery estimates and declared technical skills. Identity, education, contact details, private notes, links and file contents are excluded from inference. Linked projects and skills are not verified. The prompt treats embedded instructions as data and does not use percentage scores or claim hiring decisions.
- Loads all pending proposals independently of the visible page. Every eligible ID must appear exactly once in the validated result. AI order is applied before pagination. The result is saved only after a fresh input check; row locking coordinates that check with existing submission/decision operations.
- Shared SSE decoding and safe JSON string-prefix decoding are also used by the brief assistant. The UI reuses SmoothText, ShinyText, skeletons, existing card styles and reduced-motion rules. Cancellation disconnects inference; failures retain the previous saved result and manual review.
- Saved output is an advisory comparison of supplied claims, not code execution or proof of technical competence. The model may vary the order among similarly weak proposals.

Authenticated, company-owner-only routes:

```text
GET  /api/company/problems/:id/proposal-comparison
POST /api/company/problems/:id/proposal-comparison/stream  { "lang": "en" | "ar" }
GET  /api/company/problems/:id/applications?order=ai|newest&page=1&limit=20
```

The GET comparison returns pending count, current/stale status, candidate display labels and the last saved bilingual result. POST streams snapshot metadata, workflow phases, provisional text and a validated completion or safe error. Names are display metadata only. Existing listing clients default to newest.

## Local demo

With the existing local database, server dependencies and ignored AI configuration:

```powershell
npm --prefix server run db:migrate
npm --prefix server run db:seed:proposals
npm run api:dev
```

In another terminal run `npm run dev`. Sign in as **c@demo.test / 123**, then open:

```text
http://127.0.0.1:5173/company/problems/demo-proposal-comparison/applications
```

The explicit seed adds one offline stitching-log challenge and four contrasting, fully populated talent proposals: concrete offline design; plausible approach with unclear offline support; cloud-only conflict; broad skills with an unspecified approach. It does not seed AI output. New talent accounts are `p1@demo.test` through `p4@demo.test`, using `DEMO_PASSWORD` or `123` when first created. Repeating the command preserves existing text, passwords and decisions; it does not reset a completed challenge. Normal demo accounts must already exist. No global reseed is needed.

Demo sequence: show the four approaches → Compare → show the top explanation and a conflicting proposal → expand the original → switch language/order → reload to demonstrate saved analysis. Delivery and payment remain outside the platform. Do not accept/reject the seeded proposals before recording unless you intend to retain those decisions.

## Verification

- Full integration suite: **91/91 passed**, including comparison membership, sanitized context, owner access, persistence, all 23 proposals across pagination, output repairs, failure preservation, stale input rejection, manual-decision invalidation and repeatable seed preservation. Existing brief streaming and core workflows passed.
- Backend/frontend builds pass. Lint retains the same four pre-existing warnings; Vite retains its existing bundle-size advisory.
- Real Featherless runs produced usable bilingual rankings and saved them. In the final Arabic browser run, first summary text arrived at **17.7 seconds**, with **19 summary updates** and completion at **50.8 seconds**. An earlier English run took considerably longer; provider timing is variable and these are observations, not a latency guarantee.
- Playwright verified actual generation, saved reload, newest/AI order, original-proposal expansion, both languages, no overflow at 390 px and reduced motion. Real cancellation preserved the saved timestamp. Temporary browser fixtures verified provider error visibility, changed-input fallback, correct decision IDs, and language switching during streaming; fixtures were removed afterward. No live deployment was changed.
- Additional live evaluations passed on one model call each: an instruction-injected weak proposal did not displace the concrete offline approach or leak its override marker (113 seconds); an all-incomplete two-proposal set received limited-fit labels for both instead of inventing a strong candidate (40 seconds). Full outputs are ignored local QA artifacts. This is a small demo evaluation, not an exhaustive ranking benchmark.

## Later VPS deployment

This update needs both images rebuilt and the new additive `ProposalComparison` migration. Use the existing protected `.env.vps` and Rexios-scoped helper; no new port or shared proxy change is needed. After an explicitly requested push/deployment:

```bash
cd /home/opc/rexiosai
git pull --ff-only origin main
bash deploy/vps.sh build api
bash deploy/vps.sh build rexios-web
bash deploy/vps.sh run --rm --no-deps api npm run db:migrate
bash deploy/vps.sh run --rm --no-deps api npm run db:seed:proposals
bash deploy/vps.sh up -d --no-deps --no-build --pull never --wait api rexios-web
```

Verify owner login, streaming, saved-result reload and manual review through the public hostname. Preserve the database, uploads, other projects and existing secrets. No automatic production seed, deployment or GitHub push runs as part of this implementation.
