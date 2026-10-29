import { Body, Controller, Get, HttpException, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthRequest, SessionGuard } from '../common/http';
import { ProposalComparisonService } from './proposal-comparison.service';
import { AiUnavailableError } from './featherless.client';
import { ComparisonOutputError } from './proposal-comparison.graph';
import { IsIn } from 'class-validator';

class CompareDto { @IsIn(['ar', 'en']) lang!: 'ar' | 'en'; }
@Controller('company/problems/:id/proposal-comparison') @UseGuards(SessionGuard)
export class ProposalComparisonController {
  constructor(private readonly comparison: ProposalComparisonService) {}
  @Get() get(@Req() req: AuthRequest, @Param('id') id: string) { return this.comparison.get(req.user, id); }

  @Post('stream')
  async stream(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: CompareDto, @Res() res: Response) {
    // Ownership is checked before streaming or contacting inference.
    await this.comparison.snapshot(req.user, id);
    const controller = new AbortController();
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    const timeout = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 180000;
    const timer = setTimeout(() => controller.abort(), timeout);
    const heartbeat = setInterval(() => { if (!res.destroyed) res.write(': keepalive\n\n'); }, 15000);
    res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' }).flushHeaders();
    const send = (event: unknown) => { if (!res.destroyed && !controller.signal.aborted) res.write(`event: comparison\ndata: ${JSON.stringify(event)}\n\n`); };
    try {
      const result = await this.comparison.generate(req.user, id, body.lang, { signal: controller.signal, progress: send });
      send({ type: 'complete', result });
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : error instanceof AiUnavailableError ? 503 : error instanceof ComparisonOutputError ? 422 : controller.signal.aborted ? 504 : [429, 503].includes((error as { status?: number })?.status || 0) ? 503 : 502;
      const message = error instanceof HttpException ? error.message : body.lang === 'ar' ? 'تعذر إكمال المقارنة. يمكنك إعادة المحاولة أو متابعة المراجعة يدويًا.' : 'Could not complete the comparison. Retry or continue reviewing manually.';
      if (!res.destroyed) res.write(`event: comparison\ndata: ${JSON.stringify({ type: 'error', status, message })}\n\n`);
    } finally { clearTimeout(timer); clearInterval(heartbeat); res.off('close', disconnect); res.end(); }
  }
}
