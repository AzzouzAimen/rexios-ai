import type { Problem } from '../types';

export function isChallengeOpen(problem: Pick<Problem, 'status' | 'deadlineAt'>, now = Date.now()) {
  return problem.status === 'OPEN' && (!problem.deadlineAt || new Date(problem.deadlineAt).getTime() > now);
}
