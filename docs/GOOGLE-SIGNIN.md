# Google sign-in setup

The implementation uses Google's official server-side OAuth client, authorization codes, state, nonce, PKCE and validated ID tokens. Successful sign-in creates the same PostgreSQL-backed session as password login. No Google tokens or credentials are sent to the React app or saved on the user record. Scopes are only `openid email profile`.

## Your Google Console steps

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview), create/select a project, and choose **Get started** if needed.
2. Set the app name to **Rexios AI**, supply your support/contact email, and choose an **External** audience so personal Google accounts can sign in.
3. Under **Clients**, create an OAuth client with application type **Web application**. This is not a service-account key or a Gemini API key.
4. Add this exact **Authorized redirect URI** for the live app:

   ```text
   https://rexios.duckdns.org/api/auth/google/callback
   ```

5. For local Vite development, also register this redirect URI on your demo client:

   ```text
   http://127.0.0.1:5173/api/auth/google/callback
   ```

   Open the app using `http://127.0.0.1:5173` consistently. If you prefer `localhost`, register `http://localhost:5173/api/auth/google/callback` instead and change both local URL variables below. The packaged Docker demo uses port `8080` instead of `5173`.

6. No Authorized JavaScript origins are required: this implementation redirects through the backend and does not use the browser Google SDK. Do not add Gmail/Drive/Calendar permissions.
7. Copy the **Client ID** and **Client secret** into the private server environment, not the frontend code.

Branding links, if requested:

- Homepage: `https://rexios.duckdns.org/`
- Privacy policy: `https://rexios.duckdns.org/privacy`
- Terms: `https://rexios.duckdns.org/terms`

Google's basic identity scopes have an exception to the usual Testing test-user restriction, so do not assume that Testing makes this a private allowlisted demo. Workspace administrators can still block external OAuth apps. See [Google's audience guidance](https://support.google.com/cloud/answer/15549945?hl=en). App-name/logo branding verification is separate from basic sign-in.

## Local environment

Add to `server/.env` (there are placeholders in `server/.env.example`):

```dotenv
APP_PUBLIC_URL=http://127.0.0.1:5173
GOOGLE_CLIENT_ID=PASTE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=PASTE_CLIENT_SECRET_HERE
GOOGLE_CALLBACK_URL=http://127.0.0.1:5173/api/auth/google/callback
```

Keep `APP_ORIGIN` allowing the same origin.

For convenience, blank Google settings in `server/.env` also fall back to the root `.env`, like the AI settings. Explicit process/server values take precedence. The root packaged-demo URLs use port 8080; keep the server's explicit 5173 URLs when running Vite locally.

From the repository root:

```sh
npm run db:migrate
npm run api:dev
```

Run `npm run dev` in another terminal, then visit `/signup`, choose Talent or Company, and click **Continue with Google**. Password fields are not required for this button. New talent users still complete their technical profile before applying. New companies initially use their Google display name and can update the company details in the challenge form.

## VPS environment (during the next deployment)

Add to `/home/opc/rexiosai/.env.vps`:

```dotenv
GOOGLE_CLIENT_ID=PASTE_LIVE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=PASTE_LIVE_CLIENT_SECRET_HERE
GOOGLE_CALLBACK_URL=https://rexios.duckdns.org/api/auth/google/callback
```

Keep the file mode `0600`, owned by `opc`. Compose already passes the variables only to the API service and sets the public app URL to the live domain. No `VITE_` variables are needed. The OAuth secret must not be committed or pasted into chat.

After the normal Rexios backup/build, run the additive database migration, then recreate the Rexios API and web services so configuration and frontend changes take effect. These instructions do not authorize changing other projects or the shared proxy. Google setup alone does not update the running VPS containers.

## Account behavior and troubleshooting

- Signup honors the selected type. New accounts starting from Sign in default to Talent. Existing accounts retain their role.
- Repeat login uses Google's stable `sub` identifier. A Google-verified Gmail/Workspace email can link to an existing matching account while preserving its password and data. Existing third-party email accounts are not auto-linked; use the original password login.
- Google-created accounts have no user-chosen Rexios password. Continue signing in through Google; password recovery is still deferred.
- Missing configuration shows a localized message and leaves password login available.
- `redirect_uri_mismatch`: the callback URL must match the Console value exactly, including hostname, port and path.
- An expired attempt generally means the browser lost the session cookie, a different hostname was used, or the ten-minute attempt expired. Start again on the same hostname.
- Declining Google consent returns a cancellation message. Provider responses and secrets are not exposed in the URL.
- The real external Google consent journey requires your credentials. Automated integration tests use a mocked Google exchange to verify sessions, account types, callback validation and errors.

References: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).
