import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

export const APP_VERSION = '1.1.0';

export const OFFICIAL_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.VITE_CONTACT_EMAIL || 'probitianofficial@gmail.com').toLowerCase().trim();

export const CONFIGURED_ADMIN_EMAILS: string[] = [
  OFFICIAL_ADMIN_EMAIL,
  'probitianofficial@gmail.com',
  'shivam@probitian.com',
  'shivambaghel79@gmail.com',
  ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [])
].filter((email, index, self) => Boolean(email) && self.indexOf(email) === index);

export const PROBITIAN_MEDIA_BUCKET = 'probitian-media';

export const EPHEMERAL_SERVER_KEY = process.env.ADMIN_PASSKEY || process.env.SUPABASE_SECRET_KEY || process.env.SESSION_SECRET || 'probitian-secure-session-key-fallback-2026';

export const VALID_SPA_ROUTES = new Set([
  '/',
  '/about',
  '/projects',
  '/blog',
  '/learn',
  '/courses',
  '/contact',
  '/privacy',
  '/privacy-policy',
  '/terms',
  '/terms-of-service',
  '/admin'
]);

export function isKnownSpaRoute(urlPath: string): boolean {
  const cleanPath = urlPath.split('?')[0].toLowerCase().replace(/\/+$/, '') || '/';
  if (VALID_SPA_ROUTES.has(cleanPath)) return true;
  if (cleanPath.startsWith('/blog/')) return true;
  return false;
}

export function isValidUuid(id: any): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function isValidId(id: any): boolean {
  if (typeof id !== 'string' || !id.trim()) return false;
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export const DEFAULT_HOME_CONFIG = {
  hero_heading: 'Master Business Intelligence with Real-World Projects',
  hero_description: 'Master Power BI, SQL, Excel, AI and Dashboard Design through practical projects and industry-focused tutorials.',
  buttons: [
    { label: 'Start Learning', path: 'https://youtube.com/@probitian', primary: true },
    { label: 'Follow on Instagram', path: 'https://instagram.com/probitian', primary: false }
  ],
  banner_url: '/banner.svg',
  statistics: [
    { label: 'Free Tutorials', value: '100+' },
    { label: 'Portfolio Projects', value: '25+' },
    { label: 'YouTube Learners', value: '10K+' },
    { label: 'Career Resources', value: '50+' }
  ]
};

export const DEFAULT_FOUNDER_MESSAGE = {
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
    { platform: 'linkedin', url: 'https://www.linkedin.com/company/probitian/', enabled: true },
    { platform: 'youtube', url: 'https://youtube.com/@probitian', enabled: true },
    { platform: 'x', url: 'https://x.com/Probitian', enabled: true },
    { platform: 'email', url: 'probitianofficial@gmail.com', enabled: true }
  ],
  show_verified_badge: true,
  signature_text: 'Shivam Singh — Founder & Instructor'
};
