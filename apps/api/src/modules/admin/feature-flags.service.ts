import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if a feature flag is enabled for a given user.
   * Uses rollout percentage based on a hash of userId if rolloutPct < 100.
   */
  async isEnabled(key: string, userId?: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });

    if (!flag || !flag.enabled) return false;
    if (flag.rolloutPct >= 100) return true;
    if (flag.rolloutPct <= 0) return false;

    // Deterministic rollout via userId hash
    if (!userId) return false;

    const hash = createHash("md5").update(`${key}:${userId}`).digest("hex");
    const bucket = parseInt(hash.slice(0, 4), 16) % 100;
    return bucket < flag.rolloutPct;
  }

  /** Lists all feature flags. */
  async list() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  /** Creates or updates a feature flag. */
  async upsert(
    key: string,
    enabled: boolean,
    description?: string,
    rolloutPct = 100,
  ) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, description, rolloutPct },
      update: { enabled, description, rolloutPct },
    });
  }

  /** Deletes a feature flag. */
  async delete(key: string) {
    await this.prisma.featureFlag.delete({ where: { key } });
    return { deleted: true, key };
  }
}
