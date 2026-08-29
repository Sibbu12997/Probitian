import fs from 'fs';
import path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { readCmsData } from '../services/supabase';
import { escapeHtml } from '../security/sanitizer';

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogType: string;
  ogImage: string;
  jsonLd: Record<string, any> | Record<string, any>[];
  preRenderedHtml: string;
  httpStatus?: number;
}

const SITE_URL = 'https://probitian.ai.studio';
const DEFAULT_OG_IMAGE = `${SITE_URL}/banner.svg`;
const DEFAULT_LOGO = `${SITE_URL}/logo.svg`;

export function parseValidIsoDate(val: any): string | undefined {
  if (!val || (typeof val !== 'string' && !(val instanceof Date))) return undefined;
  const str = typeof val === 'string' ? val.trim() : val.toISOString();
  if (!str) return undefined;
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export async function getRouteSeo(
  urlPath: string,
  supabase: SupabaseClient | null
): Promise<SeoMetadata> {
  const cleanPath = urlPath.split('?')[0].replace(/\/+$/, '') || '/';

  // 1. Admin Portal -> strictly noindex, nofollow
  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
    return {
      title: 'Admin Control Center — ProBitian CMS & CRM',
      description: 'ProBitian secure administrative control center for content management, B2B leads CRM, and platform analytics.',
      canonicalUrl: `${SITE_URL}/admin`,
      robots: 'noindex, nofollow',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {},
      preRenderedHtml: '<div id="admin-root"><header><h1>ProBitian Admin Control Center</h1></header><p>Administrative access required.</p></div>',
      httpStatus: 200
    };
  }

  // 2. Dynamic Blog Article (/blog/:slug)
  if (cleanPath.startsWith('/blog/')) {
    const slug = cleanPath.replace('/blog/', '').trim();
    let blogArticle: any = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .eq('status', 'published')
          .maybeSingle();

        if (!error && data) {
          blogArticle = data;
        }
      } catch (err) {
        console.warn('[SEO] Supabase blog lookup error:', err);
      }
    }

    if (!blogArticle) {
      try {
        const cmsData = readCmsData();
        blogArticle = (cmsData.blogs || []).find((b: any) => 
          (b.slug === slug || b.id === slug) && (b.status === 'published' || !b.status)
        );
      } catch {
        // In production where local fallback is disabled, blogArticle remains null (triggers 404 response)
      }
    }

    if (blogArticle) {
      const title = `${blogArticle.title} | ProBitian`;
      const description = blogArticle.excerpt || blogArticle.meta_description || 'Master Business Intelligence, DAX, Power BI, and SQL analytics with in-depth technical guides from ProBitian.';
      const articleUrl = `${SITE_URL}/blog/${blogArticle.slug || blogArticle.id}`;
      const imageUrl = blogArticle.image_url || blogArticle.imageUrl || DEFAULT_OG_IMAGE;
      const rawPublishedDate = blogArticle.published_at || blogArticle.created_at || blogArticle.date;
      const datePublished = parseValidIsoDate(rawPublishedDate);
      const rawModifiedDate = blogArticle.updated_at;
      const dateModified = parseValidIsoDate(rawModifiedDate);

      const jsonLd: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': blogArticle.title,
        'description': description,
        'image': [imageUrl],
        'author': {
          '@type': 'Person',
          'name': blogArticle.author || 'Shivam Singh',
          'url': `${SITE_URL}/about`
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'ProBitian',
          'logo': {
            '@type': 'ImageObject',
            'url': DEFAULT_LOGO
          }
        },
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': articleUrl
        }
      };

      if (datePublished) {
        jsonLd.datePublished = datePublished;
      }

      if (dateModified) {
        jsonLd.dateModified = dateModified;
      }

      const timeTag = datePublished
        ? `<time datetime="${escapeHtml(datePublished)}">${escapeHtml(new Date(datePublished).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}</time> • `
        : '';

      const preRenderedHtml = `
        <article class="probitian-article">
          <header>
            <span class="category-badge">${escapeHtml(blogArticle.category || 'Business Intelligence')}</span>
            <h1>${escapeHtml(blogArticle.title)}</h1>
            <div class="article-meta">
              <span>By ${escapeHtml(blogArticle.author || 'Shivam Singh')}</span> • 
              ${timeTag}<span>${escapeHtml(blogArticle.read_time || blogArticle.readTime || '5 min read')}</span>
            </div>
          </header>
          <div class="article-excerpt">
            <p>${escapeHtml(blogArticle.excerpt || '')}</p>
          </div>
          <div class="article-body">
            ${escapeHtml(blogArticle.content || '')}
          </div>
        </article>
      `;

      return {
        title,
        description,
        canonicalUrl: articleUrl,
        robots: 'index, follow',
        ogType: 'article',
        ogImage: imageUrl,
        jsonLd,
        preRenderedHtml,
        httpStatus: 200
      };
    } else {
      // Blog article not found -> 404
      return {
        title: 'Article Not Found | ProBitian',
        description: 'The requested technical article could not be found on ProBitian.',
        canonicalUrl: `${SITE_URL}${cleanPath}`,
        robots: 'noindex, nofollow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {},
        preRenderedHtml: '<main><h1>404 — Article Not Found</h1><p>The requested Business Intelligence article does not exist or has been moved.</p><a href="/blog">Browse All Articles</a></main>',
        httpStatus: 404
      };
    }
  }

  // 3. Known Public Routes
  switch (cleanPath) {
    case '/':
      return {
        title: 'ProBitian — Business Intelligence & Data Analytics Platform',
        description: 'Master Power BI, Advanced DAX, SQL Querying, and Python Analytics with hands-on projects, course curriculums, and real-world dashboards by Shivam Singh.',
        canonicalUrl: `${SITE_URL}/`,
        robots: 'index, follow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              '@id': `${SITE_URL}/#website`,
              'url': `${SITE_URL}/`,
              'name': 'ProBitian',
              'description': 'Business Intelligence & Data Analytics Learning Ecosystem',
              'publisher': {
                '@id': `${SITE_URL}/#organization`
              }
            },
            {
              '@type': 'EducationalOrganization',
              '@id': `${SITE_URL}/#organization`,
              'name': 'ProBitian',
              'url': `${SITE_URL}/`,
              'logo': DEFAULT_LOGO,
              'founder': {
                '@type': 'Person',
                'name': 'Shivam Singh',
                'jobTitle': 'Senior Business Intelligence Developer & Founder'
              },
              'sameAs': [
                'https://x.com/Probitian',
                'https://www.linkedin.com/company/probitian/'
              ]
            }
          ]
        },
        preRenderedHtml: `
          <main class="probitian-home">
            <section class="hero">
              <h1>Master Business Intelligence & Data Analytics</h1>
              <p>Accelerate your data career with hands-on Power BI dashboards, advanced DAX modeling, SQL performance tuning, and resume-ready portfolio projects.</p>
              <div class="cta-group">
                <a href="/learn">Start Learning</a>
                <a href="/projects">Explore Projects</a>
              </div>
            </section>
            <section class="pillars">
              <h2>Core Skill Pillars</h2>
              <ul>
                <li>Power BI & DAX Mastery</li>
                <li>SQL Query Optimization & Data Modeling</li>
                <li>Advanced Excel & Financial Analytics</li>
                <li>AI Tools for Modern Data Professionals</li>
              </ul>
            </section>
          </main>
        `,
        httpStatus: 200
      };

    case '/about':
      return {
        title: 'About Shivam Singh & ProBitian — Mission & Platform',
        description: 'Learn about Shivam Singh and the mission behind ProBitian: empowering data professionals with practical Business Intelligence, Power BI, and SQL skills.',
        canonicalUrl: `${SITE_URL}/about`,
        robots: 'index, follow',
        ogType: 'profile',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Person',
          'name': 'Shivam Singh',
          'jobTitle': 'Senior Business Intelligence Developer & Founder',
          'worksFor': {
            '@type': 'Organization',
            'name': 'ProBitian'
          },
          'url': `${SITE_URL}/about`,
          'sameAs': [
            'https://x.com/Probitian',
            'https://www.linkedin.com/company/probitian/'
          ]
        },
        preRenderedHtml: `
          <main class="probitian-about">
            <h1>About Shivam Singh & ProBitian</h1>
            <p>ProBitian is a Business Intelligence and Data Analytics learning platform built to bridge the gap between academic theory and production-grade enterprise dashboarding.</p>
            <h2>Founder Biography</h2>
            <p>Shivam Singh is a Senior Business Intelligence Developer specializing in scalable DAX architecture, star schema design, SQL data pipelines, and executive KPI reporting.</p>
          </main>
        `,
        httpStatus: 200
      };

    case '/projects':
      return {
        title: 'Real-World Power BI & SQL Portfolio Projects | ProBitian',
        description: 'Explore production-grade Power BI dashboards, SQL datasets, live interactive reports, and KPI trackers built with enterprise data modeling best practices.',
        canonicalUrl: `${SITE_URL}/projects`,
        robots: 'index, follow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          'name': 'Power BI & SQL Portfolio Projects',
          'description': 'Production-grade enterprise BI dashboard projects with live demos and downloadable datasets.',
          'url': `${SITE_URL}/projects`
        },
        preRenderedHtml: `
          <main class="probitian-projects">
            <h1>Business Intelligence Portfolio Projects</h1>
            <p>Explore real-world enterprise dashboard projects featuring Power BI, SQL data transformations, DAX calculations, and interactive analytics.</p>
          </main>
        `,
        httpStatus: 200
      };

    case '/blog':
      return {
        title: 'Business Intelligence, DAX & SQL Articles | ProBitian Blog',
        description: 'Read in-depth technical guides, DAX formula tutorials, star schema design patterns, and BI career roadmaps by Shivam Singh.',
        canonicalUrl: `${SITE_URL}/blog`,
        robots: 'index, follow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          'name': 'ProBitian Technical Blog',
          'description': 'Business Intelligence, DAX, and SQL analytics engineering tutorials.',
          'url': `${SITE_URL}/blog`
        },
        preRenderedHtml: `
          <main class="probitian-blog">
            <h1>Business Intelligence Technical Blog</h1>
            <p>Master DAX patterns, SQL optimization, and enterprise dashboard architecture with step-by-step technical guides.</p>
          </main>
        `,
        httpStatus: 200
      };

    case '/learn':
    case '/courses':
      return {
        title: 'Learn Power BI, SQL & Data Analytics Courses | ProBitian',
        description: 'Structured courses and video tutorials covering beginner to advanced Power BI, DAX modeling, SQL performance tuning, and Excel analytics.',
        canonicalUrl: `${SITE_URL}/learn`,
        robots: 'index, follow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Course',
          'name': 'Power BI & Business Intelligence Masterclass',
          'description': 'Comprehensive hands-on training for Business Intelligence developers and data analysts.',
          'provider': {
            '@type': 'Organization',
            'name': 'ProBitian',
            'sameAs': `${SITE_URL}/`
          }
        },
        preRenderedHtml: `
          <main class="probitian-learn">
            <h1>Learn Business Intelligence & Analytics</h1>
            <p>Comprehensive video courses, downloadable datasets, and practical exercises designed for data professionals.</p>
          </main>
        `,
        httpStatus: 200
      };

    case '/contact':
      return {
        title: 'Contact Shivam Singh | ProBitian Community Hub',
        description: 'Get in touch for Business Intelligence consulting, course inquiries, corporate workshops, or mentorship collaborations.',
        canonicalUrl: `${SITE_URL}/contact`,
        robots: 'index, follow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          'name': 'Contact ProBitian',
          'url': `${SITE_URL}/contact`
        },
        preRenderedHtml: `
          <main class="probitian-contact">
            <h1>Contact ProBitian & Shivam Singh</h1>
            <p>Have questions about courses, dashboard projects, or corporate BI consulting? Send a message directly.</p>
          </main>
        `,
        httpStatus: 200
      };

    case '/privacy':
    case '/privacy-policy':
      return {
        title: 'Privacy Policy | ProBitian',
        description: 'ProBitian privacy policy outlining data collection, security safeguards, cookie usage, and user privacy rights.',
        canonicalUrl: `${SITE_URL}/privacy`,
        robots: 'index, follow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          'name': 'ProBitian Privacy Policy',
          'url': `${SITE_URL}/privacy`
        },
        preRenderedHtml: `
          <main class="probitian-legal">
            <h1>Privacy Policy</h1>
            <p>ProBitian is committed to protecting your personal information and respecting your data privacy.</p>
          </main>
        `,
        httpStatus: 200
      };

    case '/terms':
    case '/terms-of-service':
      return {
        title: 'Terms of Service | ProBitian',
        description: 'Terms of service and learner agreement governing access to ProBitian courses, datasets, and digital assets.',
        canonicalUrl: `${SITE_URL}/terms`,
        robots: 'index, follow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          'name': 'ProBitian Terms of Service',
          'url': `${SITE_URL}/terms`
        },
        preRenderedHtml: `
          <main class="probitian-legal">
            <h1>Terms of Service</h1>
            <p>Guidelines and terms for accessing ProBitian courses, software tutorials, and portfolio projects.</p>
          </main>
        `,
        httpStatus: 200
      };

    default:
      // Unknown route -> 404 Not Found with strict noindex, nofollow
      return {
        title: '404 - Page Not Found | ProBitian',
        description: 'The requested page could not be found on ProBitian.',
        canonicalUrl: `${SITE_URL}${cleanPath}`,
        robots: 'noindex, nofollow',
        ogType: 'website',
        ogImage: DEFAULT_OG_IMAGE,
        jsonLd: {},
        preRenderedHtml: `
          <main class="probitian-404">
            <h1>404 — Page Not Found</h1>
            <p>The page you are looking for does not exist or has been moved.</p>
            <a href="/">Return to Home</a>
          </main>
        `,
        httpStatus: 404
      };
  }
}

