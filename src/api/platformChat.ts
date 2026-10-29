import { ApiError } from './client';
import { readEventStream } from '../utils/eventStream';
import type { Language } from '../types';

export type ChatResource = { id: string; title: string; path: string };
export type ChatReply = { answer: string; resources: ChatResource[] };
export type ChatHistory = { role: 'user' | 'assistant'; content: string }[];
export type ChatProgress = { type: 'preview'; answer: string } | { type: 'phase'; phase: 'retrieving' | 'answering' | 'repairing'; attempt: number };

export async function streamPlatformChat(input: { message: string; history: ChatHistory; lang: Language; page: string }, progress: (event: ChatProgress) => void, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch('/api/ai/platform-chat/stream', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(input), signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError('Could not connect to Ask Rexios. Please try again.', 0);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(error?.message || 'Could not start the reply.', response.status);
  }
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new ApiError('The chat connection is unavailable.', 0);
  return readEventStream<ChatProgress, ChatReply>(response.body, progress, signal);
}
