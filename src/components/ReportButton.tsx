import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Flag, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reportContent, supportErrorMessage, type ReportReason, type ReportTarget } from '../api/support';

type TargetProps = { targetType: ReportTarget; targetId: string };

function ReportDialog({ targetType, targetId, onClose, onReported }: TargetProps & { onClose: () => void; onReported: () => void }) {
  const { lang, dir } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !reason) return;
    setError(''); setPending(true);
    try {
      const receipt = await reportContent({ targetType, targetId, reason, ...(details.trim() ? { details: details.trim() } : {}), language: lang });
      setReference(receipt.reference);
      onReported();
    } catch (err) { setError(supportErrorMessage(err, lang)); }
    finally { setPending(false); }
  }

  return <dialog ref={dialogRef} dir={dir} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !pending) onClose(); }}
    className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[90dvh] overflow-y-auto bg-[#FFFBF1] text-[#12122B] border-2 border-[#12122B] rounded-lg shadow-pixel-m p-0 backdrop:bg-[#12122B]/60">
    <div className="p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-lg font-bold inline-flex items-center gap-2">{reference ? <CheckCircle2 className="w-5 h-5 text-[#1E9E5A]" /> : <Flag className="w-5 h-5 text-[#0B2A9E]" />}{reference ? (lang === 'ar' ? 'وصل بلاغك' : 'Report received') : (lang === 'ar' ? 'الإبلاغ عن محتوى' : 'Report content')}</h2>
        <button type="button" onClick={onClose} disabled={pending} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'} className="p-1 rounded hover:bg-[#EFE4CC] disabled:opacity-50"><X className="w-5 h-5" /></button>
      </div>
      <p id={descriptionId} className="text-sm text-[#5B5B7B] leading-relaxed">{reference
        ? (lang === 'ar' ? 'حُفظ بلاغك لفريق Rexios. الإبلاغ لا يزيل المحتوى تلقائيًا.' : 'Your report has been saved for the Rexios team. Reporting does not automatically remove content.')
        : (lang === 'ar' ? 'ساعدنا على فهم المشكلة. لن يظهر بلاغك في الصفحة العامة.' : 'Help us understand the issue. Your report will not appear on the public page.')}</p>
      {reference ? <div className="space-y-4" role="status">
        <div className="space-y-2"><p className="text-xs text-[#5B5B7B]">{lang === 'ar' ? 'مرجع البلاغ' : 'Report reference'}</p><p dir="ltr" className="font-num text-xs break-all rounded bg-[#EEF1FF] border border-[#C9D3FF] p-3 select-all">{reference}</p></div>
        <button type="button" onClick={onClose} className="btn-pixel-primary w-full px-4 py-2 rounded text-sm font-bold">{lang === 'ar' ? 'تم' : 'Done'}</button>
      </div> : <form onSubmit={event => void submit(event)} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-70">
          <label className="block space-y-2 text-xs font-bold"><span>{lang === 'ar' ? 'ما المشكلة؟' : 'What is the issue?'}</span>
            <select autoFocus required value={reason} onChange={event => setReason(event.target.value as ReportReason)} className="input-pixel w-full text-sm">
              <option value="" disabled>{lang === 'ar' ? 'اختر سببًا' : 'Choose a reason'}</option>
              <option value="SPAM">{lang === 'ar' ? 'رسائل مزعجة أو إعلانات' : 'Spam or advertising'}</option>
              <option value="ABUSE">{lang === 'ar' ? 'إساءة أو مضايقة' : 'Abuse or harassment'}</option>
              <option value="CONFIDENTIAL">{lang === 'ar' ? 'معلومات سرية أو انتهاك للحقوق' : 'Confidential information or rights violation'}</option>
              <option value="MISLEADING">{lang === 'ar' ? 'محتوى مضلل أو احتيالي' : 'Misleading content or scam'}</option>
              <option value="OTHER">{lang === 'ar' ? 'سبب آخر' : 'Other'}</option>
            </select>
          </label>
          <label className="block space-y-2 text-xs font-bold"><span>{lang === 'ar' ? 'تفاصيل إضافية (اختياري)' : 'Additional details (optional)'}</span>
            <textarea value={details} onChange={event => setDetails(event.target.value)} maxLength={2000} rows={3} className="input-pixel w-full text-sm leading-relaxed" placeholder={lang === 'ar' ? 'اذكر ما يساعد الفريق على مراجعة المحتوى، دون إعادة نشر معلومات سرية.' : 'Add helpful context without repeating confidential information.'} />
          </label>
        </fieldset>
        {error && <p role="alert" className="text-xs text-[#E5432A]">{error}</p>}
        <div className="flex justify-end flex-wrap gap-3 pt-1">
          <button type="button" disabled={pending} onClick={onClose} className="btn-pixel-secondary px-4 py-2 rounded text-xs font-bold disabled:opacity-50">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" disabled={pending || !reason} className="btn-pixel-primary px-4 py-2 rounded text-xs font-bold disabled:opacity-50">{pending ? (lang === 'ar' ? 'جارٍ الإرسال…' : 'Sending…') : (lang === 'ar' ? 'إرسال البلاغ' : 'Send report')}</button>
        </div>
      </form>}
    </div>
  </dialog>;
}

function ReportAction(props: TargetProps) {
  const { lang, currentRole, openAuthModal } = useApp();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);
  return <>
    <button type="button" disabled={reported} onClick={() => currentRole === 'visitor' ? openAuthModal() : setOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[#5B5B7B] hover:text-[#0B2A9E] rounded px-1 py-1 disabled:opacity-60 disabled:cursor-default">
      {reported ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Flag className="w-3.5 h-3.5" />}{reported ? (lang === 'ar' ? 'تم الإبلاغ' : 'Reported') : (lang === 'ar' ? 'إبلاغ' : 'Report')}
    </button>
    {open && <ReportDialog {...props} onClose={() => setOpen(false)} onReported={() => setReported(true)} />}
  </>;
}

export function ReportButton(props: TargetProps) {
  const { currentUser } = useApp();
  return <ReportAction key={`${currentUser.id}:${props.targetType}:${props.targetId}`} {...props} />;
}
