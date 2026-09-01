import { FounderMessageConfig } from '../types';

export const DEFAULT_FOUNDER_MESSAGE: FounderMessageConfig = {
  enabled: true,
  name: 'Shivam Singh',
  role: 'Founder & Lead BI Instructor',
  bio_subtitle: 'Data Analyst & Business Intelligence Specialist',
  avatar_url: '',
  badge_text: "Founder's Note",
  heading: 'Why We Built ProBItian',
  heading_highlight: 'ProBItian',
  message_paragraphs: [
    'When I started building business intelligence solutions for real enterprises, I noticed a huge disconnect in how data analytics was taught online. Most resources focused exclusively on memorizing tool syntax and toy datasets, leaving learners unprepared for the real challenges of messy source tables, complex DAX calculations, and executive decision-making.',
    'I created ProBitian to provide an authentic, project-first learning platform. Our mission is simple: to make enterprise-grade Power BI, SQL, and data modeling accessible, practical, and directly applicable to advancing your analytics career.'
  ],
  highlights: [
    {
      id: '1',
      icon: 'Target',
      title: 'Project-First',
      description: 'Learn by building end-to-end portfolio dashboards with real enterprise schemas.'
    },
    {
      id: '2',
      icon: 'Award',
      title: 'Industry Rigor',
      description: 'Deep dive into star schemas, DAX optimization, and clean Power Query M transformations.'
    },
    {
      id: '3',
      icon: 'CheckCircle2',
      title: 'Career Ready',
      description: 'Develop tangible proof-of-work that helps you stand out in technical interviews.'
    }
  ],
  social_links: [
    {
      platform: 'linkedin',
      url: 'https://www.linkedin.com/company/probitian/',
      enabled: true
    },
    {
      platform: 'youtube',
      url: 'https://youtube.com/@probitian',
      enabled: true
    },
    {
      platform: 'x',
      url: 'https://x.com/Probitian',
      enabled: true
    },
    {
      platform: 'email',
      url: 'probitianofficial@gmail.com',
      enabled: true
    }
  ],
  show_verified_badge: true,
  signature_text: 'Shivam Singh — Founder & Instructor'
};