export function injectSeoIntoHtml(rawHtml: string, seo: SeoMetadata): string {
  let html = rawHtml;

  // 1. Replace <title>
  if (html.includes('<title>')) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  } else {
    html = html.replace('</head>', `<title>${escapeHtml(seo.title)}</title>\n</head>`);
  }

  // 2. Build metadata tags
  const metaTags = [
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:type" content="${escapeHtml(seo.ogType)}" />`,
    `<meta property="og:image" content="${escapeHtml(seo.ogImage)}" />`,
    `<meta property="og:site_name" content="ProBitian" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(seo.ogImage)}" />`,
    `<meta name="twitter:site" content="@Probitian" />`
  ];

  if (seo.jsonLd && Object.keys(seo.jsonLd).length > 0) {
    metaTags.push(`<script type="application/ld+json">\n${JSON.stringify(seo.jsonLd, null, 2)}\n</script>`);
  }

  // Remove existing redundant static meta tags
  html = html.replace(/<meta name="description" content="[^"]*"[^>]*>/gi, '');
  html = html.replace(/<meta name="robots" content="[^"]*"[^>]*>/gi, '');
  html = html.replace(/<link rel="canonical" href="[^"]*"[^>]*>/gi, '');
  html = html.replace(/<meta property="og:[^"]*" content="[^"]*"[^>]*>/gi, '');
  html = html.replace(/<meta name="twitter:[^"]*" content="[^"]*"[^>]*>/gi, '');

  // Inject meta tags before </head>
  html = html.replace('</head>', `  ${metaTags.join('\n  ')}\n</head>`);

  // 3. Inject crawlable fallback HTML inside <div id="root">
  if (seo.preRenderedHtml && html.includes('<div id="root"></div>')) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${seo.preRenderedHtml}</div>`
    );
  }

  return html;
}
