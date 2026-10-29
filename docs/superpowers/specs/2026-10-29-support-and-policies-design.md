# Policies, reporting and support

Build a small, bilingual demo feature set within the existing React/Nest/Postgres app. The user requested planning followed immediately by implementation, with minimal complexity. Continue directly on main and commit working stages; no subagents or browser checks.

## Approach

Use two public reading pages (`/terms`, `/privacy`) and a public `/support` contact form. Add footer links and real signup policy links. Reuse the cream/cobalt/lime pixel theme, native form controls and the app language setting. Prefer short introductions, readable article sections and simple success states.

Use a reusable Report button and native dialog on public challenge details, community questions and community answers. Require a signed-in account to report; show the existing sign-in prompt to guests. A reason selector and optional explanation are sufficient. Store one report per account/content target, return its reference on repeat submissions, and never auto-hide content. Validate target visibility on the server so unpublished challenges cannot be reported by guessing IDs.

The support form needs name, reply email, topic and message. It works for guests, prefills signed-in account details, saves to Postgres and displays a reference. No email delivery, inbox, admin panel, file upload or promised response time. Explain in developer documentation how the team reads saved messages and reports. No public endpoint exposes that data.

## Policy content

Use the supplied October 2026 terms/privacy document as the source, preserving conduct, confidentiality, intellectual property and user-rights sections. Update factual descriptions that do not match the MVP: no NDA signing system, no automatic CV parsing, no verified candidates or blanket encryption guarantees. Describe the implemented AI drafting and proposal comparison through Featherless and the exclusion of names/CVs/private notes from proposal comparison. Link privacy/account requests to support. Provide Arabic translations and English text, with no external legal assertions or claim of legal review.

## Alternatives

Email-only links would be smaller but no support address was supplied and reports would not be reliably stored. A full ticket/moderation dashboard adds unnecessary scope. Persisted forms plus reference numbers meet the demo requirement with no new dependencies or services.

## Verification

Add focused API integration tests against the isolated test database for public support, authentication, validation, real targets, hidden drafts, deduplication and private responses. Apply only additive migrations to the local development database. Build both apps, lint and review the changed code. No VPS actions, pushes or database resets.
