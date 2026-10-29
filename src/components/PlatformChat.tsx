import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, MessageCircle, RotateCcw, Send, Square, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePlatformChat } from '../hooks/usePlatformChat';
import { MascotRex } from './MascotRex';
import { SmoothText } from './SmoothText';
import ShinyText from './reactbits/ShinyText';

function ChatWidget() {
  const { lang, dir, currentRole } = useApp();
  const { pathname } = useLocation();
  const chat = usePlatformChat(lang, pathname);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const panelId = useId();
  const headingId = useId();
  const ar = lang === 'ar';
  const starters = currentRole === 'company' ? [
    { ar: 'كيف أصيغ تحديًا بالذكاء الاصطناعي؟', en: 'How do I draft a challenge with AI?' },
    { ar: 'كيف أقارن المقترحات بالذكاء الاصطناعي؟', en: 'How do I compare proposals with AI?' },
    { ar: 'من يستطيع رؤية بيانات التحدي الخاصة؟', en: 'Who can see private challenge details?' },
  ] : currentRole === 'visitor' ? [
    { ar: 'كيف تعمل منصة Rexios؟', en: 'How does Rexios work?' },
    { ar: 'ما نوع الحساب الذي أحتاجه؟', en: 'Which account type do I need?' },
    { ar: 'ما ميزات الذكاء الاصطناعي المتاحة؟', en: 'What can the AI features do?' },
  ] : [
    { ar: 'كيف أكمل ملفي التقني؟', en: 'How do I complete my talent profile?' },
    { ar: 'كيف أقدم مقترحًا لتحدٍ؟', en: 'How do I submit a proposal?' },
    { ar: 'أين أتابع حالة طلبي؟', en: 'Where can I track my application?' },
  ];

  useEffect(() => {
    if (open && nearBottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [open, chat.turns]);
  function close() { setOpen(false); launcher.current?.focus(); }
  function ask(message: string, replaceId?: string) {
    nearBottom.current = true;
    void chat.send(message, replaceId);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || chat.busy) return;
    ask(draft); setDraft('');
    input.current?.focus();
  }

  return <div dir={dir} className="fixed z-40 end-4 sm:end-6 bottom-4 sm:bottom-6">
    {open && <section id={panelId} role="dialog" aria-modal="false" aria-labelledby={headingId}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}
      className="absolute end-0 bottom-16 w-[min(26rem,calc(100vw_-_2rem))] h-[min(40rem,calc(100dvh_-_7rem))] min-h-0 flex flex-col overflow-hidden bg-[#FFFBF1] border-2 border-[#12122B] rounded-lg shadow-pixel-m">
      <header className="flex items-center justify-between gap-3 p-4 border-b-2 border-[#12122B] bg-[#EEF1FF]">
        <div className="flex items-center gap-3 min-w-0"><div className="shrink-0"><MascotRex width={36} height={27} /></div><div><h2 id={headingId} className="font-bold text-sm text-[#12122B]">{ar ? 'اسأل Rexios' : 'Ask Rexios'}</h2><p className="text-[11px] text-[#5B5B7B]">{ar ? 'دليلك للمنصة · ذكاء اصطناعي' : 'Your platform guide · AI'}</p></div></div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => { chat.clear(); setDraft(''); input.current?.focus(); }} aria-label={ar ? 'محادثة جديدة' : 'New chat'} title={ar ? 'محادثة جديدة' : 'New chat'} className="p-2 rounded hover:bg-[#C9D3FF]"><RotateCcw className="w-4 h-4" /></button>
          <button type="button" onClick={close} aria-label={ar ? 'إغلاق المحادثة' : 'Close chat'} className="p-2 rounded hover:bg-[#C9D3FF]"><X className="w-4 h-4" /></button>
        </div>
      </header>
      <div ref={scroll} onScroll={() => { const node = scroll.current; if (node) nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-5">
        {!chat.turns.length && <div className="space-y-5 py-2">
          <div className="space-y-2"><h3 className="text-lg font-bold text-[#0B2A9E]">{ar ? 'بماذا أساعدك؟' : 'What would you like to do?'}</h3><p className="text-sm text-[#5B5B7B] leading-relaxed">{ar ? 'أساعدك على استكشاف التحديات وتقديم المقترحات واستخدام ميزات Rexios.' : 'I can guide you through challenges, proposals and Rexios features.'}</p></div>
          <div className="flex flex-col gap-3">{starters.map(item => <button key={item.en} type="button" onClick={() => ask(item[lang])} className="btn-pixel-secondary rounded px-3 py-3 text-start text-xs font-semibold leading-relaxed">{item[lang]}</button>)}</div>
        </div>}
        {chat.turns.map(turn => <div key={turn.id} className="space-y-3">
          <div className="flex justify-end"><p dir="auto" className="max-w-[90%] rounded-lg border border-[#12122B] bg-[#0B2A9E] text-[#FFFBF1] px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">{turn.question}</p></div>
          <div dir={turn.lang === 'ar' ? 'rtl' : 'ltr'} className="rounded-lg border border-[#DCCDAA] bg-[#F8F1E1] px-3 py-3 space-y-3">
            <p className="text-[10px] font-bold text-[#0B2A9E]">REXIOS AI</p>
            {turn.answer && <p className="text-sm leading-7 whitespace-pre-wrap break-words text-[#12122B]"><SmoothText text={turn.answer} streaming={turn.status === 'streaming'} /></p>}
            {turn.status === 'streaming' && <div role="status" className="text-xs"><ShinyText className="ai-drafting-shine" color="#0B2A9E" shineColor="#C9D3FF" text={chat.phase === 'retrieving' ? (ar ? 'جارٍ العثور على الإرشادات…' : 'Finding guidance…') : chat.phase === 'repairing' ? (ar ? 'جارٍ تحسين الرد…' : 'Refining reply…') : turn.answer ? (ar ? 'جارٍ الرد…' : 'Replying…') : (ar ? 'جارٍ التفكير…' : 'Thinking…')} /></div>}
            {turn.status === 'done' && turn.resources.length > 0 && <div className="flex flex-wrap gap-2">{turn.resources.map(resource => <Link key={resource.id} to={resource.path} className="inline-flex items-center gap-1.5 border border-[#0B2A9E] rounded bg-[#FFFBF1] px-2.5 py-1.5 text-xs font-semibold text-[#0B2A9E] hover:bg-[#EEF1FF]"><span>{resource.title}</span><ArrowUpRight className={`w-3 h-3 shrink-0 ${turn.lang === 'ar' ? '-rotate-90' : ''}`} /></Link>)}</div>}
            {(turn.status === 'error' || turn.status === 'stopped') && <div className="space-y-2">
              <p role={turn.status === 'error' ? 'alert' : 'status'} className="text-xs text-[#5B5B7B]">{turn.status === 'error' ? (ar ? 'لم يكتمل الرد. حاول مجددًا أو تواصل مع الدعم.' : 'The reply did not finish. Try again or contact support.') : (ar ? 'تم إيقاف الرد.' : 'Reply stopped.')}</p>
              <div className="flex flex-wrap gap-3 text-xs"><button type="button" disabled={chat.busy} onClick={() => ask(turn.question, turn.id)} className="font-bold text-[#0B2A9E] underline disabled:opacity-50">{ar ? 'إعادة المحاولة' : 'Retry'}</button>{turn.status === 'error' && <Link to="/support" className="text-[#0B2A9E] underline">{ar ? 'الدعم' : 'Support'}</Link>}</div>
            </div>}
          </div>
        </div>)}
      </div>
      <div className="p-3 sm:p-4 border-t border-[#DCCDAA] space-y-2 bg-[#FFFBF1]">
        {chat.busy && <button type="button" onClick={chat.stop} className="flex items-center gap-1.5 text-xs text-[#0B2A9E] font-semibold px-1 py-1"><Square className="w-3 h-3" />{ar ? 'إيقاف الرد' : 'Stop reply'}</button>}
        <form onSubmit={submit} className="flex items-end gap-2">
          <textarea ref={input} autoFocus value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={6000} aria-label={ar ? 'سؤالك عن Rexios' : 'Your question about Rexios'} placeholder={ar ? 'اسأل عن المنصة…' : 'Ask about Rexios…'} className="input-pixel min-w-0 flex-1 resize-none text-sm leading-relaxed" />
          <button type="submit" disabled={chat.busy || !draft.trim()} aria-label={ar ? 'إرسال السؤال' : 'Send question'} className="btn-pixel-primary p-3 rounded disabled:opacity-50"><Send className="w-4 h-4" /></button>
        </form>
        <p className="text-[10px] text-[#5B5B7B] leading-relaxed">{ar ? 'قد يخطئ الذكاء الاصطناعي. لا ترسل معلومات حساسة. تُمسح المحادثة عند تحديث الصفحة. ' : 'AI can make mistakes. Keep sensitive information out. Chat clears on refresh. '}<Link to="/privacy#ai" className="underline">{ar ? 'الخصوصية' : 'Privacy'}</Link></p>
      </div>
    </section>}
    <button ref={launcher} type="button" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => open ? close() : setOpen(true)} className="btn-pixel-accent inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold">
      {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}<span>{ar ? 'اسأل Rexios' : 'Ask Rexios'}</span>
      {!open && chat.busy && <span aria-label={ar ? 'جارٍ الرد' : 'Reply in progress'} className="w-2 h-2 rounded-full bg-[#0B2A9E] animate-pulse motion-reduce:animate-none" />}
    </button>
  </div>;
}

export function PlatformChat() {
  const { currentUser } = useApp();
  return <ChatWidget key={currentUser.id} />;
}
