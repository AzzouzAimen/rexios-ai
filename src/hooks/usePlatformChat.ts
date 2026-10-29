import { useEffect, useRef, useState } from 'react';
import { streamPlatformChat, type ChatResource, type ChatHistory } from '../api/platformChat';
import type { Language } from '../types';

export type ChatTurn = { id: string; question: string; answer: string; resources: ChatResource[]; lang: Language; status: 'streaming' | 'done' | 'error' | 'stopped' };

export function usePlatformChat(lang: Language, page: string) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'retrieving' | 'answering' | 'repairing'>('retrieving');
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, []);

  function stop() {
    sequence.current++;
    controller.current?.abort(); controller.current = null;
    setBusy(false);
    setTurns(previous => previous.map(turn => turn.status === 'streaming' ? { ...turn, status: 'stopped', resources: [] } : turn));
  }
  function clear() { stop(); setTurns([]); }

  async function send(question: string, replaceId?: string) {
    const message = question.trim();
    if (controller.current || !message || message.length > 6000) return;
    const history: ChatHistory = turns.filter(turn => turn.status === 'done').flatMap(turn => [
      { role: 'user' as const, content: turn.question }, { role: 'assistant' as const, content: turn.answer },
    ]).slice(-12);
    const current = ++sequence.current;
    const id = `chat-${current}`;
    const abort = new AbortController(); controller.current = abort;
    setTurns(previous => [...previous.filter(turn => turn.id !== replaceId), { id, question: message, answer: '', resources: [], lang, status: 'streaming' }]);
    setBusy(true); setPhase('retrieving');
    const update = (data: Partial<ChatTurn>) => {
      if (current === sequence.current) setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, ...data } : turn));
    };
    try {
      const result = await streamPlatformChat({ message, history, lang, page }, event => {
        if (current !== sequence.current) return;
        if (event.type === 'preview') update({ answer: event.answer });
        else { setPhase(event.phase); update({ answer: '' }); }
      }, abort.signal);
      update({ answer: result.answer, resources: result.resources, status: 'done' });
    } catch {
      if (current === sequence.current && !abort.signal.aborted) update({ status: 'error', resources: [] });
    } finally {
      if (current === sequence.current) { controller.current = null; setBusy(false); }
    }
  }
  return { turns, busy, phase, send, stop, clear };
}
