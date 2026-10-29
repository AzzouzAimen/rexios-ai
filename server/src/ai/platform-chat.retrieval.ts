import storedIndex from './knowledge/platform-guide.index.json';
import { createFeatherlessEmbeddingModel, type EmbeddingModel } from './featherless-embeddings.client';
import { rankGuideSections, validateGuideIndex, type GuideIndex } from './platform-chat.index';
import { chatGuide, type ChatRequest } from './platform-chat.schema';

export function retrievalQuestion(input: ChatRequest): string {
  const followup = input.message.length < 180 && (/\b(it|that|this|those|them|afterwards?|then|there|what about|how about)\b/i.test(input.message) || /(بعدها|بعد ذلك|وماذا|ذلك|هذا|هذه|أتابعه|اتابعه)/u.test(input.message));
  const previous = input.history.at(-2);
  return followup && previous?.role === 'user' ? `Previous question: ${previous.content}\nCurrent question: ${input.message}` : input.message;
}

export async function retrieveChatKnowledge(input: ChatRequest, model: EmbeddingModel = createFeatherlessEmbeddingModel(), signal: AbortSignal, index: GuideIndex = storedIndex as GuideIndex) {
  signal.throwIfAborted();
  validateGuideIndex(index, model.model);
  const [vector] = await model.embed([`Instruct: Given a question about Rexios AI, retrieve platform help that answers the current question. Previous-question context only resolves follow-ups.\nQuery: ${retrievalQuestion(input)}`], signal);
  signal.throwIfAborted();
  const ranked = rankGuideSections(index, vector);
  // Calibrated on English/Arabic product questions and unrelated questions.
  // Similarity is relevance, not a security boundary or a probability.
  const floor = Math.max(0.4, (ranked[0]?.score || 0) - 0.15);
  const ids = ranked.filter(row => row.score >= floor).slice(0, 4).map(row => row.id);
  // Applying depends on profile completeness; include its exact requirements.
  if (ids.includes('applying') && !ids.includes('profile')) {
    if (ids.length === 4) ids.splice(ids.findLastIndex(id => id !== 'applying'), 1);
    ids.push('profile');
  }
  return ids.map(id => chatGuide.sections.find(section => section.id === id)!);
}
