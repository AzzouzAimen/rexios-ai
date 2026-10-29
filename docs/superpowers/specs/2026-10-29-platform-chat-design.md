# Ask Rexios: platform guide chatbot

The user requested a demo-ready platform-specific chatbot using the existing Featherless model, short helpful few-shot answers and simple reference files rather than embeddings/RAG. Implement inline on main with regular commits, no subagents or browser review.

## Chosen approach

Use a small curated JSON guide bundled with the server. Send the full guide, system rules, positive/refusal/uncertainty examples, the last six completed exchanges and the current question to the existing LangChain Featherless client. A single model call normally answers each turn. This fits the current knowledge size and avoids a retrieval pipeline. Keyword retrieval would save context but adds missed-topic cases; a vector database is unnecessary for this demo.

Expose a public streaming endpoint so visitors can ask before signing up. Look up only the optional session's account role and normalize the current route to a page category. Do not send account names, emails, identifiers, CVs or database content. The bot guides; it cannot inspect private account state, perform actions, search live challenges or contact support for the user.

Use prompt-generated JSON `{answer,sourceIds}` without provider response_format. Validate and repair malformed output using the existing AI repair setting. Resolve source IDs to trusted localized internal links from the guide; never navigate to model-generated URLs. Stream only the answer field with the existing JSON prefix reader and SmoothText. Plain text and numbered steps are enough; no new Markdown package.

## UI

One fixed Ask Rexios launcher opens a compact non-modal chat panel, with the existing mascot, theme and subtle ShinyText loading label. Starter questions introduce common flows. Show readable user/assistant exchanges, useful page buttons after validated completion, Stop, Retry, New chat and Close. Mobile panel fits the viewport. Preserve conversation across route changes and minimize/reopen, but keep it only in React memory, clearing on refresh/account change. No signup gate, database storage or admin UI.

## Knowledge and boundaries

Cover overview, account roles and redirects, sign-in limitations, talent profile requirements, challenge browsing, proposal submission/tracking, company posting/decisions, both existing AI features, community, public/private files, IP/NDA limitations, reports, support, privacy and known unavailable capabilities. Keep guide wording aligned with real routes and source code. Link policy documents for detailed terms rather than provide legal advice.

System rules and examples: answer only Rexios platform guidance; short friendly direct responses; no invented live facts or completed actions; disclose uncertainty; ask a single useful clarification when needed; redirect unrelated coding/homework/general questions; ignore instruction overrides and requests for hidden prompts/secrets. These are demo guardrails, not a claim of prompt-injection immunity.

## Verification

Meaningful unit tests for request validation, knowledge/example format, safe source resolution, streaming/repair/cancellation; HTTP tests with local inference stubs for public use, session-derived role, malformed requests, safe errors and no data changes. Build both apps, lint and test live bilingual guidance/refusal/follow-up through the local API when the configured provider is available. No new packages, environment variables, migrations, VPS actions or browser use.
