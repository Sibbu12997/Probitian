import { useEffect, useMemo } from 'react';
import { NavPage, BlogArticle } from '../../types';
import { trackPageView } from '../../lib/analytics';

export interface PageSeoMeta {
  title: string;
  description: string;
  robots?: string;
}

export function getPageTitle(currentPage: NavPage, selectedBlog: BlogArticle | null): string {
  if (currentPage === 'blog' && selectedBlog) {
    return `${selectedBlog.metaTitle || selectedBlog.title} | ProBItian Blog`;
  }
  switch (currentPage) {
    case 'about': return 'About ProBItian | Learn Data, Build Skills, Grow Your Career';
    case 'projects': return 'Portfolio Projects & BI Dashboards | ProBItian';
    case 'blog': return 'Data Analytics Blog & DAX Guides | ProBItian';
    case 'learn': return 'Learn Power BI, SQL, Excel & AI Analytics | ProBItian';
    case 'contact': return 'Contact Shivam Singh | ProBItian Community Hub';
    case 'privacy': return 'Privacy Policy | ProBItian Data Protection';
    case 'terms': return 'Terms of Service | ProBItian';
    case 'power-bi-demo': return 'Live Interactive Power BI Demo | ProBitian';
    case 'admin': return 'Admin CMS Portal | ProBItian';
    case '404': return 'Page Not Found (404) | ProBItian';
    default: return 'ProBItian | Master Business Intelligence, Power BI & SQL';
  }
}

export function getPageDescription(currentPage: NavPage, selectedBlog: BlogArticle | null): string {
  if (currentPage === 'blog' && selectedBlog) {
    return selectedBlog.metaDescription || selectedBlog.excerpt;
  }
  switch (currentPage) {
    case 'about': return 'Learn about ProBItian\'s mission to deliver practical, production-grade Business Intelligence education, career mentorship, and dashboard design skills.';
    case 'projects': return 'Explore real-world Business Intelligence portfolio dashboards built with Power BI, SQL Server, DAX time intelligence, and Power Query ETL.';
    case 'blog': return 'In-depth technical tutorials on Power BI calculation groups, advanced DAX formulas, SQL window functions, Power Query M optimizations, and analytics career tips.';
    case 'learn': return 'Step-by-step learning pathways covering Power BI enterprise mastery, SQL relational querying, Advanced Excel dataflows, and DAX modeling.';
    case 'contact': return 'Get in touch with ProBItian for data analytics inquiries, enterprise BI consultations, course support, or community collaboration.';
    case 'privacy': return 'Read ProBItian\'s privacy policy, data protection standards, cookie policies, and personal information handling practices.';
    case 'terms': return 'Review the terms and conditions governing access to ProBItian educational tutorials, portfolio code assets, and learning resources.';
    case 'power-bi-demo': return 'Explore an interactive business intelligence dashboard and see how data can become clear, actionable insights.';
    case 'admin': return 'ProBItian internal content management portal.';
    case '404': return 'The requested page could not be found on ProBItian.';
    default: return 'Master Power BI, SQL, Excel, Power Query, AI Tools, and Dashboard Design through practical projects and industry-focused tutorials.';
  }
}

export function usePageSeo(currentPage: NavPage, currentBlogSlug: string | null, selectedBlog: BlogArticle | null): PageSeoMeta {
  const title = useMemo(() => getPageTitle(currentPage, selectedBlog), [currentPage, selectedBlog]);
  const description = useMemo(() => getPageDescription(currentPage, selectedBlog), [currentPage, selectedBlog]);

  const robots = useMemo(() => {
    if (currentPage === 'admin' || currentPage === '404') {
      return 'noindex, nofollow';
    }
    return undefined;
  }, [currentPage]);

  // GA4 Page View Tracking on route or article changes
  useEffect(() => {
    const pagePath = currentPage === 'home' 
      ? '/' 
      : (currentPage === 'blog' && currentBlogSlug ? `/blog/${currentBlogSlug}` : `/${currentPage}`);
    trackPageView(pagePath, title);
  }, [currentPage, currentBlogSlug, title]);

  return {
    title,
    description,
    robots,
  };
}
