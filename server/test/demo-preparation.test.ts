import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { prepareDemo } from '../scripts/prepare-demo';
import { rejection } from '../prisma/demo-content';

test('demo cleanup previews, archives exact targets, preserves decisions and refuses edited content', async () => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith('_test'), 'Use a separate *_test database');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const backupDir = mkdtempSync(join(tmpdir(), 'rexios-demo-'));
  const questionId = '744584a5-a2b7-4cbf-97e6-a3407869513d';
  const userId = `demo-preparation-test-${randomUUID()}`;
  const normalId = randomUUID();
  const p1 = await db.problem.findUniqueOrThrow({ where: { id: 'p1' } });
  const p2 = await db.problem.findUniqueOrThrow({ where: { id: 'p2' } });
  const application = await db.application.findUniqueOrThrow({ where: { id: 'seed-application-p3' } });
  const otherDeadlines = await db.problem.findMany({ where: { id: { in: ['p3', 'p4', 'demo-proposal-comparison'] } }, select: { id: true, deadlineAt: true } });
  const now = new Date();
  const data = { id: questionId, authorUserId: userId, title: 'testing test test test', body: 'test test test lmcfoewaficmEWP,PDC,AEWOGSMEMGwmof', tags: ['IOT'] };
  try {
    assert.equal(await db.communityQuestion.count({ where: { id: questionId } }), 0);
    await db.user.create({ data: { id: userId, email: `${userId}@example.test`, role: 'TALENT', displayName: 'Review test', displayNameEn: 'Review test', passwordHash: 'unused' } });
    await db.communityQuestion.create({ data });
    await db.communityQuestion.create({ data: { id: normalId, authorUserId: userId, title: 'A genuine technical question', body: 'Preserve this contribution.', tags: [] } });
    await db.communityQuestionReaction.create({ data: { targetId: questionId, userId, kind: 'HELPFUL' } });
    await db.communityQuestionView.create({ data: { questionId, viewerKey: 'test-view' } });
    await db.problem.update({ where: { id: 'p1' }, data: { status: 'OPEN', deadlineAt: new Date(now.getTime() - 86400000) } });
    await db.application.update({ where: { id: application.id }, data: {
      status: 'REJECTED',
      rejectionReason: 'نحتاج في هذه المرحلة إلى توثيق أوضح لطريقة فصل بيانات التدريب والاختبار وقياس الإنذارات الكاذبة. يمكن تحسين المقترح بإضافة خطة تقييم قابلة للتكرار.',
      rejectionReasonEn: 'At this stage we need a clearer plan for separating training and test data and measuring false alarms. The proposal would benefit from a reproducible evaluation plan.',
    } });
    const preview = await prepareDemo(db, { now });
    assert.equal(preview.mode, 'preview'); assert.equal(preview.testPost, questionId);
    assert.ok(preview.deadlines.includes('p1'));
    assert.equal(await db.communityQuestion.count({ where: { id: questionId } }), 1);
    await assert.rejects(prepareDemo(db, { apply: true, now }), /backup-dir/);
    const applied = await prepareDemo(db, { apply: true, backupDir, now });
    assert.ok(applied.backup);
    const archived = JSON.parse(readFileSync(applied.backup, 'utf8'));
    assert.equal(archived.question.id, questionId);
    assert.equal(archived.question.reactions.length, 1);
    assert.equal(archived.question.views.length, 1);
    assert.equal(archived.application.id, application.id);
    const corrected = await db.application.findUniqueOrThrow({ where: { id: application.id } });
    assert.equal(corrected.rejectionReasonEn, rejection.en);
    assert.equal(corrected.status, 'REJECTED');
    assert.equal(await db.communityQuestion.count({ where: { id: questionId } }), 0);
    assert.equal(await db.communityQuestion.count({ where: { id: normalId } }), 1);
    assert.equal(await db.user.count({ where: { id: userId } }), 1);
    assert.equal((await db.problem.findUniqueOrThrow({ where: { id: 'p1' } })).deadlineAt!.getTime(), now.getTime() + 30 * 86400000);
    const closed = await db.problem.findUniqueOrThrow({ where: { id: 'p2' } });
    assert.equal(closed.status, p2.status); assert.equal(closed.acceptedApplicationId, p2.acceptedApplicationId);
    assert.equal(closed.deadlineAt?.getTime(), p2.deadlineAt?.getTime());
    const repeated = await prepareDemo(db, { apply: true, backupDir, now });
    assert.equal(repeated.backup, null); assert.equal(repeated.deadlines.length, 0);
    await db.application.update({ where: { id: application.id }, data: { rejectionReasonEn: 'Custom company feedback.' } });
    await prepareDemo(db, { apply: true, backupDir, now });
    assert.equal((await db.application.findUniqueOrThrow({ where: { id: application.id } })).rejectionReasonEn, 'Custom company feedback.');
    await db.communityQuestion.create({ data: { ...data, titleEn: 'A real edited question' } });
    await assert.rejects(prepareDemo(db, { apply: true, backupDir, now }), /has changed/);
    assert.equal(await db.communityQuestion.count({ where: { id: questionId } }), 1);
  } finally {
    await db.communityQuestionReaction.deleteMany({ where: { targetId: questionId, userId } });
    await db.communityQuestionView.deleteMany({ where: { questionId, viewerKey: 'test-view' } });
    await db.communityQuestion.deleteMany({ where: { id: { in: [questionId, normalId] }, authorUserId: userId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.problem.update({ where: { id: 'p1' }, data: { deadlineAt: p1.deadlineAt, status: p1.status } });
    for (const p of otherDeadlines) await db.problem.update({ where: { id: p.id }, data: { deadlineAt: p.deadlineAt } });
    await db.application.update({ where: { id: application.id }, data: { status: application.status, rejectionReason: application.rejectionReason, rejectionReasonEn: application.rejectionReasonEn } });
    await db.$disconnect();
    assert.ok(backupDir.startsWith(join(tmpdir(), 'rexios-demo-')));
    rmSync(backupDir, { recursive: true });
  }
});
