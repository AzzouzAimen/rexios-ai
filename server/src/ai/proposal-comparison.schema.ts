import { createHash } from 'node:crypto';
import { z } from 'zod';

const text = z.string().trim().min(1).max(2000);
const localized = z.object({ ar: text, en: text });
export const comparisonSchema = z.object({
  summary: localized,
  entries: z.array(z.object({
    applicationId: z.string().min(1),
    reason: localized,
    strengths: z.array(localized).max(2),
    gaps: z.array(localized).max(2),
    question: localized,
    fit: z.enum(['strong', 'partial', 'limited']),
  })).min(2),
});
export type ProposalComparison = z.infer<typeof comparisonSchema>;
export type ComparisonContext = {
  challenge: { title: string; titleEn: string; summary: string; summaryEn: string; description: string; descriptionEn: string; deliverables: string[]; deliverablesEn: string[]; constraints: string[]; constraintsEn: string[]; criteria: string[]; criteriaEn: string[]; skills: string[]; budgetDzd: number; deadlineAt: string | null; status: string };
  proposals: { applicationId: string; text: string; textEn: string; deliveryDays: number; skills: string[] }[];
};
export const comparisonFingerprint = (input: ComparisonContext) => createHash('sha256').update(JSON.stringify(input)).digest('hex');

export function parseComparison(raw: string, ids: string[]): ProposalComparison {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const result = comparisonSchema.parse(JSON.parse(trimmed));
  const actual = result.entries.map(entry => entry.applicationId);
  if (actual.length !== ids.length || new Set(actual).size !== ids.length || actual.some(id => !ids.includes(id))) throw new Error('Each eligible proposal must appear exactly once.');
  return result;
}
