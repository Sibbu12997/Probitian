/**
 * Official ProBitian Brand Constants
 * Single source of truth for the official brand logo across the website, admin portal, and email templates.
 */
export const PROBITIAN_LOGO_URL = 'https://dlaehchzzkjsrarktfsf.supabase.co/storage/v1/object/public/probitian-media/general/1786857432327-d4d5d41a-probitian_logo.svg';
export const PROBITIAN_BANNER_URL = '/banner.svg';

// Official ProBitian Social Presence & Channels
export const PROBITIAN_X_URL = 'https://x.com/Probitian';
export const PROBITIAN_X_HANDLE = '@Probitian';
export const PROBITIAN_LINKEDIN_URL = 'https://www.linkedin.com/company/probitian/';
export const PROBITIAN_YOUTUBE_URL = 'https://youtube.com/@probitian';
export const PROBITIAN_INSTAGRAM_URL = 'https://instagram.com/probitian';
export const PROBITIAN_FACEBOOK_URL = 'https://facebook.com/probitian';
export const PROBITIAN_GITHUB_URL = 'https://github.com/probitian';
export const PROBITIAN_CONTACT_EMAIL = 'probitianofficial@gmail.com';

export interface SocialLinkConfig {
  id: string;
  platform: string;
  url: string;
  icon: string;
  is_active: boolean;
  display_order: number;
}

export interface HomePageButtonConfig {
  label: string;
  path: string;
  primary: boolean;
}

export interface HomePageStatConfig {
  label: string;
  value: string;
}

export interface HomePageConfigData {
  hero_heading: string;
  hero_description: string;
  buttons: HomePageButtonConfig[];
  banner_url: string;
  statistics: HomePageStatConfig[];
}

// Centralized default social connections configuration
export const DEFAULT_SOCIAL_LINKS: SocialLinkConfig[] = [
  { id: '1', platform: 'youtube', url: PROBITIAN_YOUTUBE_URL, icon: 'Youtube', is_active: true, display_order: 1 },
  { id: '2', platform: 'instagram', url: PROBITIAN_INSTAGRAM_URL, icon: 'Instagram', is_active: true, display_order: 2 },
  { id: '3', platform: 'facebook', url: PROBITIAN_FACEBOOK_URL, icon: 'Facebook', is_active: true, display_order: 3 },
  { id: '4', platform: 'github', url: PROBITIAN_GITHUB_URL, icon: 'Github', is_active: true, display_order: 4 },
  { id: '5', platform: 'email', url: `mailto:${PROBITIAN_CONTACT_EMAIL}`, icon: 'Mail', is_active: true, display_order: 5 },
  { id: '6', platform: 'linkedin', url: PROBITIAN_LINKEDIN_URL, icon: 'Linkedin', is_active: true, display_order: 6 },
  { id: '7', platform: 'x', url: PROBITIAN_X_URL, icon: 'X', is_active: true, display_order: 7 }
];

export const DEFAULT_HOME_CONFIG: HomePageConfigData = {
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

