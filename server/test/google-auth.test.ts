import 'dotenv/config';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';

test('Google OAuth handles real sessions, account types, identity validation and safe failures', async t => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith('_test'), 'Use a separate *_test database');
  const names = ['DATABASE_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL', 'APP_PUBLIC_URL'];
  const previous = names.map(name => process.env[name]);
  process.env.DATABASE_URL = url;
  process.env.APP_PUBLIC_URL = 'http://127.0.0.1:5173';
  process.env.GOOGLE_CALLBACK_URL = 'http://127.0.0.1:5173/api/auth/google/callback';
  delete process.env.GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET;
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  const { bootstrap } = require('../dist/main');
  const { app, pool } = await bootstrap(0);
  const db = app.get(require('../dist/database/prisma.service').PrismaService);
  const service = app.get(require('../dist/auth/google-auth.service').GoogleAuthService);
  const { safeReturnTo } = require('../dist/auth/google-auth.service');
  const base = await app.getUrl();
  const prefix = `rexios-google-${randomUUID()}`;
  const origin = (process.env.APP_ORIGIN || 'http://localhost:5173').split(',')[0];
  const clients: ReturnType<typeof client>[] = [];
  function client() {
    let cookie = '';
    const call = async (path: string, method = 'GET', body?: unknown) => {
      const response = await fetch(`${base}/api${path}`, { method, redirect: 'manual', headers: {
        Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}),
      }, body: body ? JSON.stringify(body) : undefined });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      return response;
    };
    return call;
  }
  const createClient = () => { const value = client(); clients.push(value); return value; };
  let profile: any;
  let verifier = '';
  const tokenMock = mock.method(OAuth2Client.prototype, 'getToken', async (options: any) => {
    verifier = options.codeVerifier;
    assert.equal(options.redirect_uri, process.env.GOOGLE_CALLBACK_URL);
    return { tokens: { id_token: 'test-identity-token' } };
  });
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async (options: any) => {
    assert.equal(options.audience, 'test-client.apps.googleusercontent.com');
    assert.equal(options.idToken, 'test-identity-token');
    if (!profile) throw new Error('Private upstream diagnostics');
    return { getPayload: () => profile } as any;
  });
  const begin = async (call: ReturnType<typeof client>, query = '') => {
    const response = await call(`/auth/google${query}`);
    assert.equal(response.status, 302);
    const auth = new URL(response.headers.get('location')!);
    assert.equal(auth.origin, 'https://accounts.google.com');
    assert.equal(auth.searchParams.get('scope'), 'openid email profile');
    assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(!auth.href.includes('test-secret'));
    return auth;
  };
  const identity = (auth: URL, suffix: string) => ({
    sub: `${prefix}-${suffix}`, email: `${prefix}-${suffix}@gmail.com`, email_verified: true,
    name: 'Google Demo', given_name: 'Google', family_name: 'Demo', nonce: auth.searchParams.get('nonce'),
  });
  const callback = (call: ReturnType<typeof client>, auth: URL) => call(`/auth/google/callback?code=test-code&state=${auth.searchParams.get('state')}`);
  try {
    await t.test('missing credentials provide a usable fallback', async () => {
      const response = await createClient()('/auth/google?intent=signup&accountType=COMPANY');
      assert.equal(response.headers.get('location'), 'http://127.0.0.1:5173/signup?google=not_configured&account=company');
    });
    process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    await t.test('new talent gets a regenerated session; Google IDs are not exposed', async () => {
      const call = createClient(), auth = await begin(call, '?returnTo=//evil.example');
      profile = identity(auth, 'talent');
      const response = await callback(call, auth);
      assert.equal(response.headers.get('location'), 'http://127.0.0.1:5173/welcome');
      assert.ok(response.headers.get('set-cookie')?.includes('HttpOnly'));
      assert.equal(createHash('sha256').update(verifier).digest('base64url'), auth.searchParams.get('code_challenge'));
      const me = await (await call('/auth/me')).json();
      assert.equal(me.accountType, 'TALENT'); assert.equal(me.role, 'member');
      assert.equal('googleSubject' in me, false); assert.equal('passwordHash' in me, false);
      assert.equal((await callback(call, auth)).headers.get('location'), 'http://127.0.0.1:5173/signin?google=expired');
    });
    await t.test('company signup creates a company profile and returns to its dashboard', async () => {
      const call = createClient(), auth = await begin(call, '?intent=signup&accountType=COMPANY');
      profile = identity(auth, 'company');
      assert.equal((await callback(call, auth)).headers.get('location'), 'http://127.0.0.1:5173/company/problems');
      assert.equal((await (await call('/auth/me')).json()).companyProfile.name, 'Google Demo');
    });
    await t.test('existing verified Gmail keeps its role and password login', async () => {
      const register = createClient();
      const email = `${prefix}-existing@gmail.com`;
      const response = await register('/auth/register', 'POST', { name: 'Existing Company', email, password: 'Example123!', accountType: 'COMPANY' });
      assert.equal(response.status, 201);
      const old = await response.json();
      const call = createClient(), auth = await begin(call, '?intent=signup&accountType=TALENT&returnTo=/company/problems');
      profile = { ...identity(auth, 'existing'), email };
      assert.equal((await callback(call, auth)).headers.get('location'), 'http://127.0.0.1:5173/company/problems');
      const me = await (await call('/auth/me')).json();
      assert.equal(me.id, old.id); assert.equal(me.accountType, 'COMPANY');
      assert.equal((await createClient()('/auth/login', 'POST', { email, password: 'Example123!' })).status, 200);
      const nextCall = createClient(), again = await begin(nextCall);
      const subject = profile.sub;
      profile = { ...identity(again, 'changed-email'), sub: subject };
      await callback(nextCall, again);
      const returning = await (await nextCall('/auth/me')).json();
      assert.equal(returning.id, old.id); assert.equal(returning.accountType, 'COMPANY');
    });
    await t.test('cancellation and wrong state never exchange a code', async () => {
      const call = createClient(), auth = await begin(call);
      const before = tokenMock.mock.callCount();
      const cancelled = await call(`/auth/google/callback?error=access_denied&state=${auth.searchParams.get('state')}`);
      assert.equal(cancelled.headers.get('location'), 'http://127.0.0.1:5173/signin?google=cancelled');
      await begin(call);
      const wrong = await call('/auth/google/callback?code=test&state=wrong');
      assert.equal(wrong.headers.get('location'), 'http://127.0.0.1:5173/signin?google=expired');
      assert.equal(tokenMock.mock.callCount(), before);
    });
    await t.test('unverified email and wrong nonce cannot create an account', async () => {
      for (const invalid of [{ email_verified: false }, { nonce: 'wrong' }]) {
        const call = createClient(), auth = await begin(call);
        profile = { ...identity(auth, 'invalid'), ...invalid };
        assert.equal((await callback(call, auth)).headers.get('location'), 'http://127.0.0.1:5173/signin?google=failed');
        assert.equal((await call('/auth/me')).status, 401);
      }
      assert.equal(await db.user.count({ where: { email: `${prefix}-invalid@gmail.com` } }), 0);
    });
    await t.test('existing third-party email requires the original login', async () => {
      const email = `${prefix}-external@example.test`;
      await createClient()('/auth/register', 'POST', { name: 'External email', email, password: 'Example123!', accountType: 'TALENT' });
      const call = createClient(), auth = await begin(call);
      profile = { ...identity(auth, 'external'), email };
      assert.equal((await callback(call, auth)).headers.get('location'), 'http://127.0.0.1:5173/signin?google=email_exists');
      assert.equal((await db.user.findUnique({ where: { email } })).googleSubject, null);
    });
    await t.test('return targets are internal and state/nonce are distinct', async () => {
      for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', '/api/auth/logout', '/problems\nLocation:evil']) assert.equal(safeReturnTo(path), '');
      assert.equal(safeReturnTo('/problems/p1?tab=details'), '/problems/p1?tab=details');
      const beginResult = service.begin({ intent: 'signin', accountType: 'TALENT', returnTo: '' });
      assert.notEqual(beginResult.attempt.state, beginResult.attempt.nonce);
    });
    await t.test('provider failures return a generic message without leaking diagnostics', async () => {
      const call = createClient(), auth = await begin(call);
      profile = null;
      const response = await callback(call, auth);
      assert.equal(response.headers.get('location'), 'http://127.0.0.1:5173/signin?google=failed');
      assert.equal((await call('/auth/me')).status, 401);
    });
  } finally {
    for (const call of clients) await call('/auth/logout', 'POST').catch(() => undefined);
    const users = await db.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
    const ids = users.map((user: any) => user.id);
    await db.talentProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.companyProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    mock.restoreAll();
    await app.close(); await pool.end();
    names.forEach((name, index) => previous[index] === undefined ? delete process.env[name] : process.env[name] = previous[index]);
  }
});
