import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { decideApplication, listCompanyApplications } from '../api/applications';
import { getCompanyProblem } from '../api/problems';
import { ApiError, apiErrorMessage } from '../api/client';
import { ProposalReviewCard } from '../components/ProposalReviewCard';
import { ProposalComparisonPanel } from '../components/ProposalComparisonPanel';
import { useProposalComparison } from '../hooks/useProposalComparison';
import type { Application } from '../types';

const CompanyApplicationsContent: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { lang } = useApp();
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const limit = 20;
  const [order, setOrder] = useState<'newest' | 'ai'>('newest');
  const ai = useProposalComparison(id, lang);
  const refreshComparison = ai.refresh;
  const loadSequence = useRef(0);
  const load = useCallback(async (nextPage: number, decisionCommitted = false, keepRowsVisible = false, requestedOrder = order) => {
    const sequence = ++loadSequence.current;
    if (!keepRowsVisible) setLoading(true);
    setError('');
    try {
      const [problem, apps] = await Promise.all([getCompanyProblem(id), listCompanyApplications(id, nextPage, limit, requestedOrder)]);
      if (sequence !== loadSequence.current) return false;
      setTitle(lang === 'ar' ? (problem.title || problem.titleEn) : (problem.titleEn || problem.title));
      setItems(apps.items); setTotal(apps.total); setPage(apps.page);
      return true;
    } catch (loadError) {
      if (sequence !== loadSequence.current) return false;
      if (requestedOrder === 'ai' && loadError instanceof ApiError && loadError.status === 409) { setOrder('newest'); await refreshComparison(); return false; }
      setItems([]); setTotal(0); setTitle('');
      const refreshError = apiErrorMessage(loadError, lang);
      setError(decisionCommitted
        ? (lang === 'ar' ? `تم حفظ القرار، لكن تعذر تحديث القائمة. ${refreshError}` : `Decision saved, but the list could not refresh. ${refreshError}`)
        : refreshError);
      return false;
    }
    finally { if (!keepRowsVisible && sequence === loadSequence.current) setLoading(false); }
  }, [id, lang, order, refreshComparison]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(1); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    void refreshComparison().then(state => { if (state?.comparison && !state.stale && state.canCompare) setOrder('ai'); });
  }, [refreshComparison]);
  useEffect(() => {
    const recheck = () => { if (document.visibilityState === 'visible') void refreshComparison().then(state => { if (state && (state.stale || !state.canCompare)) setOrder('newest'); }); };
    window.addEventListener('focus', recheck);
    return () => window.removeEventListener('focus', recheck);
  }, [refreshComparison]);
  const runComparison = async () => {
    const state = await ai.run();
    if (state && !state.stale && state.canCompare) { setOrder('ai'); await load(1, false, true, 'ai'); }
  };

  const decide = async (applicationId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    setBusy(applicationId); setError('');
    try {
      const updated = await decideApplication(applicationId, decision, reason[applicationId]);
      setItems((current) => current.map((item) => item.id === updated.id
        ? { ...item, ...updated, applicant: updated.applicant || item.applicant, problem: updated.problem || item.problem, files: updated.files || item.files }
        : item));
      setOrder('newest'); await ai.refresh(); await load(1, true, true, 'newest');
    }
    catch (decisionError) {
      if (decisionError instanceof ApiError && decisionError.status === 409) await load(page);
      setError(apiErrorMessage(decisionError, lang));
    }
    finally { setBusy(''); }
  };

  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6"><nav className="flex items-center gap-2 text-xs text-[#5B5B7B]"><Link to="/company/problems" className="hover:underline">{lang === 'ar' ? 'تحديات شركتي' : 'My Challenges'}</Link><Chevron className="w-3.5 h-3.5" /><span className="font-bold text-[#12122B]">{lang === 'ar' ? 'مراجعة العروض الهندسية' : 'Review proposals'}</span></nav><div><h1 className="text-2xl font-bold text-[#12122B]">{title}</h1><p className="text-sm text-[#5B5B7B] mt-1">{lang === 'ar' ? 'اعتماد مقترح أحد المهندسين يغلق التحدي ويحوّل بقية العروض قيد المراجعة إلى معتذر عنها تلقائيًا.' : 'Accepting one applicant closes the problem and rejects other pending applications.'}</p></div>
    <ProposalComparisonPanel ai={ai} lang={lang} order={order} onOrder={setOrder} onRun={() => void runComparison()} disabled={!!busy || loading} />
    {error && <div className="p-3 bg-[#FFE3DC] border-2 border-[#E5432A] rounded-md text-xs font-bold text-[#E5432A] flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
    {loading ? <div className="card-pixel p-10 text-center text-sm text-[#5B5B7B]">{lang === 'ar' ? 'جارٍ تحميل العروض والمقترحات…' : 'Loading applications…'}</div>
      : items.length === 0 ? <div className="card-pixel p-10 text-center text-sm text-[#5B5B7B]">{lang === 'ar' ? 'لا توجد عروض هندسية مقدمة لهذا التحدي حتى الآن.' : 'No submitted applications for this problem.'}</div>
        : <div className="flex flex-col gap-4">{items.map((application) => <ProposalReviewCard key={application.id} application={application} lang={lang} reason={reason[application.id] || ''} onReason={value => setReason(current => ({ ...current, [application.id]: value }))} onDecide={decision => void decide(application.id, decision)} busy={!!busy} locked={ai.loading} entry={order === 'ai' && !ai.saved?.stale ? ai.saved?.comparison?.result.entries.find(entry => entry.applicationId === application.id) : undefined} rank={(ai.saved?.comparison?.result.entries.findIndex(entry => entry.applicationId === application.id) ?? -1) + 1} />)}</div>}
    {total > limit && <div className="flex justify-between items-center"><button type="button" disabled={page <= 1 || loading || ai.loading} onClick={() => void load(page - 1)} className="px-4 py-2 rounded-md text-xs font-bold btn-pixel-secondary">{lang === 'ar' ? 'السابق' : 'Previous'}</button><span className="text-xs text-[#5B5B7B]">{lang === 'ar' ? 'صفحة' : 'Page'} {page} / {Math.ceil(total / limit)}</span><button type="button" disabled={page * limit >= total || loading || ai.loading} onClick={() => void load(page + 1)} className="px-4 py-2 rounded-md text-xs font-bold btn-pixel-secondary">{lang === 'ar' ? 'التالي' : 'Next'}</button></div>}
  </div>;
};

export const CompanyApplicationsPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { currentUser } = useApp();
  return <CompanyApplicationsContent key={`${id}:${currentUser.id}`} />;
};
