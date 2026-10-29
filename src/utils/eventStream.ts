import { ApiError } from '../api/client';
type StreamEvent<P, R> = P | { type: 'complete'; result: R } | { type: 'error'; status: number; message: string };

/** Decode SSE frames independently of HTTP chunk and UTF-8 boundaries. */
export async function readEventStream<P extends { type: string }, R>(body: ReadableStream<Uint8Array>, onProgress: (event: P) => void, signal?: AbortSignal): Promise<R> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      buffer += decoder.decode(value, { stream: !done });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!data) continue;
        let event: StreamEvent<P, R>;
        try { event = JSON.parse(data) as StreamEvent<P, R>; }
        catch { throw new ApiError('The AI connection could not be read. Please retry.', 0, 'INVALID_STREAM'); }
        if (event.type === 'error') { const failure = event as { message: string; status: number }; throw new ApiError(failure.message, failure.status); }
        if (event.type === 'complete') return (event as { result: R }).result;
        onProgress(event as P);
      }
      if (done) throw new ApiError('The connection ended before the AI response could finish. Please retry.', 0, 'INCOMPLETE_STREAM');
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
