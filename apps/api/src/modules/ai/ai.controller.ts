import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  // POST /api/v1/ai/ask – KI-Assistent (F-997)
  @Post('ask')
  @UseGuards(JwtAuthGuard)
  ask(@CurrentUser() userId: string, @Body('question') question: string) {
    return this.ai.askAssistant(question, userId);
  }

  // GET /api/v1/ai/works/:id/summary – KI-Zusammenfassung (F-998)
  @Get('works/:id/summary')
  summarize(@Param('id') id: string) {
    return this.ai.summarizeWork(id);
  }

  // GET /api/v1/ai/works/:id/critique – KI-Kritik (F-999)
  @Get('works/:id/critique')
  critique(@Param('id') id: string) {
    return this.ai.generateReview(id);
  }

  // GET /api/v1/ai/works/:id/translate – Übersetzung (F-915)
  @Get('works/:id/translate')
  translate(@Param('id') id: string, @Query('lang') lang: string) {
    return this.ai.translateDescription(id, lang ?? 'en');
  }
}
