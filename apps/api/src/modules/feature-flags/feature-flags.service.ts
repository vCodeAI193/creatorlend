import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  // F-743: Feature-Flag abrufen (mit optionalem Rollout-Check)
  async isEnabled(key: string, userId?: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag || !flag.enabled) return false;
    if (flag.rolloutPct >= 100) return true;
    if (!userId) return false;
    // Deterministic hash for rollout
    const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return (hash % 100) < flag.rolloutPct;
  }

  async listFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async getFlag(key: string) {
    return this.prisma.featureFlag.findUnique({ where: { key } });
  }

  async upsertFlag(key: string, enabled: boolean, description?: string, rolloutPct?: number) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, ...(description !== undefined && { description }), ...(rolloutPct !== undefined && { rolloutPct }) },
      create: { key, enabled, description, rolloutPct: rolloutPct ?? 100 },
    });
  }

  async deleteFlag(key: string) {
    return this.prisma.featureFlag.delete({ where: { key } });
  }

  // F-970: Bulk flags for frontend (F-970)
  async getFlagsForUser(userId: string): Promise<Record<string, boolean>> {
    const flags = await this.prisma.featureFlag.findMany({ where: { enabled: true } });
    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.key] = await this.isEnabled(flag.key, userId);
    }
    return result;
  }
}
