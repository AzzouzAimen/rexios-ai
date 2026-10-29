import { Sparkles, X } from 'lucide-react';
import type { Language } from '../types';
import type { ComparisonEntry } from '../api/proposalComparison';
import type { useProposalComparison } from '../hooks/useProposalComparison';
import { SmoothText } from './SmoothText';
import ShinyText from './reactbits/ShinyText';
import { BriefSkeleton } from './ChallengeBriefPreview';

type AI = ReturnType<typeof useProposalComparison>;
type Order = 'newest' | 'ai';
const button = 'btn-pixel-secondary px-3 py-2 rounded-md text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export function ProposalComparisonPanel({ ai, lang, order, onOrder, onRun, disabled }: { ai: AI; lang: Language; order: Order; onOrder(order: Order): void; onRun(): void; disabled: boolean }) {
  const ar = lang === 'ar';
  const fresh = !!ai.saved?.comparison && !ai.saved.stale && ai.saved.canCompare;
  const summary = ai.loading ? ai.preview[`summary.${lang}`] : fresh ? ai.saved!.comparison!.result.summary[lang] : '';
  const phases: Record<string, string> = ar ? { comparing: 'جارٍ مقارنة المقترحات…', checking: 'جارٍ مراجعة المقارنة…', repairing: 'جارٍ ضبط المقارنة…' } : { comparing: 'Comparing proposals…', checking: 'Checking the comparison…', repairing: 'Adjusting the comparison…' };
  const streamRows = Array.from(new Set(Object.keys(ai.preview).map(key => /^entries\.(\d+)\.reason\./.exec(key)?.[1]).filter((key): key is string => !!key)));
  return <section className="card-pixel p-5 sm:p-6 space-y-4 bg-[#EEF1FF]" aria-label={ar ? 'مقارنة المقترحات بالذكاء الاصطناعي' : 'AI proposal comparison'} aria-busy={ai.loading}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1"><h2 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#0B2A9E]" />{ar ? 'أي المقترحات تراجع أولًا؟' : 'Which proposals should you review first?'}</h2>
        <p className="text-xs text-[#5B5B7B]">{ar ? 'مقارنة المنهجية وتغطية المتطلبات والمدة والمهارات المعلنة.' : 'Compare approaches, requirements coverage, timelines, and declared skills.'}</p></div>
      <div className="flex gap-2 items-center"><button type="button" className="btn-pixel-accent px-4 py-2 rounded-md text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" disabled={disabled || ai.loading || ai.checking || !ai.saved?.canCompare} onClick={onRun}>{fresh || ai.saved?.stale ? (ar ? 'تحديث المقارنة' : 'Refresh comparison') : (ar ? 'قارن المقترحات بالذكاء الاصطناعي' : 'Compare proposals with AI')}</button>
        {ai.loading && <button type="button" className={button} onClick={ai.cancel}><X className="w-3 h-3 inline me-1" />{ar ? 'إلغاء' : 'Cancel'}</button>}</div>
    </div>
    <p className="text-xs text-[#5B5B7B]">{ar ? `${ai.saved?.pendingCount ?? 0} مقترحات قيد المراجعة` : `${ai.saved?.pendingCount ?? 0} pending proposals`}{ai.saved?.comparison && ` · ${new Intl.DateTimeFormat(ar ? 'ar-DZ' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ai.saved.comparison.generatedAt))}`}</p>
    {!ai.checking && ai.saved && !ai.saved.canCompare && <p className="text-xs">{ar ? 'يلزم تحدٍّ مفتوح ومقترحان قيد المراجعة على الأقل للمقارنة.' : 'An open challenge and at least two pending proposals are needed to compare.'}</p>}
    {ai.saved?.stale && <p className="border border-[#E0C577] bg-[#FFF1CC] p-3 rounded text-xs" role="status">{ar ? 'بحاجة إلى تحديث: تغيرت المقترحات أو المتطلبات منذ آخر مقارنة.' : 'Needs refresh: proposals or requirements changed since the last comparison.'}</p>}
    {ai.error && <div role="alert" className="bg-[#FFE3DC] border border-[#E5432A] rounded p-3 text-xs space-y-2"><p>{ai.error}</p><button type="button" className="underline font-bold" onClick={() => void ai.refresh()}>{ar ? 'إعادة تحميل الحالة' : 'Reload status'}</button></div>}
    {ai.loading && <div role="status" className="text-xs font-bold"><ShinyText color="#0B2A9E" shineColor="#7794E8" speed={2.6} text={phases[ai.phase]} className="ai-drafting-shine" /><p className="mt-2 text-[11px] text-[#5B5B7B]">{ar ? 'تظهر تفسيرات أولية؛ يُعتمد الترتيب بعد اكتمال المراجعة.' : 'Explanations are provisional. Priority is confirmed after checking finishes.'}</p></div>}
    {(summary || ai.loading) && <div className="text-sm leading-relaxed whitespace-pre-wrap">{summary ? <SmoothText key={lang} text={summary} streaming={ai.loading} /> : <BriefSkeleton />}</div>}
    {ai.loading && streamRows.map(index => {
      const id = ai.preview[`entries.${index}.applicationId`];
      const candidate = ai.candidates.find(c => c.id === id);
      const reason = ai.preview[`entries.${index}.reason.${lang}`];
      return reason ? <div key={`${index}:${lang}`} className="border-t border-[#C9D3FF] pt-3 text-xs space-y-1"><p className="font-semibold">{candidate ? ar ? candidate.name : candidate.nameEn : ar ? 'تفسير المقترح' : 'Proposal explanation'}</p><SmoothText text={reason} streaming /></div> : null;
    })}
    {fresh && !ai.loading && <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ar ? 'ترتيب المقترحات' : 'Proposal order'}>{(['ai', 'newest'] as const).map(value => <button type="button" disabled={disabled} key={value} aria-pressed={order === value} onClick={() => onOrder(value)} className={`${button} ${order === value ? 'bg-[#0B2A9E] text-[#FFFBF1]' : ''}`}>{value === 'ai' ? (ar ? 'أولوية الذكاء الاصطناعي · قيد المراجعة' : 'AI priority · Pending') : (ar ? 'الأحدث · جميع المقترحات' : 'Newest · All proposals')}</button>)}</div>}
  </section>;
}

