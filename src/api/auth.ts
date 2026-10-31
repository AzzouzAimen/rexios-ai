import { apiRequest } from './client';
import type { AccountType, ApiUser } from './contracts';
import type { Language } from '../types';

export function googleSignInUrl(intent: 'signin' | 'signup', accountType: AccountType, returnTo?: string) {
  const query = new URLSearchParams({ intent, accountType });
  if (returnTo) query.set('returnTo', returnTo);
  return `/api/auth/google?${query}`;
}

export function googleSignInError(code: string | null, lang: Language) {
  if (!code) return '';
  const messages: Record<string, { ar: string; en: string }> = {
    not_configured: { ar: 'تسجيل الدخول عبر Google غير جاهز بعد. استخدم البريد وكلمة المرور حاليًا.', en: 'Google sign-in is not configured yet. Please use email and password for now.' },
    cancelled: { ar: 'تم إلغاء تسجيل الدخول عبر Google. يمكنك المحاولة مجددًا.', en: 'Google sign-in was cancelled. You can try again.' },
    expired: { ar: 'انتهت محاولة تسجيل الدخول. اضغط المتابعة عبر Google مجددًا.', en: 'This sign-in attempt expired. Please start Google sign-in again.' },
    email_exists: { ar: 'يوجد حساب بهذا البريد. سجّل الدخول باستخدام كلمة المرور الحالية.', en: 'An account already uses this email. Please sign in with its existing password.' },
    failed: { ar: 'تعذر تسجيل الدخول عبر Google. حاول مجددًا أو استخدم البريد وكلمة المرور.', en: 'Google sign-in could not finish. Try again or use email and password.' },
  };
  return (messages[code] || messages.failed)[lang];
}

export const getCurrentUser = () => apiRequest<ApiUser>('/auth/me');
export const login = (email: string, password: string) =>
  apiRequest<ApiUser>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const register = (name: string, email: string, password: string, accountType: AccountType) =>
  apiRequest<ApiUser>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, accountType }) });
export const logout = () => apiRequest<void>('/auth/logout', { method: 'POST' });
