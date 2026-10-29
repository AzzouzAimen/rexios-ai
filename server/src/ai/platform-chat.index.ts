import { createHash } from 'node:crypto';
import { chatGuide } from './platform-chat.schema';
import { validVector } from './featherless-embeddings.client';

export type GuideSection = typeof chatGuide.sections[number];
export type GuideIndex = { format: 1; model: string; guideHash: string; documents: { id: string; embedding: number[] }[] };
export class ChatIndexError extends Error {}
export const guideHash = () => createHash('sha256').update(JSON.stringify(chatGuide)).digest('hex');
// Question-shaped bilingual descriptions represent each topic without noisy,
// overlapping policy/disclaimer paragraphs. Retrieved facts remain authoritative.
export const sectionText = (section: GuideSection) => `${section.title.en}\n${section.title.ar}\n${section.questions.join('\n')}`;

export function buildGuideIndex(vectors: number[][], model: string): GuideIndex {
  const index: GuideIndex = { format: 1, model, guideHash: guideHash(), documents: chatGuide.sections.map((section, i) => ({ id: section.id, embedding: vectors[i] })) };
  if (vectors.length !== chatGuide.sections.length) throw new ChatIndexError('Guide embedding count does not match.');
  validateGuideIndex(index, model);
  return index;
}

export function validateGuideIndex(index: GuideIndex, model: string) {
  const ids = chatGuide.sections.map(section => section.id);
  if (index.format !== 1 || index.model !== model || index.guideHash !== guideHash() || index.documents.length !== ids.length ||
    new Set(index.documents.map(row => row.id)).size !== ids.length || index.documents.some(row => !ids.includes(row.id) || !validVector(row.embedding)) ||
    index.documents.some(row => row.embedding.length !== index.documents[0].embedding.length)) {
    throw new ChatIndexError('Platform guide index needs rebuilding. Run npm run ai:index-guide.');
  }
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (!validVector(left) || !validVector(right) || left.length !== right.length) throw new ChatIndexError('Embedding dimensions do not match the guide index.');
  let dot = 0, a = 0, b = 0;
  for (let i = 0; i < left.length; i++) { dot += left[i] * right[i]; a += left[i] ** 2; b += right[i] ** 2; }
  return dot / Math.sqrt(a * b);
}

export function rankGuideSections(index: GuideIndex, vector: number[]) {
  return index.documents.map(row => ({ id: row.id, score: cosineSimilarity(row.embedding, vector) })).sort((a, b) => b.score - a.score);
}
