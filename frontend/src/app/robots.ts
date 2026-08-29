import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/history', '/settings', '/billing', '/api/'],
    },
    sitemap: 'https://repurposer.blueoxjobs.eu/sitemap.xml',
  };
}