export function ProposalInsight({ entry, rank, lang }: { entry: ComparisonEntry; rank: number; lang: Language }) {
  const ar = lang === 'ar';
  const fit = { strong: ar ? 'ملاءمة قوية' : 'Strong fit', partial: ar ? 'ملاءمة جزئية' : 'Partial fit', limited: ar ? 'ملاءمة محدودة' : 'Limited fit' };
  return <aside className={`ai-section space-y-3 rounded-md border-2 p-4 ${rank === 1 ? 'border-[#8FCC00] bg-[#F0FFC4]' : 'border-[#C9D3FF] bg-[#EEF1FF]'}`} aria-label={ar ? 'تحليل المقترح' : 'Proposal insight'}>
    <div className="flex items-center gap-3"><span className="font-num text-xl font-bold text-[#0B2A9E]">#{rank}</span><span className="text-xs font-bold">{fit[entry.fit]}</span></div>
    <p className="text-sm leading-relaxed">{entry.reason[lang]}</p>
    <div className="grid sm:grid-cols-2 gap-3 text-xs">
      <div><h3 className="font-bold mb-1">{ar ? 'نقاط القوة' : 'Strengths'}</h3>{entry.strengths.length ? <ul className="list-disc ps-4 space-y-1">{entry.strengths.map((s, i) => <li key={i}>{s[lang]}</li>)}</ul> : <p>{ar ? 'لم يوضح المقترح نقاط قوة محددة.' : 'No specific strengths established.'}</p>}</div>
      <div><h3 className="font-bold mb-1">{ar ? 'فجوات تحتاج إلى توضيح' : 'Gaps to clarify'}</h3>{entry.gaps.length ? <ul className="list-disc ps-4 space-y-1">{entry.gaps.map((g, i) => <li key={i}>{g[lang]}</li>)}</ul> : <p>{ar ? 'لم تُحدد فجوات واضحة.' : 'No clear gaps identified.'}</p>}</div>
    </div>
    <p className="border-t border-[#12122B]/15 pt-2 text-xs"><span className="font-bold">{ar ? 'سؤال للمتابعة: ' : 'Ask next: '}</span>{entry.question[lang]}</p>
  </aside>;
}
