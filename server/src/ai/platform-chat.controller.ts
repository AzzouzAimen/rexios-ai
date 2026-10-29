import { BadRequestException, Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { AiUnavailableError, createFeatherlessModel } from './featherless.client';
import { ChatOutputError, generatePlatformChat } from './platform-chat';
import { normalizeChatPage, parseChatRequest } from './platform-chat.schema';

function setting(name: string, fallback: number, min: number) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value >= min && value <= 2147483647 ? value : fallback;
}

@Controller('ai/platform-chat')
export class PlatformChatController {
  constructor(private readonly db: PrismaService) {}

  @Post('stream') async stream(@Req() req: Request, @Body() body: unknown, @Res() res: Response) {
    let input;
    try { input = parseChatRequest(body); }
    catch { throw new BadRequestException(typeof body === 'object' && body !== null && 'lang' in body && body.lang === 'ar' ? 'اكتب سؤالًا غير فارغ وتحقق من سجل المحادثة.' : 'Enter a nonempty question and valid completed conversation history.'); }
    // Only the account type is needed. Never load/send identity, files or domain records.
    const user = req.session.userId ? await this.db.user.findUnique({ where: { id: req.session.userId }, select: { role: true } }) : null;
    const context = { role: user?.role || 'VISITOR' as const, page: normalizeChatPage(input.page) };
    const abort = new AbortController();
    const disconnect = () => { if (!res.writableEnded) abort.abort(); };
    res.on('close', disconnect);
    const timeout = setTimeout(() => abort.abort(), setting('AI_REQUEST_TIMEOUT_MS', 180000, 1));
    res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' }).flushHeaders();
    const send = (event: unknown) => { if (!res.destroyed) res.write(`event: chat\ndata: ${JSON.stringify(event)}\n\n`); };
    const heartbeat = setInterval(() => { if (!res.destroyed) res.write(': keepalive\n\n'); }, 15000);
    try {
      const result = await generatePlatformChat(input, context, createFeatherlessModel(), {
        signal: abort.signal, maxRepairs: setting('AI_MAX_REPAIR_ATTEMPTS', 2, 0),
        progress: event => { if (!abort.signal.aborted) send(event); },
      });
      send({ type: 'complete', result });
    } catch (error) {
      const providerStatus = (error as { status?: number })?.status;
      const status = error instanceof AiUnavailableError ? 503 : error instanceof ChatOutputError ? 422 : abort.signal.aborted ? 504 : providerStatus === 429 || providerStatus === 503 ? 503 : 502;
      const message = input.lang === 'ar' ? 'تعذر إكمال الرد. حاول مجددًا أو تواصل مع فريق الدعم.' : 'Could not finish the reply. Try again or contact support.';
      send({ type: 'error', status, message });
    } finally {
      clearTimeout(timeout); clearInterval(heartbeat); res.off('close', disconnect);
      if (!res.writableEnded) res.end();
    }
  }
}
