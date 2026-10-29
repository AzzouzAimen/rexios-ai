import { Body, Controller, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { AuthRequest, SessionGuard } from '../common/http';

const trimText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

class SupportRequestDto {
  @Transform(trimText) @IsString() @Length(1, 100) name!: string;
  @Transform(trimText) @IsEmail() @Length(3, 254) email!: string;
  @IsIn(['GENERAL', 'TECHNICAL', 'ACCOUNT', 'PRIVACY']) topic!: string;
  @Transform(trimText) @IsString() @Length(10, 8000) message!: string;
  @IsIn(['ar', 'en']) language!: 'ar' | 'en';
}

class ContentReportDto {
  @IsIn(['PROBLEM', 'QUESTION', 'ANSWER']) targetType!: 'PROBLEM' | 'QUESTION' | 'ANSWER';
  @Transform(trimText) @IsString() @Length(1, 150) targetId!: string;
  @IsIn(['SPAM', 'ABUSE', 'CONFIDENTIAL', 'MISLEADING', 'OTHER']) reason!: string;
  @IsOptional() @Transform(trimText) @IsString() @Length(1, 2000) details?: string;
  @IsIn(['ar', 'en']) language!: 'ar' | 'en';
}

@Controller('support')
export class SupportController {
  constructor(private readonly db: PrismaService) {}

  @Post('requests') async submit(@Body() body: SupportRequestDto) {
    const request = await this.db.supportRequest.create({ data: { ...body, email: body.email.toLowerCase() }, select: { id: true } });
    return { reference: request.id };
  }
}

@Controller('reports') @UseGuards(SessionGuard)
export class ReportsController {
  constructor(private readonly db: PrismaService) {}

  @Post() async submit(@Req() req: AuthRequest, @Body() body: ContentReportDto) {
    const { targetType, targetId } = body;
    let targetPath: string;
    if (targetType === 'PROBLEM') {
      const problem = await this.db.problem.findFirst({ where: { id: targetId, status: { not: 'DRAFT' } }, select: { id: true } });
      if (!problem) throw new NotFoundException(body.language === 'ar' ? 'هذا التحدي غير متاح.' : 'This challenge is unavailable.');
      targetPath = `/problems/${encodeURIComponent(targetId)}`;
    } else if (targetType === 'QUESTION') {
      const question = await this.db.communityQuestion.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!question) throw new NotFoundException(body.language === 'ar' ? 'هذا السؤال غير متاح.' : 'This question is unavailable.');
      targetPath = `/community/${encodeURIComponent(targetId)}`;
    } else {
      const answer = await this.db.communityAnswer.findUnique({ where: { id: targetId }, select: { questionId: true } });
      if (!answer) throw new NotFoundException(body.language === 'ar' ? 'هذه الإجابة غير متاحة.' : 'This answer is unavailable.');
      targetPath = `/community/${encodeURIComponent(answer.questionId)}#answer-${encodeURIComponent(targetId)}`;
    }
    const report = await this.db.contentReport.upsert({
      where: { reporterUserId_targetType_targetId: { reporterUserId: req.user.id, targetType, targetId } },
      update: {}, create: { ...body, details: body.details || '', reporterUserId: req.user.id, targetPath },
      select: { id: true },
    });
    return { reference: report.id };
  }
}
