import { SupabaseClient } from '@supabase/supabase-js';
import { readCmsData } from '../services/supabase';

const SITE_URL = 'https://probitian.ai.studio';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

export function generateRobotsTxt(): string {
  return `# ProBitian Search Engine Directives
User-agent: *
Allow: /
Allow: /learn
Allow: /projects
Allow: /blog
Allow: /about
Allow: /contact
Allow: /privacy
Allow: /terms
Allow: /power-bi-demo

# Disallow internal administrative and API endpoints
Disallow: /admin
Disallow: /admin/
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

export async function generateSitemapXml(supabase: SupabaseClient | null): Promise<string> {
  const staticUrls: SitemapUrl[] = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/learn`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${SITE_URL}/projects`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${SITE_URL}/blog`, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${SITE_URL}/privacy`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/terms`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/power-bi-demo`, changefreq: 'weekly', priority: '0.8' }
  ];

  const dynamicUrls: SitemapUrl[] = [];

  // Fetch blogs
  if (supabase) {
    try {
      const { data: blogs } = await supabase
        .from('blogs')
        .select('slug, id, updated_at, created_at')
        .eq('status', 'published');

      if (Array.isArray(blogs)) {
        for (const blog of blogs) {
          const slug = blog.slug || blog.id;
          const lastmod = blog.updated_at || blog.created_at;
          dynamicUrls.push({
            loc: `${SITE_URL}/blog/${slug}`,
            lastmod: lastmod ? new Date(lastmod).toISOString().split('T')[0] : undefined,
            changefreq: 'weekly',
            priority: '0.8'
          });
        }
      }
    } catch (e) {
      console.warn('[Sitemap] Supabase blog query failed, falling back:', e);
    }
  }

  if (dynamicUrls.length === 0) {
    try {
      const cmsData = readCmsData();
      const fallbackBlogs = (cmsData.blogs || []).filter((b: any) => b.status === 'published' || !b.status);
      for (const blog of fallbackBlogs) {
        const slug = blog.slug || blog.id;
        const lastmod = blog.updated_at || blog.created_at || blog.date;
        dynamicUrls.push({
          loc: `${SITE_URL}/blog/${slug}`,
          lastmod: lastmod ? new Date(lastmod).toISOString().split('T')[0] : undefined,
          changefreq: 'weekly',
          priority: '0.8'
        });
      }
    } catch {
      // In production where local JSON fallback is disabled and Supabase has no blogs yet, serve static URLs
    }
  }

  const allUrls: SitemapUrl[] = [...staticUrls, ...dynamicUrls];

  const xmlEntries = allUrls.map(url => {
    return `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
}
