import { z } from 'zod';
import guide from './knowledge/platform-guide.json';

export const chatGuide = guide;
export type ChatContext = { role: 'VISITOR' | 'TALENT' | 'COMPANY'; page: string };
export type ChatResource = { id: string; title: string; path: string };
export type ChatResult = { answer: string; resources: ChatResource[] };
const text = z.string().trim().min(1).max(6000);
const requestSchema = z.object({
  message: text,
  lang: z.enum(['ar', 'en']),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: text }).strict()).max(12).default([]),
  page: z.string().max(300).default('/'),
}).strict().refine(input => input.history.length % 2 === 0 && input.history.every((entry, index) => entry.role === (index % 2 ? 'assistant' : 'user')), { message: 'History must contain completed user/assistant exchanges.' });
export type ChatRequest = z.infer<typeof requestSchema>;
export const parseChatRequest = (value: unknown) => requestSchema.parse(value);
const sourceIds = new Set(guide.sections.map(section => section.id));
const answerSchema = z.object({
  answer: z.string().trim().min(1).max(6000),
  sourceIds: z.array(z.string().refine(id => sourceIds.has(id))).max(3),
}).strict();

export function parseChatAnswer(raw: string, lang: 'ar' | 'en'): ChatResult {
  const value = answerSchema.parse(JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')));
  const paths = new Set<string>();
  const resources = value.sourceIds.flatMap(id => {
    const section = guide.sections.find(section => section.id === id)!;
    if (paths.has(section.path)) return [];
    paths.add(section.path);
    return [{ id, title: section.title[lang], path: section.path }];
  });
  return { answer: value.answer, resources };
}

export function normalizeChatPage(path: string): string {
  if (guide.sections.some(section => section.path === path) || path === '/') return path;
  if (/^\/problems\/[^/?#]+\/submit$/.test(path)) return '/problems/:id/submit';
  if (/^\/problems\/[^/?#]+$/.test(path)) return '/problems/:id';
  if (/^\/community\/[^/?#]+$/.test(path)) return '/community/:id';
  const company = /^\/company\/problems\/[^/?#]+\/(edit|applications)$/.exec(path);
  return company ? `/company/problems/:id/${company[1]}` : 'unknown';
}
