import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { rejection } from '../prisma/demo-content';

const testPostId = '744584a5-a2b7-4cbf-97e6-a3407869513d';
const testTitle = 'testing test test test';
const testBody = 'test test test lmcfoewaficmEWP,PDC,AEWOGSMEMGwmof';
const oldRejection = {
  ar: 'نحتاج في هذه المرحلة إلى توثيق أوضح لطريقة فصل بيانات التدريب والاختبار وقياس الإنذارات الكاذبة. يمكن تحسين المقترح بإضافة خطة تقييم قابلة للتكرار.',
  en: 'At this stage we need a clearer plan for separating training and test data and measuring false alarms. The proposal would benefit from a reproducible evaluation plan.',
};
const fixtures = [
  { id: 'p1', companyUserId: 'demo-company-1' },
  { id: 'p3', companyUserId: 'demo-company-3' },
  { id: 'p4', companyUserId: 'demo-company-4' },
  { id: 'demo-proposal-comparison', companyUserId: 'demo-company-1' },
];

async function inspect(tx: Prisma.TransactionClient, now: Date) {
  const question = await tx.communityQuestion.findUnique({
    where: { id: testPostId }, include: { reactions: true, views: true, answers: true },
  });
  // An edited post or a post with genuine replies needs manual review.
  if (question && (question.answers.length ||
    ![question.title, question.titleEn].includes(testTitle) ||
    [question.title, question.titleEn].some(value => value && value !== testTitle) ||
    ![question.body, question.bodyEn].includes(testBody) ||
    [question.body, question.bodyEn].some(value => value && value !== testBody))) {
    throw new Error('The reviewed test post has changed. No demo cleanup was applied.');
  }
  const notifications = question ? await tx.notification.findMany({ where: { questionId: testPostId } }) : [];
  const deadlines = await tx.problem.findMany({ where: {
    OR: fixtures, status: 'OPEN', acceptedApplicationId: null,
    deadlineAt: { lt: new Date(now.getTime() + 14 * 86400000) },
  }, select: { id: true, companyUserId: true, titleEn: true, deadlineAt: true } });
  const application = await tx.application.findFirst({ where: {
    id: 'seed-application-p3', problemId: 'p3', applicantUserId: 'demo-solver', status: 'REJECTED',
    rejectionReason: oldRejection.ar, rejectionReasonEn: oldRejection.en,
  }, select: { id: true, rejectionReason: true, rejectionReasonEn: true } });
  return { question, notifications, deadlines, application };
}

export async function prepareDemo(db: PrismaClient, options: { apply?: boolean; backupDir?: string; now?: Date } = {}) {
  const now = options.now || new Date();
  if (options.apply && !options.backupDir) throw new Error('Applying cleanup requires --backup-dir pointing to a private backup directory.');
  return db.$transaction(async tx => {
    // Serialize maintenance and lock only the reviewed post and designated fixtures.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rexios-demo-preparation'))`;
    await tx.$queryRaw`SELECT id FROM "CommunityQuestion" WHERE id = ${testPostId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Problem" WHERE id IN ('p1', 'p3', 'p4', 'demo-proposal-comparison') FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Application" WHERE id = 'seed-application-p3' FOR UPDATE`;
    const before = await inspect(tx, now);
    const summary = {
      mode: options.apply ? 'applied' : 'preview',
      testPost: before.question?.id ?? null,
      deadlines: before.deadlines.map(p => p.id),
      rejection: before.application?.id ?? null,
      backup: null as string | null,
    };
    if (!options.apply || (!before.question && !before.deadlines.length && !before.application)) return summary;
    const directory = resolve(options.backupDir!);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const backup = join(directory, `demo-before-${now.toISOString().replace(/[:.]/g, '-')}.json`);
    // Write before any change. Failure to create the backup aborts the transaction.
    writeFileSync(backup, JSON.stringify({ version: 1, capturedAt: now, ...before }, null, 2), { flag: 'wx', mode: 0o600 });
    if (before.question) {
      await tx.notification.deleteMany({ where: { questionId: testPostId } });
      await tx.communityQuestionView.deleteMany({ where: { questionId: testPostId } });
      await tx.communityQuestionReaction.deleteMany({ where: { targetId: testPostId } });
      await tx.communityQuestion.delete({ where: { id: testPostId } });
    }
    if (before.deadlines.length) await tx.problem.updateMany({
      where: { id: { in: before.deadlines.map(p => p.id) } },
      data: { deadlineAt: new Date(now.getTime() + 30 * 86400000) },
    });
    if (before.application) await tx.application.update({ where: { id: before.application.id }, data: {
      rejectionReason: rejection.ar, rejectionReasonEn: rejection.en,
    } });
    summary.backup = backup;
    return summary;
  }, { timeout: 20000 });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const backupAt = args.indexOf('--backup-dir');
  if (backupAt >= 0 && (!args[backupAt + 1] || args[backupAt + 1].startsWith('--'))) throw new Error('--backup-dir requires a directory path.');
  if (args.some(arg => !['--apply', '--backup-dir', ...(backupAt >= 0 ? [args[backupAt + 1]] : [])].includes(arg))) {
    throw new Error('Usage: npm run db:demo:prepare -- [--apply --backup-dir PRIVATE_DIRECTORY]');
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  prepareDemo(db, { apply: args.includes('--apply'), backupDir: backupAt >= 0 ? args[backupAt + 1] : undefined })
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error instanceof Error ? error.message : 'Demo preparation failed.'); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
