import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  // F-997: KI-Assistent (stub)
  async askAssistant(question: string, userId?: string): Promise<{ answer: string; sources: string[] }> {
    // In production: call Claude API or similar
    return {
      answer: `Das ist eine Antwort auf: "${question}". (KI-Assistent ist derzeit ein Stub – echte Implementierung folgt.)`,
      sources: ['help-center', 'platform-docs'],
    };
  }

  // F-998: Automatische Hörbuch-Zusammenfassung (stub)
  async summarizeWork(workId: string): Promise<{ workId: string; summary: string; generatedAt: Date }> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { id: true, title: true, description: true },
    });
    if (!work) return { workId, summary: 'Werk nicht gefunden.', generatedAt: new Date() };
    // In production: call an AI summarization API
    const summary = work.description
      ? `${work.title}: ${work.description.slice(0, 200)}${work.description.length > 200 ? '…' : ''}`
      : `${work.title} – keine Beschreibung verfügbar.`;
    return { workId, summary, generatedAt: new Date() };
  }

  // F-999: KI-generierte Kurzkritik (stub)
  async generateReview(workId: string): Promise<{ workId: string; critique: string; generatedAt: Date }> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { title: true, category: true },
    });
    if (!work) return { workId, critique: 'Werk nicht gefunden.', generatedAt: new Date() };
    return {
      workId,
      critique: `"${work.title}" ist ein ${work.category ?? 'Werk'}, das durch seine einzigartige Perspektive besticht. Besonders empfehlenswert für Hörer:innen, die Originalität schätzen. (KI-Stub)`,
      generatedAt: new Date(),
    };
  }

  // F-915: Automatische Übersetzung von Beschreibungen (stub)
  async translateDescription(workId: string, targetLang: string): Promise<{ workId: string; targetLang: string; translation: string }> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { description: true },
    });
    return {
      workId,
      targetLang,
      translation: work?.description
        ? `[${targetLang.toUpperCase()}-Übersetzung stub]: ${work.description.slice(0, 100)}`
        : '[Keine Beschreibung]',
    };
  }
}
