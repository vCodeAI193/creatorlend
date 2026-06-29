import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAccess(workId: string, ip: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { geoBlock: true } });
    if (!work) return { allowed: true };
    if (!work.geoBlock || work.geoBlock.length === 0) return { allowed: true };
    // Stub: in prod use MaxMind GeoIP2 or Cloudflare-Country-Code header
    // For dev, we always allow but return the blocked countries list
    return { allowed: true, blockedCountries: work.geoBlock, note: 'GeoIP check bypassed in dev' };
  }

  async checkCountry(ip: string, countryCode: string) {
    // Stub: resolve country from IP using CF-IPCountry header in prod
    return { ip, resolvedCountry: countryCode || 'DE', note: 'GeoIP stub' };
  }
}
