export type NavPage = 'home' | 'about' | 'projects' | 'blog' | 'learn' | 'contact' | 'privacy' | 'terms' | 'admin' | '404';

export interface FeatureCardItem {
  id: string;
  title: string;
  shortDescription: string;
  iconName: string;
  badge?: string;
  color: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  description: string;
  fullDescription: string;
  toolsUsed: string[];
  imagePlaceholder: string;
  galleryUrls?: string[];
  kpis: { label: string; value: string; change: string }[];
  featured: boolean;
  published?: boolean;
  githubUrl?: string;
  liveDemoUrl?: string;
  youtubeUrl?: string;
  tags?: string[];
  displayOrder?: number;
  created_at?: string;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  category: 'Power BI' | 'SQL' | 'Excel' | 'Power Query' | 'DAX' | 'AI' | 'Career' | string;
  date: string;
  readTime: string;
  author: string;
  imageUrl: string;
  tags?: string[];
  status?: 'published' | 'draft' | 'scheduled';
  scheduledAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  created_at?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: string;
  url: string;
  youtubeId?: string;
  category?: string;
  playlist?: string;
  tags?: string[];
  created_at?: string;
}

export interface LearnTopic {
  id: string;
  title: string;
  slug?: string;
  icon: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  description: string;
  modulesCount: number;
  duration: string;
  keyTakeaways: string[];
  syllabus: { title: string; duration: string; type: 'video' | 'project' | 'quiz' }[];
  thumbnail?: string;
  videoUrl?: string;
  pdfUrl?: string;
  category?: string;
  published?: boolean;
  resources?: { name: string; url: string; type: string }[];
  created_at?: string;
}

export interface WhyCardItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  course_interested?: string;
  subject?: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  admin_notes?: string;
  reply_message?: string;
  replied_at?: string;
  reply_status?: 'none' | 'sent' | 'failed';
  email_sent_status?: string;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  created_at: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  original_filename?: string;
  storage_path?: string;
  public_url?: string;
  url: string;
  size_bytes: number;
  file_size?: number;
  mime_type: string;
  alt_text?: string;
  category?: string;
  folder: string;
  uploaded_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface SocialLinkItem {
  id: string;
  platform: string;
  url: string;
  icon: string;
  is_active: boolean;
  display_order: number;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  display_order: number;
  is_visible: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: 'project' | 'blog' | 'video' | 'course';
  slug: string;
  description?: string;
}

export interface WebsiteGeneralSettings {
  website_name: string;
  tagline: string;
  contact_email: string;
  logo_url: string;
  favicon_url: string;
  banner_url: string;
  theme_color: string;
  footer_copyright: string;
  community_hub_name?: string;
  community_hub_address?: string;
  community_hub_maps_url?: string;
}

export interface SeoSettings {
  meta_title: string;
  meta_description: string;
  keywords: string;
  og_image: string;
  twitter_handle: string;
  robots_txt: string;
}

export interface HomePageConfig {
  hero_heading: string;
  hero_description: string;
  buttons: { label: string; path: string; primary: boolean }[];
  banner_url: string;
  statistics: { label: string; value: string }[];
  feature_cards?: FeatureCardItem[];
  testimonials?: { id: string; quote: string; author: string; role: string; avatar: string }[];
  cta?: { heading: string; subheading: string; button_text: string; button_link: string };
}

export interface AdminUser {
  email: string;
  full_name: string;
  role: 'admin' | 'editor' | 'user';
}

export interface LegalSection {
  id: string;
  title: string;
  body: string;
}

export interface LegalDocument {
  title: string;
  subtitle?: string;
  effectiveDate?: string;
  lastUpdated: string;
  introduction?: string;
  sections: LegalSection[];
}

export interface LegalSettings {
  contactEmail: string;
  companyName: string;
  governingLaw?: string;
  terms: LegalDocument;
  privacy: LegalDocument;
}

