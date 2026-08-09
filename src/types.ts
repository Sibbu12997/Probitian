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
  url: string;
  size_bytes: number;
  mime_type: string;
  folder: string;
  created_at: string;
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
