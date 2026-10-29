import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

test('support and reports persist privately with real content targets', async t => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith('_test'));
  process.env.DATABASE_URL = url;
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  const { bootstrap } = require('../dist/main');
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const { app, pool } = await bootstrap(0);
  const base = await app.getUrl();
  const origin = (process.env.APP_ORIGIN || 'http://localhost:5173').split(',')[0];
  const client = () => {
    let cookie = '';
    return async (path: string, method = 'GET', body?: unknown) => {
      const response = await fetch(`${base}/api${path}`, {
        method, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie')!.split(';')[0];
      return { status: response.status, data: await response.json() };
    };
  };
  const guest = client(), author = client(), reporter = client();
  const marker = randomUUID();
  const support = { name: ' Demo reader ', email: `support-${marker}@demo.test`, topic: 'PRIVACY', message: ' Please explain how I can request deletion of my account. ', language: 'en' };
  let reporterId = '', questionId = '', answerId = '', problemId = '', draftId = '';
  try {
    await t.test('public support stores trimmed text and returns a reference only', async () => {
      const sent = await guest('/support/requests', 'POST', support);
      assert.equal(sent.status, 201, JSON.stringify(sent.data));
      assert.deepEqual(Object.keys(sent.data), ['reference']);
      assert.equal(typeof sent.data.reference, 'string');
      const stored = await db.supportRequest.findUniqueOrThrow({ where: { id: sent.data.reference } });
      assert.equal(stored.name, support.name.trim());
      assert.equal(stored.message, support.message.trim());
      assert.equal(stored.language, 'en');
      assert.equal((await guest('/support/requests')).status, 404);
    });
    await t.test('invalid or forged form fields are rejected', async () => {
      for (const patch of [{ message: '   ' }, { email: 'not-email' }, { name: ' '.repeat(3) }, { message: 'x'.repeat(8001) }, { topic: 'UNKNOWN' }, { language: 'fr' }, { status: 'RESOLVED' }]) {
        assert.equal((await guest('/support/requests', 'POST', { ...support, ...patch })).status, 400);
      }
      assert.equal((await guest('/reports', 'POST', { targetType: 'QUESTION', targetId: 'missing', reason: 'SPAM', language: 'en' })).status, 401);
    });
    await t.test('reports use authenticated identity and reject missing or hidden targets', async () => {
      const owner = await author('/auth/register', 'POST', { name: 'Support test company', email: `support-owner-${marker}@demo.test`, password: 'Support123!', accountType: 'COMPANY' });
      assert.equal(owner.status, 201); const ownerId = owner.data.id;
      const registered = await reporter('/auth/register', 'POST', { name: 'Support test reporter', email: `reporter-${marker}@demo.test`, password: 'Support123!', accountType: 'TALENT' });
      assert.equal(registered.status, 201); reporterId = registered.data.id;
      const question = await author('/community/questions', 'POST', { language: 'en', title: `Reporting test question ${marker}`, body: 'Can this challenge be solved offline?', tags: ['PYTHON'] });
      assert.equal(question.status, 201); questionId = question.data.id;
      const answer = await author(`/community/questions/${questionId}/answers`, 'POST', { language: 'en', body: 'A minimal offline implementation is possible.' });
      assert.equal(answer.status, 201); answerId = answer.data.id;
      const data = { companyUserId: ownerId, title: 'Reportable challenge', titleEn: 'Reportable challenge', summary: 'Test', description: 'Test', deliverables: ['Test'], constraints: ['Test'], criteria: ['Test'], skills: ['PYTHON'], difficulty: 'small', category: 'CHALLENGE', budgetDzd: 1000, deadlineAt: new Date(Date.now() + 86400000) };
      problemId = (await db.problem.create({ data: { ...data, status: 'OPEN' } })).id;
      draftId = (await db.problem.create({ data: { ...data, status: 'DRAFT' } })).id;
      for (const targetId of ['missing', draftId]) {
        assert.equal((await reporter('/reports', 'POST', { targetType: 'PROBLEM', targetId, reason: 'SPAM', language: 'en' })).status, 404);
      }
      assert.equal((await reporter('/reports', 'POST', { targetType: 'QUESTION', targetId: questionId, reason: 'SPAM', language: 'en', reporterUserId: ownerId })).status, 400);
      assert.equal((await reporter('/reports', 'POST', { targetType: 'QUESTION', targetId: questionId, reason: 'OTHER', language: 'ar', details: '   ' })).status, 400);
      assert.equal((await reporter('/reports', 'POST', { targetType: 'QUESTION', targetId: questionId, reason: 'UNKNOWN', language: 'en' })).status, 400);
    });
    await t.test('all supported content types persist with canonical paths and deduplicate', async () => {
      for (const [targetType, targetId, targetPath] of [['PROBLEM', problemId, `/problems/${problemId}`], ['QUESTION', questionId, `/community/${questionId}`], ['ANSWER', answerId, `/community/${questionId}#answer-${answerId}`]]) {
        const input = { targetType, targetId, reason: 'CONFIDENTIAL', details: ' Company data may be exposed. ', language: 'en' };
        const sent = await reporter('/reports', 'POST', input);
        assert.equal(sent.status, 201, JSON.stringify(sent.data));
        assert.deepEqual(Object.keys(sent.data), ['reference']);
        const duplicate = await reporter('/reports', 'POST', input);
        assert.deepEqual(duplicate.data, sent.data);
        const stored = await db.contentReport.findUniqueOrThrow({ where: { id: sent.data.reference } });
        assert.equal(stored.reporterUserId, reporterId);
        assert.equal(stored.targetPath, targetPath);
        assert.equal(stored.details, input.details.trim());
        assert.equal(stored.status, 'OPEN');
        assert.equal(await db.contentReport.count({ where: { reporterUserId: reporterId, targetType, targetId } }), 1);
      }
      assert.equal((await reporter('/reports')).status, 404);
      assert.equal((await guest(`/reports/${questionId}`)).status, 404);
      assert.equal((await guest(`/community/questions/${questionId}`)).status, 200);
    });
  } finally {
    await app.close(); await pool.end(); await db.$disconnect();
  }
});
