import { ApiError, apiRequest } from './client';
import { readEventStream } from '../utils/eventStream';

export type ComparisonText = { ar: string; en: string };
export interface ComparisonEntry {
  applicationId: string; reason: ComparisonText; strengths: ComparisonText[]; gaps: ComparisonText[];
  question: ComparisonText; fit: 'strong' | 'partial' | 'limited';
}
export interface ComparisonState {
  pendingCount: number; canCompare: boolean; stale: boolean;
  candidates: { id: string; name: string; nameEn: string }[];
  comparison: { result: { summary: ComparisonText; entries: ComparisonEntry[] }; generatedAt: string; model: string } | null;
}
export type ComparisonProgress = { type: 'phase'; phase: 'comparing' | 'checking' | 'repairing'; attempt: number }
  | { type: 'preview'; text: Record<string, string>; attempt: number }
  | { type: 'snapshot'; candidates: ComparisonState['candidates'] };
const path = (id: string) => `/company/problems/${encodeURIComponent(id)}/proposal-comparison`;
export const getProposalComparison = (id: string) => apiRequest<ComparisonState>(path(id));
export async function streamProposalComparison(id: string, lang: 'ar' | 'en', progress: (event: ComparisonProgress) => void, signal: AbortSignal) {
  let response: Response;
  try { response = await fetch(`/api${path(id)}/stream`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify({ lang }), signal }); }
  catch (error) { if (signal.aborted) throw error; throw new ApiError('Could not connect to the comparison service. Please retry.', 0); }
  if (!response.ok) { const body = await response.json().catch(() => null); throw new ApiError(body?.message || 'Could not start comparison.', response.status); }
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new ApiError('Comparison stream is unavailable.', 0);
  return readEventStream<ComparisonProgress, ComparisonState>(response.body, progress, signal);
}
