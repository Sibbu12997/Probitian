import React, { useEffect, useState } from 'react';
import { cmsService } from '../services/cmsService';
import { SeoSettings } from '../types';

interface SEOProps {
  title?: string;
  description?: string;
  pageUrl?: string;
  ogImage?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  pageUrl = 'https://probitian.com',
  ogImage,
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

  const finalTitle = title || cmsSeo?.meta_title || 'ProBItian | Master Business Intelligence';
  const finalDesc = description || cmsSeo?.meta_description || 'Master Power BI, SQL, Excel, Power Query, AI Tools, and Dashboard Design through practical projects and industry-focused tutorials.';
  const finalOgImage = ogImage || cmsSeo?.og_image || 'https://probitian.com/banner.svg';
  const finalKeywords = cmsSeo?.keywords || 'Power BI, SQL, Excel, Business Intelligence, Data Analytics';
  const finalRobots = cmsSeo?.robots_txt || 'index, follow';

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

    setMetaTag('meta[name="description"]', 'name', 'description', finalDesc);
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', finalKeywords);
    setMetaTag('meta[name="robots"]', 'name', 'robots', finalRobots);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', finalTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', finalDesc);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', finalOgImage);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', pageUrl);

    // Canonical link tag
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', pageUrl);
  }, [finalTitle, finalDesc, finalOgImage, finalKeywords, finalRobots, pageUrl]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'ProBItian',
    url: pageUrl,
    logo: cmsSeo?.og_image || 'https://probitian.com/logo.svg',
    sameAs: [
      'https://youtube.com/@probitian',
      'https://instagram.com/probitian',
      'https://facebook.com/probitian',
      'https://github.com/probitian',
    ],
    description: finalDesc,
    founder: {
      '@type': 'Person',
      name: 'Shivam Singh',
      email: contactEmail,
    },
    knowsAbout: ['Power BI', 'SQL', 'Excel', 'Power Query', 'DAX', 'Business Intelligence', 'Data Analytics', 'AI Tools'],
  };

  return (
    <React.Fragment>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </React.Fragment>
  );
};

