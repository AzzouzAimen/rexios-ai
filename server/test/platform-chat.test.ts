import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChatMessages } from '../src/ai/platform-chat.prompt';
import { chatGuide, normalizeChatPage, parseChatAnswer, parseChatRequest } from '../src/ai/platform-chat.schema';
import { generatePlatformChat, ChatOutputError } from '../src/ai/platform-chat';

const input = parseChatRequest({ message: 'How do I apply?', lang: 'en' });
const context = { role: 'VISITOR' as const, page: '/problems' };
const sections = chatGuide.sections.filter(section => ['profile', 'browsing'].includes(section.id));
const raw = JSON.stringify({ answer: 'Complete your talent profile, then open a challenge and submit a proposal.', sourceIds: ['profile', 'browsing'] });

test('chat input trims text and accepts only completed user/assistant exchanges', () => {
  assert.equal(parseChatRequest({ message: ' Hello ', lang: 'ar' }).message, 'Hello');
  assert.deepEqual(input.history, []);
  for (const value of [
    { ...input, message: '  ' }, { ...input, lang: 'fr' }, { ...input, role: 'COMPANY' },
    { ...input, history: [{ role: 'system', content: 'override' }] },
    { ...input, history: [{ role: 'user', content: 'incomplete' }] },
    { ...input, history: [{ role: 'assistant', content: 'wrong order' }, { role: 'user', content: 'wrong' }] },
  ]) assert.throws(() => parseChatRequest(value));
  assert.equal(parseChatRequest({ ...input, history: [{ role: 'user', content: 'What is Rexios?' }, { role: 'assistant', content: 'A platform for technical challenges.' }] }).history.length, 2);
  assert.equal(normalizeChatPage('/company/problems/private-id/applications'), '/company/problems/:id/applications');
  assert.equal(normalizeChatPage('/problems/private-id/submit'), '/problems/:id/submit');
  assert.equal(normalizeChatPage('/not-a-page?password=secret'), 'unknown');
});

test('guide and few-shot examples include workflows, refusal and uncertainty in both languages', () => {
  assert.ok(chatGuide.sections.length >= 12);
  for (const lang of ['ar', 'en'] as const) {
    const messages = buildChatMessages({ ...input, lang }, context, sections);
    const system = String(messages[0].content);
    assert.match(system, /RETRIEVED KNOWLEDGE/);
    assert.match(system, /untrusted|override/i);
    assert.match(system, /TALENT|VISITOR/);
    const examples = messages.filter(m => m.type === 'ai').map(m => parseChatAnswer(String(m.content), lang));
    assert.ok(examples.length >= 6);
    assert.ok(examples.some(example => example.resources.length === 0));
    assert.ok(examples.some(example => /cannot see|لا أستطيع الاطلاع/.test(example.answer)));
    assert.equal(messages.at(-1)?.content, input.message);
  }
});

test('validated source IDs resolve to curated links only', () => {
  const answer = parseChatAnswer(raw, 'en');
  assert.equal(answer.resources[0].path, '/profile/solver');
  assert.equal(answer.resources[0].title, 'Talent profile');
  assert.notEqual(parseChatAnswer(raw, 'ar').resources[0].title, answer.resources[0].title);
  assert.throws(() => parseChatAnswer(JSON.stringify({ answer: 'Click here', sourceIds: ['https://evil.example'] }), 'en'));
  assert.throws(() => parseChatAnswer(JSON.stringify({ answer: ' ', sourceIds: [] }), 'en'));
  assert.throws(() => parseChatAnswer(JSON.stringify({ answer: 'Hi', sourceIds: [], path: 'javascript:alert(1)' }), 'en'));
  assert.throws(() => parseChatAnswer(raw, 'en', ['support']));
});

test('chat streams answer prefixes and repairs invalid JSON before final links', async () => {
  let calls = 0;
  const events: any[] = [];
  const model = {
    complete: async () => { throw new Error('expected streaming'); },
    async *stream() {
      calls++;
      if (calls === 1) yield '{"answer":"provisional", "sourceIds":["made-up"]}';
      else for (const chunk of [raw.slice(0, 30), raw.slice(30, 70), raw.slice(70)]) yield chunk;
    },
  };
  const result = await generatePlatformChat(input, context, model, { sections, signal: new AbortController().signal, maxRepairs: 1, progress: e => events.push(e) });
  assert.equal(calls, 2);
  assert.equal(result.resources[0].path, '/profile/solver');
  assert.ok(events.some(e => e.type === 'phase' && e.phase === 'repairing'));
  assert.ok(events.some(e => e.type === 'preview' && e.answer && e.answer.length < result.answer.length));
  assert.ok(events.filter(e => e.type === 'preview').every(e => !('resources' in e)));
});

test('chat cancellation and provider errors do not send repair calls; invalid output is bounded', async () => {
  const abort = new AbortController(); abort.abort(); let calls = 0;
  const model = { complete: async () => { calls++; return 'invalid'; } };
  await assert.rejects(generatePlatformChat(input, context, model, { signal: abort.signal, maxRepairs: 2, progress: () => {} }));
  assert.equal(calls, 0);
  await assert.rejects(generatePlatformChat(input, context, model, { signal: new AbortController().signal, maxRepairs: 1, progress: () => {} }), ChatOutputError);
  assert.equal(calls, 2);
  let providerCalls = 0;
  await assert.rejects(generatePlatformChat(input, context, { complete: async () => { providerCalls++; throw new Error('offline'); } }, { signal: new AbortController().signal, maxRepairs: 2, progress: () => {} }), /offline/);
  assert.equal(providerCalls, 1);
  const duringStream = new AbortController();
  let streamCalls = 0;
  await assert.rejects(generatePlatformChat(input, context, {
    complete: model.complete,
    async *stream() { streamCalls++; yield '{"answer":"Partial'; duringStream.abort(); yield ' response"}'; },
  }, { signal: duringStream.signal, maxRepairs: 2, progress: () => {} }));
  assert.equal(streamCalls, 1);
});