export const DEFAULT_LEGAL_SETTINGS: LegalSettings = {
  contactEmail: 'contact@probitian.com',
  companyName: 'ProBItian',
  governingLaw: 'India',
  terms: {
    title: 'Terms of Service',
    subtitle: 'Terms governing your use of the ProBitian website, learning resources and services.',
    effectiveDate: 'August 9, 2026',
    lastUpdated: '2026-08-09T00:00:00.000Z',
    introduction: 'Welcome to ProBItian. By accessing or using our website, tutorials, repositories, and learning resources, you agree to be bound by these Terms of Service.',
    sections: [
      {
        id: 'terms-1',
        title: '1. Acceptance of Terms',
        body: 'By accessing and using ProBItian (the "Platform"), you agree to abide by these Terms of Service. If you do not agree to these terms, please discontinue using the platform.'
      },
      {
        id: 'terms-2',
        title: '2. Educational Content & Intellectual Property',
        body: 'All tutorials, dashboard templates, DAX scripts, SQL queries, code snippets, and instructional materials provided on ProBItian are for educational and professional skill development. You may utilize sample datasets and formulas for personal learning and portfolio construction.'
      },
      {
        id: 'terms-3',
        title: '3. User Conduct & Acceptable Use',
        body: 'Users agree not to misuse the platform, engage in unauthorized scraping, or attempt to disrupt our web services, APIs, or database integrity.'
      },
      {
        id: 'terms-4',
        title: '4. Third-Party Links & Platforms',
        body: 'Our platform links to third-party services including YouTube, GitHub, and Instagram. We are not responsible for third-party privacy policies or terms.'
      },
      {
        id: 'terms-17',
        title: '5. Governing Law',
        body: 'Governing Law: India. These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.'
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How ProBitian collects, uses, stores and protects personal information.',
    effectiveDate: 'August 9, 2026',
    lastUpdated: '2026-08-09T00:00:00.000Z',
    introduction: 'At ProBItian, accessible from probitian.com, one of our main priorities is the privacy of our visitors and students.',
    sections: [
      {
        id: 'privacy-1',
        title: '1. Information We Collect',
        body: 'We collect minimal personal information, primarily name and email address when you voluntarily submit contact messages, course feedback, or subscribe to newsletter updates.'
      },
      {
        id: 'privacy-2',
        title: '2. How We Use Your Information',
        body: 'We use collected information solely to send requested tutorials, reply to career/consulting inquiries, and improve platform performance and analytics.'
      },
      {
        id: 'privacy-3',
        title: '3. Data Security & Retention',
        body: 'We use industry-standard encryption, rate-limiting, and access restrictions to protect any transmitted information against unauthorized access.'
      },
      {
        id: 'privacy-4',
        title: '4. User Rights & Data Deletion',
        body: 'You may request review, modification, or complete deletion of your contact submissions at any time by emailing contact@probitian.com.'
      }
    ]
  }
};

export const FEATURE_CARDS: FeatureCardItem[] = [
  {
    id: 'f1',
    title: 'Power BI Masterclass',
    shortDescription: 'End-to-end report modeling, Star Schema architecture, dynamic DAX measures, and executive dashboard design.',
    iconName: 'BarChart3',
    badge: 'Flagship Track',
    color: 'amber'
  },
  {
    id: 'f2',
    title: 'SQL for Analytics',
    shortDescription: 'Master complex joins, window functions, CTEs, subqueries, and analytical data modeling in PostgreSQL.',
    iconName: 'Database',
    badge: 'Core Skill',
    color: 'blue'
  },
  {
    id: 'f3',
    title: 'Advanced Excel & Power Query',
    shortDescription: 'Automate repetitive ETL workflows, build robust financial formulas, dynamic arrays, and M-code transformations.',
    iconName: 'Table',
    badge: 'Hands-on',
    color: 'emerald'
  },
  {
    id: 'f4',
    title: 'DAX & Data Modeling',
    shortDescription: 'Deep dive into row and filter contexts, CALCULATE modifiers, time intelligence, and optimization strategies.',
    iconName: 'Filter',
    badge: 'Pro Tier',
    color: 'purple'
  },
  {
    id: 'f5',
    title: 'AI in Business Intelligence',
    shortDescription: 'Leverage AI copilot workflows, Python integration, generative insights, and automated narrative generation.',
    iconName: 'BrainCircuit',
    badge: 'Trending',
    color: 'pink'
  },
  {
    id: 'f6',
    title: 'Portfolio & Career Roadmaps',
    shortDescription: 'Curated projects with business KPIs, GitHub portfolios, resume building, and mock interview questions.',
    iconName: 'GraduationCap',
    badge: 'Career Path',
    color: 'indigo'
  }
];

export const WHY_PROBITIAN_CARDS: WhyCardItem[] = [
  {
    id: 'w1',
    title: 'Practical Business Scenarios',
    description: 'Learn using real-world business case studies, messy dataset transformations, and enterprise reporting standards.',
    iconName: 'Sparkles'
  },
  {
    id: 'w2',
    title: 'Portfolio-Ready Dashboards',
    description: 'Every lesson culminates in an impactful, recruiter-ready dashboard project with clear business KPIs.',
    iconName: 'Briefcase'
  },
  {
    id: 'w3',
    title: 'Free & Accessible Learning',
    description: 'High-quality tutorial content, code repositories, downloadable PBIX files, and guides open to everyone.',
    iconName: 'HeartHandshake'
  },
  {
    id: 'w4',
    title: 'Continuous Career Growth',
    description: 'Structured pathways to take you from foundational spreadsheets to senior BI developer status.',
    iconName: 'TrendingUp'
  }
];

export const DEFAULT_LEARN_TOPIC: LearnTopic = {
  id: 'pbi-foundations',
  title: 'Power BI Complete Masterclass',
  slug: 'power-bi-masterclass',
  icon: 'BarChart3',
  level: 'Beginner',
  description: 'Master Power BI from scratch: data extraction, cleaning in Power Query, star schema data modeling, essential DAX calculations, and publishing interactive executive reports.',
  modulesCount: 6,
  duration: '8 Hours',
  keyTakeaways: [
    'End-to-end data transformation with Power Query',
    'Star Schema data modeling best practices',
    'Essential DAX: CALCULATE, RELATED, Time Intelligence',
    'Executive UI design and custom interactive tooltips'
  ],
  syllabus: [
    { title: 'Introduction & Power BI Interface Overview', duration: '45 mins', type: 'video' },
    { title: 'Data Cleaning & Shaping with Power Query', duration: '1.5 hrs', type: 'video' },
    { title: 'Dimensional Modeling & Star Schema Design', duration: '1 hr', type: 'video' },
    { title: 'Core DAX Measures & CALCULATE Deep Dive', duration: '2 hrs', type: 'video' },
    { title: 'Building the Executive Sales Dashboard', duration: '2 hrs', type: 'project' },
    { title: 'Publishing, Row-Level Security & Sharing', duration: '45 mins', type: 'video' }
  ],
  category: 'Power BI',
  published: true
};

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preview_text?: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'partially_sent' | 'failed' | 'cancelled';
  audience_type: 'all_active' | 'custom_segment';
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  total_recipients: number;
  successful_count: number;
  failed_count: number;
  error_log?: string;
}

export interface EmailCampaignRecipient {
  id: string;
  campaign_id: string;
  subscriber_id?: string;
  email: string;
  status: 'pending' | 'sent' | 'failed';
  provider_message_id?: string;
  sent_at?: string;
  error_message?: string;
}
