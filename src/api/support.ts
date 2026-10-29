import { ApiError, apiRequest } from './client';
import type { Language } from '../types';

export type SupportTopic = 'GENERAL' | 'TECHNICAL' | 'ACCOUNT' | 'PRIVACY';
export type ReportTarget = 'PROBLEM' | 'QUESTION' | 'ANSWER';
export type ReportReason = 'SPAM' | 'ABUSE' | 'CONFIDENTIAL' | 'MISLEADING' | 'OTHER';
export type SubmissionReceipt = { reference: string };

export const sendSupportRequest = (input: { name: string; email: string; topic: SupportTopic; message: string; language: Language }) =>
  apiRequest<SubmissionReceipt>('/support/requests', { method: 'POST', body: JSON.stringify(input) });

export const reportContent = (input: { targetType: ReportTarget; targetId: string; reason: ReportReason; details?: string; language: Language }) =>
  apiRequest<SubmissionReceipt>('/reports', { method: 'POST', body: JSON.stringify(input) });

export function supportErrorMessage(error: unknown, lang: Language) {
  const status = error instanceof ApiError ? error.status : -1;
  if (status === 401) return lang === 'ar' ? 'انتهت جلستك. سجل الدخول ثم حاول مجددًا.' : 'Your session has ended. Sign in and try again.';
  if (status === 404) return lang === 'ar' ? 'هذا المحتوى لم يعد متاحًا. حدّث الصفحة وحاول مجددًا.' : 'This content is no longer available. Refresh the page and try again.';
  if (status === 400) return lang === 'ar' ? 'تحقق من الحقول المطلوبة وطول النص ثم حاول مجددًا.' : 'Check the required fields and text length, then try again.';
  return lang === 'ar' ? 'تعذر الإرسال. تحقق من الاتصال وحاول مجددًا؛ لم تُفقد رسالتك.' : 'Could not submit. Check your connection and try again; your text is still here.';
}
