import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Account, PrismaService } from '../database/prisma.service';
import { requireRole } from '../common/http';
import { comparisonFingerprint, comparisonSchema, type ComparisonContext } from './proposal-comparison.schema';
import { compareProposals, type ComparisonProgress } from './proposal-comparison.graph';
import { createFeatherlessModel, DEFAULT_FEATHERLESS_MODEL } from './featherless.client';

type Reader = Pick<PrismaService, 'problem' | 'application'>;
@Injectable()
export class ProposalComparisonService {
  constructor(private readonly db: PrismaService) {}

  async snapshot(user: Account, id: string, db: Reader = this.db) {
    requireRole(user, 'COMPANY');
    const problem = await db.problem.findFirst({ where: { id, companyUserId: user.id } });
    if (!problem) throw new NotFoundException('Challenge not found.');
    const applications = await db.application.findMany({ where: { problemId: id, status: 'UNDER_REVIEW' }, orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      select: { id: true, coverMessage: true, coverMessageEn: true, deliveryDays: true, applicant: { select: { displayName: true, displayNameEn: true, talent: { select: { skills: true } } } } } });
    const context: ComparisonContext = {
      challenge: { title: problem.title, titleEn: problem.titleEn, summary: problem.summary, summaryEn: problem.summaryEn, description: problem.description, descriptionEn: problem.descriptionEn,
        deliverables: problem.deliverables, deliverablesEn: problem.deliverablesEn, constraints: problem.constraints, constraintsEn: problem.constraintsEn, criteria: problem.criteria, criteriaEn: problem.criteriaEn,
        skills: [...problem.skills].sort(), budgetDzd: problem.budgetDzd, deadlineAt: problem.deadlineAt?.toISOString() || null, status: problem.status },
      proposals: applications.map(a => ({ applicationId: a.id, text: a.coverMessage, textEn: a.coverMessageEn, deliveryDays: a.deliveryDays, skills: [...(a.applicant.talent?.skills || [])].sort() })),
    };
    return { context, fingerprint: comparisonFingerprint(context), candidates: applications.map(a => ({ id: a.id, name: a.applicant.displayName, nameEn: a.applicant.displayNameEn || a.applicant.displayName })) };
  }

  async get(user: Account, id: string) {
    const snapshot = await this.snapshot(user, id);
    const saved = await this.db.proposalComparison.findUnique({ where: { problemId: id } });
    const parsed = comparisonSchema.safeParse(saved?.result);
    return { pendingCount: snapshot.context.proposals.length, canCompare: snapshot.context.challenge.status === 'OPEN' && snapshot.context.proposals.length >= 2,
      stale: !!saved && (saved.fingerprint !== snapshot.fingerprint || !parsed.success),
      comparison: saved && parsed.success ? { result: parsed.data, generatedAt: saved.generatedAt.toISOString(), model: saved.model } : null,
      candidates: snapshot.candidates };
  }

  async generate(user: Account, id: string, lang: 'ar' | 'en', options: { signal: AbortSignal; progress: (event: ComparisonProgress | { type: 'snapshot'; candidates: { id: string; name: string; nameEn: string }[] }) => void }) {
    const snapshot = await this.snapshot(user, id);
    if (snapshot.context.challenge.status !== 'OPEN' || snapshot.context.proposals.length < 2) throw new ConflictException(lang === 'ar' ? 'يلزم تحدٍّ مفتوح ومقترحان قيد المراجعة على الأقل.' : 'An open challenge and at least two pending proposals are needed.');
    options.progress({ type: 'snapshot', candidates: snapshot.candidates });
    const repairs = Number(process.env.AI_MAX_REPAIR_ATTEMPTS ?? 2);
    const result = await compareProposals(snapshot.context, lang, createFeatherlessModel(), {
      signal: options.signal, maxRepairs: Number.isSafeInteger(repairs) && repairs >= 0 ? repairs : 2, progress: options.progress,
    });
    options.signal.throwIfAborted();
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Problem" WHERE id = ${id} FOR UPDATE`;
      const current = await this.snapshot(user, id, tx);
      options.signal.throwIfAborted();
      if (current.fingerprint !== snapshot.fingerprint) throw new ConflictException(lang === 'ar' ? 'تغيرت المقترحات أو المتطلبات أثناء المقارنة. أعد المحاولة.' : 'Proposals or requirements changed during comparison. Please refresh and retry.');
      const data = { fingerprint: snapshot.fingerprint, result: result as unknown as Prisma.InputJsonValue, model: process.env.FEATHERLESS_MODEL || DEFAULT_FEATHERLESS_MODEL, generatedAt: new Date() };
      await tx.proposalComparison.upsert({ where: { problemId: id }, create: { problemId: id, ...data }, update: data });
    });
    return this.get(user, id);
  }

  async priorityIds(user: Account, id: string) {
    const saved = await this.get(user, id);
    if (saved.stale || !saved.comparison || !saved.canCompare) throw new ConflictException('Refresh the AI comparison before using priority order.');
    return saved.comparison.result.entries.map(entry => entry.applicationId);
  }
}
