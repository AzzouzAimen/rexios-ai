import type { Language, Problem } from '../types';
import { isChallengeOpen } from '../utils/challengeAvailability';

type Challenge = Pick<Problem, 'status' | 'deadlineAt'>;

export function ChallengeStatus({ problem, lang }: { problem: Challenge; lang: Language }) {
  const state = problem.status === 'CLOSED' ? 'closed' : problem.status === 'DRAFT' ? 'draft' : isChallengeOpen(problem) ? 'open' : 'expired';
  const labels = {
    open: { ar: 'مفتوح لتلقي المقترحات', en: 'Open for proposals' },
    closed: { ar: 'مغلق', en: 'Closed' },
    draft: { ar: 'مسودة', en: 'Draft' },
    expired: { ar: 'انتهى موعد التقديم', en: 'Deadline passed' },
  };
  const color = state === 'open' ? 'bg-[#D9F5E5] text-[#1E9E5A]' : state === 'closed' ? 'bg-[#EFE4CC] text-[#5B5B7B]' : 'bg-[#FFF1CC] text-[#12122B]';
  return <span className={`inline-flex w-fit px-2.5 py-1 border border-[#12122B] rounded-full text-[10px] font-bold ${color}`}>{labels[state][lang]}</span>;
}
