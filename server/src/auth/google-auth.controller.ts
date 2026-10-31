import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { AuthRequest } from '../common/http';
import { presentUser } from '../common/present-user';
import { startSession } from './auth-session';
import { GoogleAuthService, GoogleEmailExistsError, publicAppOrigin, safeReturnTo, type GoogleAttempt } from './google-auth.service';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly google: GoogleAuthService) {}

  private failure(res: Response, code: string, attempt?: Pick<GoogleAttempt, 'intent' | 'accountType'>) {
    const url = new URL(attempt?.intent === 'signup' ? '/signup' : '/signin', publicAppOrigin());
    url.searchParams.set('google', code);
    if (attempt?.accountType === 'COMPANY') url.searchParams.set('account', 'company');
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }).redirect(url.href);
  }

  @Get()
  async start(@Req() req: AuthRequest, @Query() query: Record<string, unknown>, @Res() res: Response) {
    const intent = query.intent === 'signup' ? 'signup' : 'signin';
    const accountType = intent === 'signup' && query.accountType === 'COMPANY' ? 'COMPANY' : 'TALENT';
    try {
      const { attempt, url } = this.google.begin({ intent, accountType, returnTo: safeReturnTo(query.returnTo) });
      req.session.googleAttempt = attempt;
      await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
      res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }).redirect(url);
    } catch { this.failure(res, 'not_configured', { intent, accountType }); }
  }

  @Get('callback')
  async callback(@Req() req: AuthRequest, @Query() query: Record<string, unknown>, @Res() res: Response) {
    const attempt = req.session.googleAttempt;
    delete req.session.googleAttempt;
    await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    const state = typeof query.state === 'string' ? query.state : '';
    const matches = attempt && Buffer.byteLength(state) === Buffer.byteLength(attempt.state) && timingSafeEqual(Buffer.from(state), Buffer.from(attempt.state));
    if (!attempt || Date.now() - attempt.createdAt > 10 * 60000 || !matches) {
      this.failure(res, 'expired', attempt); return;
    }
    if (query.error) { this.failure(res, query.error === 'access_denied' ? 'cancelled' : 'failed', attempt); return; }
    if (typeof query.code !== 'string' || !query.code || query.code.length > 4096) { this.failure(res, 'failed', attempt); return; }
    try {
      const profile = await this.google.verifyCode(query.code, attempt);
      const { user, created } = await this.google.signIn(profile, attempt.accountType);
      await startSession(req, user.id);
      const role = presentUser(user).role;
      const fallback = role === 'company' ? '/company/problems' : role === 'solver' ? '/problems' : created ? '/welcome' : '/community';
      res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }).redirect(new URL(safeReturnTo(attempt.returnTo) || fallback, publicAppOrigin()).href);
    } catch (error) {
      // Provider responses, tokens and secrets never go into URLs or logs.
      this.failure(res, error instanceof GoogleEmailExistsError ? 'email_exists' : 'failed', attempt);
    }
  }
}
