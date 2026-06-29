import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** F-550: Reading/Listening Challenge. */
@Injectable()
export class ReadingChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async setGoal(userId: string, goalCount: number, year: number) {
    return this.prisma.readingChallenge.upsert({
      where: { userId },
      create: { userId, goalCount, year, completedCount: 0 },
      update: { goalCount, year },
    });
  }

  async getChallenge(userId: string) {
    return this.prisma.readingChallenge.findUnique({ where: { userId } });
  }

  async increment(userId: string) {
    try {
      const challenge = await this.prisma.readingChallenge.findUnique({ where: { userId } });
      if (!challenge) return;
      await this.prisma.readingChallenge.update({
        where: { userId },
        data: { completedCount: { increment: 1 } },
      });
    } catch {
      // non-critical
    }
  }
}
