import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadAiEnvironment } from '../src/ai/ai.environment';
import { createFeatherlessEmbeddingModel } from '../src/ai/featherless-embeddings.client';
import { buildGuideIndex, sectionText } from '../src/ai/platform-chat.index';
import { chatGuide } from '../src/ai/platform-chat.schema';

async function main() {
  loadAiEnvironment();
  const client = createFeatherlessEmbeddingModel();
  const vectors = await client.embed(chatGuide.sections.map(sectionText), AbortSignal.timeout(180000));
  const index = buildGuideIndex(vectors, client.model);
  const target = resolve(__dirname, '../src/ai/knowledge/platform-guide.index.json');
  await writeFile(target, JSON.stringify(index) + '\n', 'utf8');
  console.log(`Indexed ${index.documents.length} public guide sections with ${index.model} (${vectors[0].length} dimensions). No credentials are stored in the index.`);
}
main().catch(() => { console.error('Could not build the guide index. Check the embedding model, Featherless configuration and service availability.'); process.exitCode = 1; });
