import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { FeatureFlagsService } from "./feature-flags.service";

@Injectable()
export class AbTestingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async getVariant(userId: string, testKey: string): Promise<string | null> {
    const flagEnabled = await this.featureFlags.isEnabled(`ab_test_${testKey}`, userId);
    if (!flagEnabled) return null;

    const existing = await this.prisma.abTestAssignment.findUnique({
      where: { userId_testKey: { userId, testKey } },
    });
    if (existing) return existing.variant;

    const hash = createHash("md5").update(`${userId}:${testKey}`).digest("hex");
    const bucket = parseInt(hash.slice(0, 4), 16) % 2;
    const variant = bucket === 0 ? "A" : "B";

    await this.prisma.abTestAssignment.create({ data: { userId, testKey, variant } });
    return variant;
  }

  async listAssignments(userId: string) {
    return this.prisma.abTestAssignment.findMany({
      where: { userId },
      orderBy: { assignedAt: "desc" },
    });
  }

  async createTest(testKey: string, description?: string) {
    return this.featureFlags.upsert(`ab_test_${testKey}`, true, description ?? `A/B test: ${testKey}`);
  }

  async getTestResults(testKey: string) {
    const assignments = await this.prisma.abTestAssignment.findMany({
      where: { testKey },
      select: { variant: true, userId: true },
    });
    const variantCounts: Record<string, number> = {};
    for (const a of assignments) {
      variantCounts[a.variant] = (variantCounts[a.variant] ?? 0) + 1;
    }
    return { testKey, totalAssignments: assignments.length, variants: variantCounts };
  }

  async listTests() {
    return this.prisma.featureFlag.findMany({
      where: { key: { startsWith: "ab_test_" } },
      orderBy: { createdAt: "desc" },
    });
  }
}
