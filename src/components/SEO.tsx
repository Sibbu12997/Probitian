import React from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  pageUrl?: string;
  ogImage?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'ProBItian | Master Business Intelligence',
  description = 'Master Power BI, SQL, Excel, Power Query, AI Tools, and Dashboard Design through practical projects and industry-focused tutorials.',
  pageUrl = 'https://probitian.com',
  ogImage = 'https://probitian.com/banner.svg',
}) => {
  React.useEffect(() => {
    document.title = title;
  }, [title]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'ProBItian',
    url: pageUrl,
    logo: 'https://probitian.com/logo.svg',
    sameAs: [
      'https://youtube.com/@probitian',
      'https://instagram.com/probitian',
      'https://facebook.com/probitian',
      'https://github.com/probitian',
    ],
    description: description,
    founder: {
      '@type': 'Person',
      name: 'Shivam Baghel',
      email: 'Probitianofficial@gmail.com',
    },
    knowsAbout: ['Power BI', 'SQL', 'Excel', 'Power Query', 'DAX', 'Business Intelligence', 'Data Analytics', 'AI Tools'],
  };

  return (
    <React.Fragment>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </React.Fragment>
  );
};
