import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Flag, Send, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InfoPage } from '../components/InfoPage';
import { sendSupportRequest, supportErrorMessage, type SupportTopic } from '../api/support';

function SupportForm() {
  const { lang, currentUser, currentRole } = useApp();
  const signedIn = currentRole !== 'visitor';
  const [name, setName] = useState(signedIn ? (lang === 'ar' ? currentUser.name : currentUser.name_en) : '');
  const [email, setEmail] = useState(signedIn ? currentUser.email : '');
  const [topic, setTopic] = useState<SupportTopic>('GENERAL');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    if (!name.trim() || message.trim().length < 10) {
      setError(lang === 'ar' ? 'أدخل اسمك ورسالة من 10 أحرف على الأقل.' : 'Enter your name and a message of at least 10 characters.');
      return;
    }
    setPending(true);
    try {
      const receipt = await sendSupportRequest({ name: name.trim(), email: email.trim(), topic, message: message.trim(), language: lang });
      setReference(receipt.reference);
      setMessage('');
    } catch (err) { setError(supportErrorMessage(err, lang)); }
    finally { setPending(false); }
  }

  if (reference) return <div className="card-pixel bg-[#FFFBF1] p-6 sm:p-8 space-y-4" role="status">
    <CheckCircle2 className="w-9 h-9 text-[#1E9E5A]" />
    <h2 className="text-xl font-bold">{lang === 'ar' ? 'وصلت رسالتك' : 'Message received'}</h2>
    <p className="text-sm text-[#5B5B7B] leading-relaxed">{lang === 'ar' ? 'حُفظت رسالتك لفريق Rexios. احتفظ بهذا المرجع للمتابعة.' : 'Your message has been saved for the Rexios team. Keep this reference for follow-up.'}</p>
    <p className="text-xs text-[#5B5B7B]">{lang === 'ar' ? 'مرجع الطلب' : 'Request reference'}</p>
    <p dir="ltr" className="font-num text-xs break-all bg-[#EEF1FF] border border-[#C9D3FF] rounded p-3 select-all">{reference}</p>
    <button type="button" onClick={() => setReference('')} className="btn-pixel-secondary px-4 py-2 rounded text-xs font-bold">{lang === 'ar' ? 'إرسال رسالة أخرى' : 'Send another message'}</button>
  </div>;

  return <form onSubmit={event => void submit(event)} className="card-pixel bg-[#FFFBF1] p-5 sm:p-8 space-y-5">
    <h2 className="text-lg font-bold">{lang === 'ar' ? 'أرسل لنا رسالة' : 'Send us a message'}</h2>
    <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-2 text-xs font-bold"><span>{lang === 'ar' ? 'الاسم' : 'Name'}</span>
          <input name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} className="input-pixel w-full text-sm" />
        </label>
        <label className="block space-y-2 text-xs font-bold"><span>{lang === 'ar' ? 'بريد الرد' : 'Reply email'}</span>
          <input name="email" type="email" autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} className="input-pixel w-full text-sm" />
        </label>
      </div>
      <label className="block space-y-2 text-xs font-bold"><span>{lang === 'ar' ? 'الموضوع' : 'Topic'}</span>
        <select value={topic} onChange={e => setTopic(e.target.value as SupportTopic)} className="input-pixel w-full text-sm">
          <option value="GENERAL">{lang === 'ar' ? 'استفسار عام' : 'General question'}</option>
          <option value="TECHNICAL">{lang === 'ar' ? 'مشكلة تقنية' : 'Technical issue'}</option>
          <option value="ACCOUNT">{lang === 'ar' ? 'مساعدة بشأن الحساب' : 'Account help'}</option>
          <option value="PRIVACY">{lang === 'ar' ? 'الخصوصية والبيانات' : 'Privacy & data'}</option>
        </select>
      </label>
      <label className="block space-y-2 text-xs font-bold"><span>{lang === 'ar' ? 'الرسالة' : 'Message'}</span>
        <textarea name="message" value={message} onChange={e => setMessage(e.target.value)} required minLength={10} maxLength={8000} rows={6} className="input-pixel w-full text-sm leading-relaxed" placeholder={lang === 'ar' ? 'كيف يمكننا مساعدتك؟ إذا واجهت مشكلة، اذكر الصفحة وما حدث.' : 'How can we help? For an issue, include the page and what happened.'} />
      </label>
      <p className="text-xs text-[#5B5B7B] leading-relaxed">{lang === 'ar' ? 'لا ترسل كلمات مرور أو مفاتيح API أو معلومات سرية. تُستخدم هذه البيانات لمعالجة طلبك. ' : 'Do not include passwords, API keys or confidential information. These details are used to handle your request. '}<Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0B2A9E] underline">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link></p>
    </fieldset>
    {error && <p role="alert" className="text-sm text-[#E5432A]">{error}</p>}
    <button type="submit" disabled={pending} className="btn-pixel-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded text-sm font-bold disabled:opacity-60"><Send className="w-4 h-4" />{pending ? (lang === 'ar' ? 'جارٍ الإرسال…' : 'Sending…') : (lang === 'ar' ? 'إرسال الرسالة' : 'Send message')}</button>
  </form>;
}

export function SupportPage() {
  const { lang, currentUser } = useApp();
  return <InfoPage title={lang === 'ar' ? 'التواصل والدعم' : 'Contact & Support'} description={lang === 'ar' ? 'لديك سؤال أو تواجه مشكلة؟ أرسل رسالة إلى فريق Rexios.' : 'Have a question or run into a problem? Send a message to the Rexios team.'}>
    <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 items-start">
      <SupportForm key={currentUser.id} />
      <aside className="space-y-5">
        <div className="card-pixel bg-[#EEF1FF] p-5 space-y-3"><Flag className="w-6 h-6 text-[#0B2A9E]" /><h2 className="text-sm font-bold">{lang === 'ar' ? 'الإبلاغ عن محتوى' : 'Report content'}</h2><p className="text-xs text-[#5B5B7B] leading-relaxed">{lang === 'ar' ? 'افتح التحدي أو السؤال أو الإجابة واختر «إبلاغ» لربط البلاغ بالمحتوى مباشرة.' : 'Open the challenge, question or answer and choose Report to link your report directly to the content.'}</p></div>
        <div className="card-pixel bg-[#FFFBF1] p-5 space-y-3"><ShieldCheck className="w-6 h-6 text-[#0B2A9E]" /><h2 className="text-sm font-bold">{lang === 'ar' ? 'حسابك وبياناتك' : 'Your account & data'}</h2><p className="text-xs text-[#5B5B7B] leading-relaxed">{lang === 'ar' ? 'لطلب الوصول إلى بياناتك أو تصحيحها أو حذفها، اختر «الخصوصية والبيانات». يتعامل الفريق مع الطلبات يدويًا.' : 'To request access, correction or deletion of your data, choose Privacy & data. The team handles these requests manually.'}</p></div>
      </aside>
    </div>
  </InfoPage>;
}
