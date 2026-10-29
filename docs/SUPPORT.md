# Policies, reports and support

Public pages: `/terms`, `/privacy`, `/support` (`/contact` redirects to support). All three follow the app's Arabic/English setting, are linked in the footer and can be read without signing in. Signup links open the policies in a new tab to preserve the form.

## Demo walkthrough

1. Open `http://127.0.0.1:5173/terms` or `/privacy`; toggle language in the navbar.
2. Open `http://127.0.0.1:5173/support`. Send a message with a valid reply email and at least ten characters. A successful submission displays its saved reference. Guests can use this form too.
3. Sign in (for example `s@demo.test` / `123`), open a public challenge or community question, and choose **Report**. Questions and individual answers have their own report actions.
4. Select a reason and optionally add details. After submitting, the dialog confirms the saved reference. The original content stays visible. Repeating the same report after reloading returns the existing reference.

## What is implemented

- `POST /api/support/requests` saves `{name,email,topic,message,language}` to `SupportRequest`.
- `POST /api/reports` requires a valid session and saves `{targetType,targetId,reason,details?,language}` to `ContentReport`, with the reporter and canonical content path resolved by the server.
- Target types are `PROBLEM`, `QUESTION`, `ANSWER`. Only published challenges are reportable. A compound unique constraint prevents duplicate reports by the same account on the same content.
- Both return only `{reference}`. There is no public list/detail endpoint for these submissions.
- No outgoing email, support inbox UI, notification integration, automated moderation, response-time guarantee or admin dashboard was added. The team reviews records directly in the database for this demo.

## Reading submissions locally

From the repository root, open the existing database shell:

```powershell
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Inside psql:

```sql
\x on
SELECT * FROM "SupportRequest" ORDER BY "createdAt" DESC LIMIT 20;
SELECT "id", "targetType", "targetId", "targetPath", "reason", "details", "reporterUserId", "status", "createdAt"
FROM "ContentReport" ORDER BY "createdAt" DESC LIMIT 20;
```

Treat this output as private. Support messages contain reply emails and reports identify their submitter. To find one submission, filter `"id"` by the exact reference shown to the user. Set a specific record's `"status"` to `CLOSED` manually after handling it if needed; no status workflow is imposed in the app.

## Policy source and factual edits

The supplied October 2026 terms/privacy text is the source. Its structure and core conduct/confidentiality/IP rules were retained, with Arabic translations. It was edited to describe current functionality rather than claim planned features are available:

- NDA agreements are arranged directly; there is no in-app digital signing or credential-verification workflow.
- Current AI features are challenge drafting and proposal comparison through Featherless, not automatic CV parsing, AI profile generation or verified skill matching.
- Proposal comparison excludes structured identity/education/contact fields, CV files and private challenge notes. Personal details written inside a proposal are still part of its text.
- Blanket encryption/storage guarantees were replaced by the actual controls: password hashes, sessions and server-side permissions.
- Support/report data, session cookies and browser language storage are described. Privacy requests route to the manual support form.

This was a product-accuracy edit of team-supplied copy, not a legal review.

## Development/deployment

No new dependencies, services, environment variables or ports. The additive `20261029010000_support_and_reports` migration creates two tables and a reporter relation; it does not reset existing data. Apply normal migrations before restarting the API. Existing seeds do not fabricate reports or support messages.

Verification: `npm --prefix server run build`, `npm run build`, `npm run lint`, and `npm --prefix server run test:integration`. Tests use the separate `_test` database and local inference stubs.
