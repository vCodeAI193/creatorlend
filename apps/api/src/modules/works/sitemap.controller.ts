import { Controller, Get, Header } from '@nestjs/common';
import { SitemapService } from './sitemap.service';

@Controller()
export class SitemapController {
  constructor(private readonly sitemap: SitemapService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  getSitemap() {
    return this.sitemap.generate();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobots() {
    return 'User-agent: *\nAllow: /\nDisallow: /api/v1/admin\nSitemap: https://creatorlend.io/sitemap.xml';
  }
}
