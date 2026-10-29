# Final demo adjustments — 2026-10-29

Rexios is described as a platform connecting companies and technical talent. Community remains the name of its discussion area. The landing page explains posting, proposing and selecting, and includes a company capability card whose signup link preselects the company account type.

Challenge entry points use “Post a challenge” / “اطرح تحديًا”; browsing uses Challenges. Authenticated navigation omits the redundant Home item; the logo still leads to the role’s starting page. Desktop uses its existing navigation and profile menu, while the drawer remains available below the desktop breakpoint. Companies continue to participate in community under their existing company identity.

Authentication forms use the navbar language control and no longer show the design-only password simulation checkbox. Completed talent signs in to Challenges, companies to My Challenges, and members to Community, unless returning to a requested protected page.

## Session behavior

Only an explicit 401 from the identity endpoint establishes an unauthenticated session. Network failures, 404s, and server failures retain a known identity and display a retry message. When identity is unknown at startup, a connection message replaces the application until the session check succeeds or returns 401, preserving the requested URL. Retrying with a known identity keeps mounted forms and their unsaved data. The backend's seven-day session policy is unchanged.

This addresses the confirmed frontend error-handling weakness; intermittent expiry itself was not reproduced during the preceding live inspection. That inspection confirmed a Secure/HttpOnly seven-day cookie and successful session restoration after reload.

## Verification

- Production frontend build passed. Lint: zero errors, the same four existing warnings. Vite retains its existing bundle-size advisory.
- Local Playwright checks used temporary API fixtures because the local Docker daemon/database was unavailable; no downloads or live deployment changes were made.
- Startup 503 preserved the protected URL; Retry recovered the company dashboard. A focus-time 503 retained identity; explicit 401 redirected to sign-in. A failed network request during reload produced Retry without requesting credentials.
- Unsaved challenge notes survived both failed and successful session retries. Company navigation had exactly one selected item; completed talent signed in to `/problems`, members to `/community`, and desktop profile/application links remained accessible.
- Company signup was preselected from the landing CTA. Sign-in/signup each had one language control; sign-in had no simulation checkbox.
- English/Arabic landing pages and mobile drawer were reviewed. No horizontal overflow at 390, 768, 1024 or 1440 px; hamburger visibility matched the desktop navigation breakpoint. Desktop English and mobile Arabic screenshots were visually inspected.

Implementation and review were performed inline without subagents. These checks do not replace a live backend/session check after deployment.
