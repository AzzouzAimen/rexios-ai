import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { MascotRex } from '../components/MascotRex';
import { AlertCircle } from 'lucide-react';
import { apiErrorMessage } from '../api/client';
import type { AccountType } from '../api/contracts';
import { googleSignInError, googleSignInUrl } from '../api/auth';
import { PasswordInput } from '../components/PasswordInput';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

export const SignUpPage: React.FC = () => {
  const { lang, signup } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState<AccountType>(() => new URLSearchParams(location.search).get('account') === 'company' ? 'COMPANY' : 'TALENT');
  const [busy, setBusy] = useState(false);
  const googleError = googleSignInError(new URLSearchParams(location.search).get('google'), lang);
  const continueWithGoogle = () => {
    if (!termsAccepted) {
      setError(lang === 'ar' ? 'يجب الموافقة على شروط الاستخدام للمتابعة' : 'You must agree to the terms to proceed');
      return;
    }
    window.location.assign(googleSignInUrl('signup', accountType, (location.state as { from?: string } | null)?.from));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError(
        lang === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح'
          : 'Please enter a valid email address'
      );
      return;
    }

    if (password.length < 8 || !/\d/.test(password)) {
      setError(
        lang === 'ar'
          ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن رقمًا واحدًا'
          : 'Password must be at least 8 characters and include a digit'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        lang === 'ar'
          ? 'كلمتا المرور غير متطابقتين'
          : 'Passwords do not match'
      );
      return;
    }

    if (!termsAccepted) {
      setError(
        lang === 'ar'
          ? 'يجب الموافقة على شروط الاستخدام للمتابعة'
          : 'You must agree to the terms to proceed'
      );
      return;
    }

    const displayName = name.trim();
    setBusy(true);
    try {
      const user = await signup(displayName, email, password, accountType);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || (user.role === 'company' ? '/company/problems' : '/welcome'), { replace: true });
    } catch (apiError) {
      setError(apiErrorMessage(apiError, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 card-pixel overflow-hidden">
        <div className="md:col-span-5 bg-[#0B2A9E] text-[#FFFBF1] p-8 flex flex-col justify-between border-b-2 md:border-b-0 md:border-e-2 border-[#12122B]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#FFFBF1] border border-[#12122B] rounded">
              <MascotRex width={28} height={21} />
            </div>
            <span className="font-brand text-xl font-bold tracking-tight text-[#FFFBF1]">
              REXIOS AI
            </span>
          </div>

          <div className="my-10 flex flex-col items-center text-center">
            <div className="p-4 bg-[#1B3FC4] border-2 border-[#FFFBF1] rounded-lg shadow-pixel-s mb-6">
              <MascotRex width={80} height={60} />
            </div>
            <h2 className="text-xl font-bold mb-3">
              {lang === 'ar' ? 'انضم إلى منصة Rexios AI' : 'Join the Rexios AI platform'}
            </h2>
            <p className="text-xs text-[#C9D3FF] leading-relaxed max-w-xs">
              {lang === 'ar'
                ? 'اربط احتياجات شركتك بالمواهب التقنية، أو اعرض مهاراتك من خلال حل تحديات حقيقية.'
                : 'Connect your company’s needs with technical talent, or demonstrate your skills through real challenges.'}
            </p>
          </div>

          <div className="text-[11px] text-[#C9D3FF] text-center">
            {lang === 'ar'
              ? 'مشروع تخرج منصة Thirduni — 2026'
              : 'Thirduni Graduation Project — 2026'}
          </div>
        </div>

        <div className="md:col-span-7 bg-[#FFFBF1] p-6 sm:p-10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <span className="font-brand text-xs font-bold text-[#5B5B7B] uppercase">
              {lang === 'ar' ? 'حساب Rexios' : 'Rexios Account'}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[#12122B] mb-1">
              {lang === 'ar' ? 'أنشئ حسابك' : 'Create your account'}
            </h1>
            <p className="text-xs text-[#5B5B7B] mb-6">
              {lang === 'ar' ? 'أنشئ حساب مواهب أو شركة للبدء.' : 'Create a talent or company account to get started.'}
            </p>

            <GoogleAuthButton lang={lang} disabled={busy} onClick={continueWithGoogle} />
            <p className="text-[11px] text-[#5B5B7B] -mt-2 mb-4">{lang === 'ar' ? 'يُستخدم نوع الحساب المحدد أدناه عند إنشاء حساب جديد عبر Google.' : 'New Google accounts use the account type selected below.'}</p>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-0.5 bg-[#DCCDAA]" />
              <span className="text-[11px] font-semibold text-[#5B5B7B]">
                {lang === 'ar' ? 'أو بالبريد الإلكتروني' : 'or with email'}
              </span>
              <div className="flex-1 h-0.5 bg-[#DCCDAA]" />
            </div>

            {(error || googleError) && (
              <div role="alert" className="p-3 bg-[#FFE3DC] border-2 border-[#E5432A] rounded-md text-xs text-[#E5432A] font-semibold flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error || googleError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#12122B] mb-1">
                  {lang === 'ar' ? 'الاسم الكامل *' : 'Full name *'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: أمين بن علي' : 'e.g. Amine Ben Ali'}
                  className="w-full input-pixel text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12122B] mb-1">
                  {lang === 'ar' ? 'البريد الإلكتروني *' : 'Email address *'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full input-pixel text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12122B] mb-1">
                  {lang === 'ar' ? 'نوع الحساب *' : 'Account type *'}
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-full input-pixel text-xs bg-[#FFFBF1]"
                >
                  <option value="TALENT">{lang === 'ar' ? 'موهبة / خبير حلول' : 'Talent / Solver'}</option>
                  <option value="COMPANY">{lang === 'ar' ? 'شركة' : 'Company'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12122B] mb-1">
                  {lang === 'ar' ? 'كلمة المرور *' : 'Password *'}
                </label>
                <PasswordInput
                  lang={lang}
                  aria-label={lang === 'ar' ? 'كلمة المرور' : 'Password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full input-pixel text-xs"
                  required
                />
                <p className="text-[11px] text-[#5B5B7B] mt-1">
                  {lang === 'ar'
                    ? '8 أحرف على الأقل، تتضمن رقمًا واحدًا'
                    : 'At least 8 characters including a digit'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12122B] mb-1">
                  {lang === 'ar' ? 'تأكيد كلمة المرور *' : 'Confirm password *'}
                </label>
                <PasswordInput
                  lang={lang}
                  aria-label={lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full input-pixel text-xs"
                  required
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer mt-1 select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-[#0B2A9E]"
                />
                <span className="text-xs text-[#5B5B7B]">
                  {lang === 'ar' ? 'أوافق على ' : 'I agree to the '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#0B2A9E] underline">{lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}</Link>
                  {lang === 'ar' ? ' و' : ' and '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0B2A9E] underline">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 mt-2 rounded-md font-bold text-xs btn-pixel-accent cursor-pointer"
              >
                {busy ? (lang === 'ar' ? 'جارٍ إنشاء الحساب…' : 'Creating account…') : (lang === 'ar' ? 'إنشاء حساب' : 'Create account')}
              </button>
            </form>
          </div>

          <div className="pt-6 text-center text-xs text-[#5B5B7B]">
            <span>{lang === 'ar' ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}</span>
            <Link to="/signin" state={location.state} className="font-bold text-[#0B2A9E] underline">
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
