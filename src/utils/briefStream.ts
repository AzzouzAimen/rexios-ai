import type { BriefProgress, BriefResult } from '../api/contracts';
import { readEventStream } from './eventStream';

export const readBriefStream = (body: ReadableStream<Uint8Array>, onProgress: (event: BriefProgress) => void, signal?: AbortSignal) =>
  readEventStream<BriefProgress, BriefResult>(body, event => { if (event.type === 'phase' || event.type === 'preview') onProgress(event); }, signal);
