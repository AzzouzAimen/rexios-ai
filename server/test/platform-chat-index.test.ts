import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createFeatherlessEmbeddingModel } from '../src/ai/featherless-embeddings.client';
import { buildGuideIndex, validateGuideIndex, cosineSimilarity, rankGuideSections } from '../src/ai/platform-chat.index';
import { chatGuide } from '../src/ai/platform-chat.schema';

test('embedding client orders batch outputs and never sends response-format or chat fields', async t => {
  let request: any;
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    request = { path: req.url, auth: req.headers.authorization, body: JSON.parse(body) };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ index: 1, embedding: [0, 2] }, { index: 0, embedding: [3, 0] }] }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const client = createFeatherlessEmbeddingModel({ baseURL: `http://127.0.0.1:${address.port}/v1`, apiKey: 'stub-key', model: 'test/embed' });
  assert.deepEqual(await client.embed(['first', 'ثاني'], new AbortController().signal), [[3, 0], [0, 2]]);
  assert.equal(request.path, '/v1/embeddings');
  assert.equal(request.auth, 'Bearer stub-key');
  assert.deepEqual(request.body, { model: 'test/embed', input: ['first', 'ثاني'] });
});

test('embedding failures hide provider details and reject malformed vectors without retries', async t => {
  let calls = 0;
  let status = 503;
  let payload: unknown = { error: { message: 'private-provider-diagnostic' } };
  const server = createServer(async (req, res) => {
    for await (const _ of req) { /* consume request */ }
    calls++; res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const client = createFeatherlessEmbeddingModel({ baseURL: `http://127.0.0.1:${address.port}/v1`, apiKey: 'stub-key' });
  await assert.rejects(client.embed(['question'], new AbortController().signal), (error: any) => error.status === 503 && !error.message.includes('private-provider-diagnostic'));
  assert.equal(calls, 1);
  status = 200;
  for (const vector of [[0, 0], [1, null], []]) {
    payload = { data: [{ index: 0, embedding: vector }] };
    await assert.rejects(client.embed(['question'], new AbortController().signal));
  }
  const abort = new AbortController(); abort.abort(); const before = calls;
  await assert.rejects(client.embed(['question'], abort.signal)); assert.equal(calls, before);
});

test('guide index detects stale data/model/IDs and ranks by cosine similarity', () => {
  const vectors = chatGuide.sections.map((_, index) => [index === 0 ? 1 : 0, index === 0 ? 0 : 1]);
  const index = buildGuideIndex(vectors, 'test/embed');
  validateGuideIndex(index, 'test/embed');
  assert.throws(() => validateGuideIndex({ ...index, guideHash: 'old' }, 'test/embed'));
  assert.throws(() => validateGuideIndex(index, 'another/model'));
  assert.throws(() => validateGuideIndex({ ...index, documents: index.documents.slice(1) }, 'test/embed'));
  assert.throws(() => buildGuideIndex([[1, 0]], 'test/embed'));
  assert.equal(cosineSimilarity([2, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.throws(() => cosineSimilarity([1], [1, 0]));
  assert.equal(rankGuideSections(index, [1, 0])[0].id, chatGuide.sections[0].id);
});
