import { AiUnavailableError, DEFAULT_FEATHERLESS_BASE_URL } from './featherless.client';

export const DEFAULT_EMBEDDING_MODEL = 'Qwen/Qwen3-Embedding-0.6B';
export interface EmbeddingModel { model: string; embed(input: string[], signal: AbortSignal): Promise<number[][]> }
export class EmbeddingApiError extends Error {
  constructor(message: string, readonly status = 502) { super(message); }
}
export function validVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every(n => typeof n === 'number' && Number.isFinite(n)) && value.some(n => n !== 0);
}

export function createFeatherlessEmbeddingModel(overrides: { baseURL?: string; apiKey?: string; model?: string } = {}): EmbeddingModel {
  const model = (overrides.model || process.env.FEATHERLESS_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL).trim();
  return {
    model,
    async embed(input, signal) {
      signal.throwIfAborted();
      const apiKey = (overrides.apiKey ?? process.env.FEATHERLESS_API_KEY ?? '').trim();
      if (!apiKey) throw new AiUnavailableError();
      const baseURL = (overrides.baseURL || process.env.FEATHERLESS_BASE_URL || DEFAULT_FEATHERLESS_BASE_URL).trim().replace(/\/+$/, '');
      let response: globalThis.Response;
      try {
        response = await fetch(`${baseURL}/embeddings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, input }), signal });
      } catch (error) {
        if (signal.aborted) throw error;
        throw new EmbeddingApiError('Could not reach the embedding service.');
      }
      if (!response.ok) throw new EmbeddingApiError('The embedding service could not complete this request.', response.status);
      const body = await response.json().catch(() => null) as { data?: { index: number; embedding: unknown }[] } | null;
      const rows = body?.data;
      if (!Array.isArray(rows) || rows.length !== input.length) throw new EmbeddingApiError('Invalid embedding response.');
      const vectors = input.map((_, index) => rows.find(row => row.index === index)?.embedding);
      if (!vectors.every(validVector) || vectors.some(vector => vector.length !== vectors[0].length)) throw new EmbeddingApiError('Invalid embedding vectors.');
      return vectors;
    },
  };
}
