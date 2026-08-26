import { NavPage, BlogArticle } from '../types';

export const CANONICAL_SITE_URL = 'https://probitian.ai.studio';

/**
 * Normalizes an article or topic title into a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns a standardized slug for a blog article.
 */
export function getBlogSlug(article: Partial<BlogArticle>): string {
  if (article.slug && article.slug.trim()) {
    return slugify(article.slug);
  }
  if (article.title && article.title.trim()) {
    return slugify(article.title);
  }
  return article.id || 'article';
}

/**
 * Constructs an absolute canonical URL for a given page and optional slug.
 * Ensures no hashes, query parameters, or duplicate trailing slashes.
 */
export function getPageCanonicalUrl(page: NavPage | string = 'home', slug?: string | null): string {
  if (page === 'home' || page === '') {
    return `${CANONICAL_SITE_URL}/`;
  }
  if (page === 'blog' && slug && slug.trim()) {
    const cleanSlug = slugify(slug);
    return `${CANONICAL_SITE_URL}/blog/${cleanSlug}`;
  }
  return `${CANONICAL_SITE_URL}/${page}`;
}

export interface ParsedRoute {
  page: NavPage;
  slug: string | null;
  isLegacyHash: boolean;
  targetCanonicalPath: string;
}

/**
 * Parses pathname and hash into a typed route object.
 */
export function parseRoute(pathname: string = window.location.pathname, hash: string = window.location.hash): ParsedRoute {
  let isLegacyHash = false;
  let rawPath = pathname.toLowerCase().trim();

  // Check for legacy hash routes (e.g., /#/about or #/blog/some-slug or #about)
  if (hash && hash.startsWith('#')) {
    const hashClean = hash.replace(/^#\/?/, '').trim();
    if (hashClean) {
      rawPath = '/' + hashClean;
      isLegacyHash = true;
    }
  }

  // Strip trailing slashes unless root
  if (rawPath.length > 1 && rawPath.endsWith('/')) {
    rawPath = rawPath.slice(0, -1);
  }

  if (rawPath === '' || rawPath === '/') {
    return { page: 'home', slug: null, isLegacyHash, targetCanonicalPath: '/' };
  }

  const segments = rawPath.split('/').filter(Boolean);
  const rootSegment = segments[0];

  switch (rootSegment) {
    case 'about':
      return { page: 'about', slug: null, isLegacyHash, targetCanonicalPath: '/about' };
    case 'projects':
      return { page: 'projects', slug: null, isLegacyHash, targetCanonicalPath: '/projects' };
    case 'blog': {
      if (segments.length > 1) {
        const slug = slugify(segments.slice(1).join('-'));
        return { page: 'blog', slug, isLegacyHash, targetCanonicalPath: `/blog/${slug}` };
      }
      return { page: 'blog', slug: null, isLegacyHash, targetCanonicalPath: '/blog' };
    }
    case 'learn':
    case 'courses':
      return { page: 'learn', slug: null, isLegacyHash, targetCanonicalPath: '/learn' };
    case 'contact':
      return { page: 'contact', slug: null, isLegacyHash, targetCanonicalPath: '/contact' };
    case 'privacy':
    case 'privacy-policy':
      return { page: 'privacy', slug: null, isLegacyHash, targetCanonicalPath: '/privacy' };
    case 'terms':
    case 'terms-of-service':
      return { page: 'terms', slug: null, isLegacyHash, targetCanonicalPath: '/terms' };
    case 'admin':
      return { page: 'admin', slug: null, isLegacyHash, targetCanonicalPath: '/admin' };
    case '404':
      return { page: '404', slug: null, isLegacyHash, targetCanonicalPath: '/404' };
    default:
      return { page: '404', slug: null, isLegacyHash, targetCanonicalPath: rawPath };
  }
}
