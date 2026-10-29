import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

test('proposal comparison HTTP workflow preserves ownership, persistence, pagination and manual decisions', async t => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  assert.ok(databaseUrl && new URL(databaseUrl).pathname.endsWith('_test'));
  const names = ['DATABASE_URL', 'FEATHERLESS_API_KEY', 'FEATHERLESS_BASE_URL', 'FEATHERLESS_MODEL', 'AI_MAX_REPAIR_ATTEMPTS', 'AI_REQUEST_TIMEOUT_MS'];
  const previous = names.map(name => process.env[name]);
  let db: any; let app: any; let pool: any;
  let mode: 'valid' | 'invalid' | 'error' | 'changed' = 'valid';
  let calls = 0;
  const evidence = { ar: 'يعالج المتطلبات المذكورة.', en: 'Addresses the stated requirements.' };
  const inference = createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); calls++;
    const input = JSON.parse(body.messages.at(-1).content).input;
    assert.equal(JSON.stringify(input).includes('Private company secret'), false);
    assert.equal(JSON.stringify(input).includes('Applicant confidential identity'), false);
    if (mode === 'error') { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'Do not expose upstream details' } })); return; }
    if (mode === 'changed') await db.problem.update({ where: { id: input.challenge.__id || currentProblem }, data: { descriptionEn: 'Changed during inference' } });
    const result = { summary: evidence, entries: [...input.proposals].reverse().map((p: any, index: number) => ({ applicationId: mode === 'invalid' ? 'unknown' : p.applicationId, reason: evidence, strengths: [evidence], gaps: [], question: evidence, fit: index === 0 ? 'strong' : 'partial' })) };
    const output = JSON.stringify(result);
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    for (let offset = 0; offset < output.length; offset += 41) res.write(`data: ${JSON.stringify({ id: 'test', choices: [{ index: 0, delta: { content: output.slice(offset, offset + 41) }, finish_reason: null }] })}\n\n`);
    res.end('data: [DONE]\n\n');
  });
  let currentProblem = '';
  try {
    process.env.DATABASE_URL = databaseUrl;
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
    inference.listen(0, '127.0.0.1'); await once(inference, 'listening');
    process.env.FEATHERLESS_API_KEY = 'test-key';
    process.env.FEATHERLESS_BASE_URL = `http://127.0.0.1:${(inference.address() as any).port}/v1`;
    process.env.FEATHERLESS_MODEL = 'test/model'; process.env.AI_MAX_REPAIR_ATTEMPTS = '1'; process.env.AI_REQUEST_TIMEOUT_MS = '10000';
    const { bootstrap } = require('../dist/main');
    ({ app, pool } = await bootstrap(0));
    db = app.get(require('../dist/database/prisma.service').PrismaService);
    const base = await app.getUrl();
    const origin = (process.env.APP_ORIGIN || 'http://localhost:5173').split(',')[0];
    const client = () => { let cookie = ''; return async (path: string, method = 'GET', data?: unknown) => {
      const response = await fetch(`${base}/api${path}`, { method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      const setCookie = response.headers.get('set-cookie'); if (setCookie) cookie = setCookie.split(';')[0];
      const payload = response.headers.get('content-type')?.includes('text/event-stream') ? (await response.text()).split('\n').filter(l => l.startsWith('data: ')).map(l => JSON.parse(l.slice(6))) : await response.json();
      return { status: response.status, data: payload };
    }; };
    const owner = client(), other = client(), talent = client(), guest = client();
    const suffix = randomUUID();
    const account = (accountType: string, label: string) => ({ name: label, email: `${label}-${suffix}@example.test`, password: 'TestPassword123', accountType });
    const registered = await owner('/auth/register', 'POST', account('COMPANY', 'owner'));
    await other('/auth/register', 'POST', account('COMPANY', 'other'));
    await talent('/auth/register', 'POST', account('TALENT', 'talent'));
    const problem = await db.problem.create({ data: { companyUserId: registered.data.id, title: 'اختبار', titleEn: 'Compare test', descriptionEn: 'Need offline CSV export', skills: ['PYTHON'], constraints: ['دون اتصال'], constraintsEn: ['Offline'], criteria: [], criteriaEn: [], deliverables: [], deliverablesEn: [], status: 'OPEN', deadlineAt: new Date(Date.now() + 86400000), privateDetails: { create: { notes: 'Private company secret' } } } });
    currentProblem = problem.id;
    const ids: string[] = [];
    for (let i = 0; i < 23; i++) {
      const user = await db.user.create({ data: { email: `candidate-${i}-${suffix}@example.test`, displayName: 'Applicant confidential identity', displayNameEn: 'Applicant confidential identity', passwordHash: 'not-used', role: 'TALENT', talent: { create: { skills: ['PYTHON'] } } } });
      const a = await db.application.create({ data: { problemId: problem.id, applicantUserId: user.id, coverMessage: 'I propose local storage and offline CSV export with required-field validation.', deliveryDays: 10, status: 'UNDER_REVIEW', submittedAt: new Date(1700000000000 + i * 1000) } }); ids.push(a.id);
    }
    const path = `/company/problems/${problem.id}/proposal-comparison`;
    await t.test('only the owning company can read or compare, and all pending proposals are loaded', async () => {
      assert.equal((await guest(path)).status, 401); assert.equal((await talent(path)).status, 403); assert.equal((await other(path)).status, 404);
      assert.equal((await other(`${path}/stream`, 'POST', { lang: 'en' })).status, 404);
      assert.equal(calls, 0); const initial = await owner(path); assert.equal(initial.data.pendingCount, 23); assert.equal(initial.data.comparison, null);
    });
    await t.test('streams, saves and sorts before pagination; reload retrieves the result without inference', async () => {
      const run = await owner(`${path}/stream`, 'POST', { lang: 'en' });
      assert.equal(run.status, 200); assert.ok(run.data.some((e: any) => e.type === 'preview'));
      const final = run.data.at(-1); assert.equal(final.type, 'complete'); assert.equal(final.result.comparison.result.entries.length, 23);
      assert.equal(calls, 1);
      const page = await owner(`/company/problems/${problem.id}/applications?order=ai&page=2&limit=20`);
      assert.equal(page.status, 200); assert.equal(page.data.total, 23); assert.deepEqual(page.data.items.map((i: any) => i.id), [...ids].reverse().slice(20));
      assert.equal((await owner(path)).data.stale, false); assert.equal(calls, 1);
      assert.equal(await db.application.count({ where: { problemId: problem.id, status: 'UNDER_REVIEW' } }), 23);
    });
    await t.test('provider failure and failed repairs preserve the last saved result', async () => {
      const saved = await db.proposalComparison.findUnique({ where: { problemId: problem.id } });
      mode = 'error'; const failure = await owner(`${path}/stream`, 'POST', { lang: 'ar' });
      assert.equal(failure.data.at(-1).status, 503); assert.equal(JSON.stringify(failure.data).includes('upstream details'), false);
      mode = 'invalid'; const invalid = await owner(`${path}/stream`, 'POST', { lang: 'en' }); assert.equal(invalid.data.at(-1).status, 422);
      assert.equal((await db.proposalComparison.findUnique({ where: { problemId: problem.id } })).generatedAt.toISOString(), saved.generatedAt.toISOString());
    });
    await t.test('changed inputs during generation refuse a save and priority ordering', async () => {
      mode = 'changed'; const changed = await owner(`${path}/stream`, 'POST', { lang: 'en' });
      assert.equal(changed.data.at(-1).status, 409); assert.equal((await owner(path)).data.stale, true);
      assert.equal((await owner(`/company/problems/${problem.id}/applications?order=ai`)).status, 409);
    });
    await t.test('manual decisions invalidate comparison and decided/draft entries are excluded', async () => {
      mode = 'valid'; await owner(`${path}/stream`, 'POST', { lang: 'en' });
      assert.equal((await owner(`/applications/${ids[0]}/decision`, 'POST', { decision: 'REJECTED' })).status, 201);
      const latest = await owner(path); assert.equal(latest.data.pendingCount, 22); assert.equal(latest.data.stale, true);
      await db.application.update({ where: { id: ids[1] }, data: { status: 'DRAFT' } });
      const regen = await owner(`${path}/stream`, 'POST', { lang: 'ar' }); assert.equal(regen.data.at(-1).result.comparison.result.entries.length, 21);
      await db.problem.update({ where: { id: problem.id }, data: { status: 'CLOSED' } });
      assert.equal((await owner(path)).data.canCompare, false);
      const closed = await owner(`${path}/stream`, 'POST', { lang: 'en' }); assert.equal(closed.data.at(-1).status, 409);
    });
    await t.test('dedicated demo seed preserves edited text and decisions on repeat runs', async () => {
      const { seedProposalDemo, proposalDemoId } = await import('../scripts/seed-proposal-demo');
      if (!await db.user.findUnique({ where: { email: 'c@demo.test' } })) await db.user.create({ data: { email: 'c@demo.test', displayName: 'Demo company', displayNameEn: 'Demo company', passwordHash: 'unused', role: 'COMPANY' } });
      await seedProposalDemo(db);
      const original = await db.application.findUniqueOrThrow({ where: { id: 'demo-comparison-application-1' } });
      try {
        await db.application.update({ where: { id: original.id }, data: { coverMessage: 'Edited by owner of test fixture', status: 'REJECTED' } });
        await seedProposalDemo(db);
        const after = await db.application.findUniqueOrThrow({ where: { id: original.id } });
        assert.equal(after.coverMessage, 'Edited by owner of test fixture'); assert.equal(after.status, 'REJECTED');
        assert.equal(await db.application.count({ where: { problemId: proposalDemoId } }), 4);
      } finally { await db.application.update({ where: { id: original.id }, data: { coverMessage: original.coverMessage, status: original.status } }); }
    });
  } finally {
    if (app) await app.close(); if (pool) await pool.end();
    await new Promise<void>(resolve => inference.close(() => resolve()));
    for (const [i, name] of names.entries()) if (previous[i] === undefined) delete process.env[name]; else process.env[name] = previous[i];
  }
});
