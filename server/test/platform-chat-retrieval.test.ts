import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatGuide, parseChatRequest } from '../src/ai/platform-chat.schema';
import { buildGuideIndex } from '../src/ai/platform-chat.index';
import { retrieveChatKnowledge, retrievalQuestion } from '../src/ai/platform-chat.retrieval';
import { buildChatMessages } from '../src/ai/platform-chat.prompt';

const request = parseChatRequest({ message: 'Can I use GitHub instead of a résumé?', lang: 'en' });

test('retrieval selects relevant facts, skips weak matches and never supplies the full guide', async () => {
  const vectors = chatGuide.sections.map(section => section.id === 'profile' ? [1, 0] : [0, 1]);
  const index = buildGuideIndex(vectors, 'test/embed');
  const model = { model: 'test/embed', embed: async () => [[1, 0]] };
  const sections = await retrieveChatKnowledge(request, model, new AbortController().signal, index);
  assert.deepEqual(sections.map(section => section.id), ['profile']);
  const messages = buildChatMessages(request, { role: 'VISITOR', page: '/problems' }, sections);
  const system = String(messages[0].content);
  assert.ok(system.includes('CV is not mandatory'));
  assert.ok(!system.includes('Closing a challenge requires confirmation'));
  assert.ok(!system.includes('questions":'), 'retrieval-only sample questions need not be sent to chat');
  assert.ok(messages.filter(message => message.type === 'ai').length >= 6, 'keep the few-shot examples');
  const weak = await retrieveChatKnowledge(request, { model: 'test/embed', embed: async () => [[-1, -1]] }, new AbortController().signal, index);
  assert.deepEqual(weak, []);
});

test('follow-up retrieval carries the previous question but an explicit topic change does not', () => {
  const history = [{ role: 'user' as const, content: 'How do I submit a proposal?' }, { role: 'assistant' as const, content: 'Complete your profile and submit.' }];
  const followup = retrievalQuestion(parseChatRequest({ message: 'Where do I check it afterwards?', lang: 'en', history }));
  assert.ok(followup.includes(history[0].content));
  const switched = retrievalQuestion(parseChatRequest({ message: 'How do I delete my account?', lang: 'en', history }));
  assert.ok(!switched.includes(history[0].content));
  const arabic = retrievalQuestion(parseChatRequest({ message: 'وماذا بعد ذلك؟', lang: 'ar', history }));
  assert.ok(arabic.includes(history[0].content));
});
