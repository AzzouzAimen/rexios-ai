import { useCallback, useEffect, useRef, useState } from 'react';
import { getProposalComparison, streamProposalComparison, type ComparisonState } from '../api/proposalComparison';
import { ApiError, apiErrorMessage } from '../api/client';
import type { Language } from '../types';

export function useProposalComparison(id: string, lang: Language) {
  const [saved, setSaved] = useState<ComparisonState | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('comparing');
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<ComparisonState['candidates']>([]);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const language = useRef(lang);
  useEffect(() => { language.current = lang; }, [lang]);
  const refresh = useCallback(async () => {
    if (controller.current) return null;
    const current = ++sequence.current;
    setChecking(true);
    try {
      const state = await getProposalComparison(id);
      if (current !== sequence.current) return null;
      setSaved(state); setCandidates(state.candidates); setError(''); return state;
    } catch (reason) {
      if (current === sequence.current) setError(apiErrorMessage(reason, language.current));
      return null;
    } finally { if (current === sequence.current) setChecking(false); }
  }, [id]);

  const cancel = useCallback(() => { sequence.current++; controller.current?.abort(); controller.current = null; setLoading(false); setPreview({}); }, []);
  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, [id]);
  const run = async () => {
    cancel();
    const current = ++sequence.current;
    const abort = new AbortController(); controller.current = abort;
    setLoading(true); setError(''); setPhase('comparing');
    try {
      const state = await streamProposalComparison(id, lang, event => {
        if (current !== sequence.current) return;
        if (event.type === 'snapshot') setCandidates(event.candidates);
        if (event.type === 'preview') setPreview(event.text);
        if (event.type === 'phase') { setPhase(event.phase); if (event.phase !== 'checking') setPreview({}); }
      }, abort.signal);
      if (current !== sequence.current) return null;
      setSaved(state); setCandidates(state.candidates); return state;
    } catch (reason) {
      if (current === sequence.current && !abort.signal.aborted) {
        if (reason instanceof ApiError && reason.status === 409) {
          const latest = await getProposalComparison(id).catch(() => null);
          if (current !== sequence.current) return null;
          if (latest) setSaved(latest);
        }
        setError(apiErrorMessage(reason, lang));
      }
      return null;
    }
    finally { if (current === sequence.current) { setLoading(false); setPreview({}); controller.current = null; } }
  };
  return { saved, loading, checking, error, phase, preview, candidates, refresh, cancel, run };
}
