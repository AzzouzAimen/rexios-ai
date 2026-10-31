import { Injectable } from '@nestjs/common';
import { OAuth2Client, CodeChallengeMethod, type TokenPayload } from 'google-auth-library';
import { createHash, randomBytes } from 'node:crypto';
import { isEmail } from 'class-validator';
import { hash } from 'bcryptjs';
import { PrismaService, accountInclude } from '../database/prisma.service';

export interface GoogleAttempt {
  state: string;
  nonce: string;
  verifier: string;
  createdAt: number;
  accountType: 'TALENT' | 'COMPANY';
  intent: 'signin' | 'signup';
  returnTo: string;
}
declare module 'express-session' { interface SessionData { googleAttempt?: GoogleAttempt } }

export function publicAppOrigin() {
  const url = new URL(process.env.APP_PUBLIC_URL?.trim() || (process.env.APP_ORIGIN || 'http://127.0.0.1:5173').split(',')[0].trim());
  if (url.username || url.password || !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Invalid public app URL.');
  return url.origin;
}

export function safeReturnTo(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048 || !/^\/(problems|community|company|profile|my-applications|welcome)(\/|\?|#|$)/.test(value) || value.includes('\\') || [...value].some(char => char.charCodeAt(0) <= 32)) return '';
  const url = new URL(value, publicAppOrigin());
  return url.origin === publicAppOrigin() ? url.pathname + url.search + url.hash : '';
}

function configuration() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Google sign-in is not configured.');
  const redirectUri = process.env.GOOGLE_CALLBACK_URL?.trim() || `${publicAppOrigin()}/api/auth/google/callback`;
  const callback = new URL(redirectUri);
  if (callback.origin !== publicAppOrigin() || callback.pathname !== '/api/auth/google/callback' || callback.search || callback.hash || callback.username || callback.password) throw new Error('Invalid Google callback URL.');
  return { clientId, clientSecret, redirectUri };
}

export class GoogleEmailExistsError extends Error {}

@Injectable()
export class GoogleAuthService {
  constructor(private readonly db: PrismaService) {}

  begin(input: Pick<GoogleAttempt, 'intent' | 'accountType' | 'returnTo'>) {
    const settings = configuration();
    const attempt: GoogleAttempt = {
      ...input, state: randomBytes(32).toString('base64url'), nonce: randomBytes(32).toString('base64url'),
      verifier: randomBytes(32).toString('base64url'), createdAt: Date.now(),
    };
    const client = new OAuth2Client(settings.clientId, settings.clientSecret, settings.redirectUri);
    const url = client.generateAuthUrl({
      scope: ['openid', 'email', 'profile'], response_type: 'code', prompt: 'select_account',
      state: attempt.state, nonce: attempt.nonce, code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: createHash('sha256').update(attempt.verifier).digest('base64url'),
    });
    return { attempt, url };
  }

  async verifyCode(code: string, attempt: GoogleAttempt) {
    const settings = configuration();
    const client = new OAuth2Client({ clientId: settings.clientId, clientSecret: settings.clientSecret, redirectUri: settings.redirectUri, transporterOptions: { timeout: 15000, retry: false } });
    const { tokens } = await client.getToken({ code, codeVerifier: attempt.verifier, redirect_uri: settings.redirectUri });
    if (!tokens.id_token) throw new Error('Google returned no identity.');
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: settings.clientId });
    const profile = ticket.getPayload() as (TokenPayload & { nonce?: string }) | undefined;
    if (!profile || profile.nonce !== attempt.nonce || !profile.sub || profile.email_verified !== true || !profile.email || !isEmail(profile.email)) throw new Error('Invalid Google identity.');
    return profile;
  }

  async signIn(profile: TokenPayload, accountType: GoogleAttempt['accountType']) {
    const email = profile.email!.trim().toLowerCase();
    const linked = await this.db.user.findUnique({ where: { googleSubject: profile.sub }, include: accountInclude });
    if (linked) return { user: linked, created: false };
    const existing = await this.db.user.findUnique({ where: { email }, include: accountInclude });
    if (existing) {
      // Google is authoritative for Gmail and verified Workspace addresses.
      if (existing.googleSubject || !(email.endsWith('@gmail.com') || profile.hd)) throw new GoogleEmailExistsError();
      await this.db.user.updateMany({ where: { id: existing.id, googleSubject: null }, data: { googleSubject: profile.sub } });
      const user = await this.db.user.findUniqueOrThrow({ where: { id: existing.id }, include: accountInclude });
      if (user.googleSubject !== profile.sub) throw new GoogleEmailExistsError();
      return { user, created: false };
    }
    const name = (profile.name || profile.email!.split('@')[0]).trim().slice(0, 100) || 'Rexios member';
    const firstName = (profile.given_name || '').slice(0, 100);
    const lastName = (profile.family_name || '').slice(0, 100);
    const user = await this.db.user.create({ data: {
      email, googleSubject: profile.sub, passwordHash: await hash(randomBytes(32).toString('hex'), 12), role: accountType,
      displayName: name, displayNameEn: name,
      ...(accountType === 'COMPANY' ? { company: { create: { name, nameEn: name } } }
        : { talent: { create: { skills: [], firstName, firstNameEn: firstName, lastName, lastNameEn: lastName } } }),
    }, include: accountInclude });
    return { user, created: true };
  }
}
