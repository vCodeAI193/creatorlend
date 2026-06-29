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

  // F-823: PWA Web App Manifest
  @Get('manifest.webmanifest')
  @Header('Content-Type', 'application/manifest+json')
  getManifest() {
    return {
      name: 'CreatorLend',
      short_name: 'CreatorLend',
      description: 'Audiobooks and music for conscious listeners',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#1a1a2e',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    };
  }
}
