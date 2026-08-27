import React, { useEffect, useState } from 'react';
import { cmsService } from '../services/cmsService';
import { SeoSettings, BlogArticle, NavPage } from '../types';
import { PROBITIAN_LOGO_URL } from '../constants/branding';
import { CANONICAL_SITE_URL, getPageCanonicalUrl } from '../lib/routing';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOProps {
  title?: string;
  description?: string;
  page?: NavPage;
  slug?: string | null;
  pageUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'blog';
  robots?: string;
  keywords?: string;
  article?: Partial<BlogArticle> | null;
  breadcrumbs?: BreadcrumbItem[];
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  page = 'home',
  slug,
  pageUrl,
  ogImage,
  ogType = 'website',
  robots,
  keywords,
  article,
  breadcrumbs,
}) => {
  const [cmsSeo, setCmsSeo] = useState<SeoSettings | null>(null);
  const [contactEmail, setContactEmail] = useState<string>('probitianofficial@gmail.com');

  useEffect(() => {
    cmsService.getSeoSettings().then((data) => {
      if (data) {
        setCmsSeo(data);
      }
    }).catch((err) => {
      console.warn('Could not fetch CMS SEO settings:', err);
    });

    cmsService.getGeneralSettings().then((g) => {
      if (g?.contact_email) {
        setContactEmail(g.contact_email);
      }
    }).catch(() => {});
  }, []);

  // Compute clean, normalized canonical URL without hash, query params, or duplicate slashes
  const canonicalUrl = pageUrl 
    ? pageUrl.split('?')[0].split('#')[0] 
    : getPageCanonicalUrl(page, slug);

  // Derive final values
  const defaultTitle = cmsSeo?.meta_title || 'ProBItian | Master Business Intelligence, Power BI & SQL';
  const defaultDesc = cmsSeo?.meta_description || 'Master Power BI, SQL, Excel, Power Query, AI Tools, and Dashboard Design through practical projects and industry-focused tutorials.';
  
  const finalTitle = title || (article?.metaTitle || article?.title ? `${article.metaTitle || article.title} | ProBItian Blog` : defaultTitle);
  const finalDesc = description || (article?.metaDescription || article?.excerpt ? (article.metaDescription || article.excerpt) : defaultDesc);
  const finalOgImage = ogImage || article?.imageUrl || cmsSeo?.og_image || `${CANONICAL_SITE_URL}/banner.svg`;
  const finalKeywords = keywords || cmsSeo?.keywords || 'Power BI, SQL, Excel, Business Intelligence, Data Analytics, DAX, Power Query, AI Tools';
  const finalTwitterHandle = cmsSeo?.twitter_handle || '@probitian';

  // Robots directive (fail-closed for 404 or admin, or unpublished drafts)
  let computedRobots = robots;
  if (!computedRobots) {
    if (page === 'admin' || page === '404' || (article && article.status && article.status !== 'published')) {
      computedRobots = 'noindex, nofollow';
    } else {
      computedRobots = cmsSeo?.robots_txt?.includes('User-agent') ? 'index, follow' : (cmsSeo?.robots_txt || 'index, follow');
    }
  }

  useEffect(() => {
    // Document Title
    document.title = finalTitle;

    // Helper to set or create meta tags
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to set property meta tags
    const setPropertyMeta = (property: string, content: string) => {
      setMetaTag(`meta[property="${property}"]`, 'property', property, content);
    };

    // Standard Search Engine Meta
    setMetaTag('meta[name="description"]', 'name', 'description', finalDesc);
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', finalKeywords);
    setMetaTag('meta[name="robots"]', 'name', 'robots', computedRobots);

    // Open Graph Metadata
    setPropertyMeta('og:site_name', 'ProBItian');
    setPropertyMeta('og:title', finalTitle);
    setPropertyMeta('og:description', finalDesc);
    setPropertyMeta('og:image', finalOgImage);
    setPropertyMeta('og:url', canonicalUrl);
    setPropertyMeta('og:type', article ? 'article' : ogType);

    // Twitter Card Metadata
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', finalTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', finalDesc);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', finalOgImage);
    setMetaTag('meta[name="twitter:site"]', 'name', 'twitter:site', finalTwitterHandle);

    // Canonical link tag
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [finalTitle, finalDesc, finalOgImage, finalKeywords, computedRobots, canonicalUrl, ogType, finalTwitterHandle, article]);

  // Structured Data Schemas
  const schemas: any[] = [
    // 1. Primary Educational Organization Schema
    {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      '@id': `${CANONICAL_SITE_URL}/#organization`,
      name: 'ProBItian',
      url: `${CANONICAL_SITE_URL}/`,
      logo: {
        '@type': 'ImageObject',
        url: cmsSeo?.og_image || PROBITIAN_LOGO_URL,
      },
      sameAs: [
        'https://youtube.com/@probitian',
        'https://instagram.com/probitian',
        'https://facebook.com/probitian',
        'https://github.com/probitian',
        'https://x.com/Probitian',
        'https://www.linkedin.com/company/probitian/',
      ],
      description: finalDesc,
      founder: {
        '@type': 'Person',
        name: 'Shivam Singh',
        email: contactEmail,
      },
      knowsAbout: ['Power BI', 'SQL', 'Excel', 'Power Query', 'DAX', 'Business Intelligence', 'Data Analytics', 'AI Tools'],
    }
  ];

  // 2. WebSite Schema (on Home page)
  if (page === 'home') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${CANONICAL_SITE_URL}/#website`,
      url: `${CANONICAL_SITE_URL}/`,
      name: 'ProBItian',
      description: 'Master Business Intelligence, Power BI & SQL with Practical Projects',
      publisher: {
        '@id': `${CANONICAL_SITE_URL}/#organization`,
      },
    });
  }

  // 3. BreadcrumbList Schema
  const activeBreadcrumbs: BreadcrumbItem[] = breadcrumbs || (
    page === 'home' ? [] : [
      { name: 'Home', url: `${CANONICAL_SITE_URL}/` },
      { 
        name: page.charAt(0).toUpperCase() + page.slice(1), 
        url: `${CANONICAL_SITE_URL}/${page}` 
      },
      ...(article ? [{ name: article.title || 'Article', url: canonicalUrl }] : [])
    ]
  );

  if (activeBreadcrumbs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: activeBreadcrumbs.map((crumb, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    });
  }

  // 4. Article Schema (for blog articles)
  if (article && page === 'blog') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title || finalTitle,
      description: article.excerpt || article.metaDescription || finalDesc,
      image: article.imageUrl || finalOgImage,
      datePublished: article.date || '2026-08-15',
      dateModified: article.date || '2026-08-15',
      author: {
        '@type': 'Person',
        name: article.author || 'Shivam Singh',
      },
      publisher: {
        '@type': 'Organization',
        name: 'ProBItian',
        url: `${CANONICAL_SITE_URL}/`,
        logo: {
          '@type': 'ImageObject',
          url: PROBITIAN_LOGO_URL,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
      },
      keywords: article.category ? `${article.category}, ${article.tags?.join(', ') || 'Business Intelligence'}` : undefined,
    });
  }

  return (
    <React.Fragment>
      {schemas.map((schema, i) => (
        <script
          key={`schema-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      ))}
    </React.Fragment>
  );
};
