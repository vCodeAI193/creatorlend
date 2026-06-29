import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const [works, artists] = await Promise.all([
      this.prisma.work.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, updatedAt: true },
      }),
      this.prisma.user.findMany({
        where: { role: 'ARTIST', deletedAt: null },
        select: { id: true, slug: true, updatedAt: true },
      }),
    ]);
    const base = 'https://creatorlend.io';
    const urls: string[] = [];
    for (const w of works) {
      urls.push(`  <url><loc>${base}/works/${w.id}</loc><lastmod>${w.updatedAt.toISOString().split('T')[0]}</lastmod></url>`);
    }
    for (const a of artists) {
      const path = a.slug ? `/artists/${a.slug}` : `/artists/${a.id}`;
      urls.push(`  <url><loc>${base}${path}</loc><lastmod>${a.updatedAt.toISOString().split('T')[0]}</lastmod></url>`);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  }
}
