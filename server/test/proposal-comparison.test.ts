import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JsonTextPreview } from '../src/ai/json-text-preview';
import { comparisonFingerprint, parseComparison, type ComparisonContext } from '../src/ai/proposal-comparison.schema';
import { compareProposals } from '../src/ai/proposal-comparison.graph';
import { ProposalComparisonService } from '../src/ai/proposal-comparison.service';

const localized = { ar: 'تفاصيل المقترح', en: 'Proposal details' };
const entry = (applicationId: string) => ({ applicationId, reason: localized, strengths: [localized], gaps: [], question: localized, fit: 'partial' });
const valid = JSON.stringify({ summary: localized, entries: [entry('a'), entry('b')] });
const context: ComparisonContext = { challenge: { title: 'اختبار', titleEn: 'Test', summary: '', summaryEn: '', description: 'offline', descriptionEn: 'offline', deliverables: [], deliverablesEn: [], constraints: [], constraintsEn: [], criteria: [], criteriaEn: [], skills: ['PYTHON'], budgetDzd: 100, deadlineAt: null, status: 'OPEN' }, proposals: ['a', 'b'].map(applicationId => ({ applicationId, text: 'An offline proposal', textEn: '', deliveryDays: 10, skills: ['PYTHON'] })) };

test('comparison validates exact proposal membership and bilingual results', () => {
  assert.equal(parseComparison(valid, ['a', 'b']).entries.length, 2);
  for (const entries of [[entry('a'), entry('a')], [entry('a'), entry('unknown')], [entry('a')]]) assert.throws(() => parseComparison(JSON.stringify({ summary: localized, entries }), ['a', 'b']));
  assert.throws(() => parseComparison(valid.replace('تفاصيل المقترح', ''), ['a', 'b']));
});

test('structural preview preserves escapes/Arabic and cannot mistake embedded JSON text for fields', () => {
  const parser = new JsonTextPreview();
  assert.equal(parser.push('{"summary":{"ar":"مرحبا \\u00')['summary.ar'], 'مرحبا ');
  const text = parser.push('e9"},"entries":[{"applicationId":"a","reason":{"en":"Use \\"summary\\": safely ');
  assert.equal(text['entries.0.reason.en'], 'Use "summary": safely ');
  assert.equal(text['entries.0.applicationId'], 'a');
  assert.equal(parser.push('here"}},{"applicationId":"b"}]}')['entries.1.applicationId'], 'b');
});

test('fingerprint changes for relevant inputs while ignoring object identity', () => {
  assert.equal(comparisonFingerprint(context), comparisonFingerprint(structuredClone(context)));
  const changed = structuredClone(context); changed.proposals[0].skills.push('SQL');
  assert.notEqual(comparisonFingerprint(context), comparisonFingerprint(changed));
});

test('graph streams previews, repairs invalid IDs, and sends only sanitized context', async () => {
  let calls = 0; const progress: any[] = [];
  const result = await compareProposals(context, 'en', {
    async complete() { throw new Error('Streaming expected'); },
    async *stream(messages) {
      calls++;
      const input = JSON.parse(String(messages.at(-1)!.content)).input;
      assert.deepEqual(input, context);
      if (calls === 1) { yield valid.replace('"b"', '"wrong"'); }
      else { yield valid.slice(0, 40); assert.ok(progress.some(p => p.type === 'preview')); yield valid.slice(40); }
    },
  }, { signal: new AbortController().signal, maxRepairs: 2, progress: event => progress.push(event) });
  assert.equal(result.entries[1].applicationId, 'b'); assert.equal(calls, 2);
  assert.ok(progress.some(p => p.phase === 'repairing'));
});

test('graph respects cancellation and transport failures without automatic repairs', async () => {
  let calls = 0;
  await assert.rejects(compareProposals(context, 'en', { async complete() { calls++; throw new Error('provider failed'); } }, { signal: new AbortController().signal, maxRepairs: 2, progress() {} }));
  assert.equal(calls, 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(compareProposals(context, 'ar', { async complete() { calls++; return valid; } }, { signal: controller.signal, maxRepairs: 2, progress() {} }));
  assert.equal(calls, 1);
});

test('service requires company ownership, sanitizes input, and reports outdated comparisons', async () => {
  const problem = { id: 'p', ...context.challenge, deadlineAt: null, privateNotes: 'secret', companyUserId: 'company' };
  let ownerExists = true; let saved: any = null;
  const db: any = {
    problem: { findFirst: async ({ where }: any) => ownerExists && where.companyUserId === 'company' ? problem : null },
    application: { findMany: async () => context.proposals.map(p => ({ id: p.applicationId, coverMessage: p.text, coverMessageEn: p.textEn, deliveryDays: p.deliveryDays, applicant: { displayName: 'Name must not reach model', displayNameEn: 'Name', talent: { skills: p.skills } } })) },
    proposalComparison: { findUnique: async () => saved },
  };
  const service = new ProposalComparisonService(db);
  const user: any = { id: 'company', role: 'COMPANY' };
  const snapshot = await service.snapshot(user, 'p');
  assert.equal(JSON.stringify(snapshot.context).includes('secret'), false);
  assert.equal(JSON.stringify(snapshot.context).includes('Name must not reach model'), false);
  assert.equal((await service.get(user, 'p')).comparison, null);
  saved = { fingerprint: snapshot.fingerprint, result: JSON.parse(valid), generatedAt: new Date(), model: 'test' };
  assert.equal((await service.get(user, 'p')).stale, false);
  assert.deepEqual(await service.priorityIds(user, 'p'), ['a', 'b']);
  problem.descriptionEn = 'changed';
  assert.equal((await service.get(user, 'p')).stale, true);
  await assert.rejects(service.priorityIds(user, 'p'));
  ownerExists = false;
  await assert.rejects(service.get(user, 'p'));
  await assert.rejects(service.get({ id: 'talent', role: 'TALENT' } as any, 'p'));
});
