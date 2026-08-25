export { PROBITIAN_LOGO_URL, PROBITIAN_BANNER_URL } from './constants/branding';

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

// ==================== BUSINESS LEADS & OUTREACH ====================

export type LeadPriority = 'High' | 'Medium' | 'Low';

export type LeadStatus =
  | 'Not Contacted'
  | 'Contacted'
  | 'Opened'
  | 'Replied'
  | 'Interested'
  | 'Demo Requested'
  | 'Proposal Sent'
  | 'Converted'
  | 'Not Interested'
  | 'Bounced'
  | 'Do Not Contact';

export interface Lead {
  id: string;
  company_name: string;
  industry?: string;
  location?: string;
  contact_person?: string;
  email: string;
  phone?: string;
  linkedin?: string;
  powerbi_use_case?: string;
  lead_priority: LeadPriority;
  status: LeadStatus;
  follow_up_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadCampaign {
  id: string;
  name: string;
  campaign_type: 'lead_outreach';
  subject: string;
  preheader?: string;
  html_content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'partially_sent' | 'failed' | 'cancelled';
  total_recipients: number;
  successful_count: number;
  failed_count: number;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  recipients?: CampaignLead[];
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id?: string;
  lead_email: string;
  lead_company?: string;
  status: 'queued' | 'sent' | 'failed' | 'opened' | 'clicked' | 'replied' | 'bounced';
  provider_message_id?: string;
  error_message?: string;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  created_at: string;
  lead?: Lead;
}

// ==================== B2B LEAD EMAIL SEQUENCES ====================

export type SequenceStatus = 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Cancelled';

export type SequenceLeadStatus = 'Pending' | 'Active' | 'Completed' | 'Paused' | 'Stopped' | 'Failed';

export type SequenceStopReason =
  | 'Replied'
  | 'Interested'
  | 'Demo Requested'
  | 'Converted'
  | 'Not Interested'
  | 'Do Not Contact'
  | 'Bounced'
  | 'Manual Stop'
  | 'Failed';

export interface LeadSequence {
  id: string;
  name: string;
  description?: string;
  status: SequenceStatus;
  created_at: string;
  updated_at: string;
  steps?: SequenceStep[];
  leads?: SequenceLead[];
  // Aggregated analytics
  total_leads?: number;
  active_leads?: number;
  completed_leads?: number;
  stopped_leads?: number;
  emails_sent?: number;
  emails_failed?: number;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  subject: string;
  preheader?: string;
  html_content: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  // Computed stats for step
  sent_count?: number;
  pending_count?: number;
  failed_count?: number;
}

export interface SequenceLead {
  id: string;
  sequence_id: string;
  lead_id: string;
  current_step: number;
  status: SequenceLeadStatus;
  next_send_at?: string | null;
  last_sent_at?: string | null;
  completed_at?: string | null;
  stopped_at?: string | null;
  stop_reason?: SequenceStopReason | string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  sequence?: LeadSequence;
}

export interface SequenceDeliveryLog {
  id: string;
  sequence_id: string;
  sequence_lead_id?: string;
  lead_id: string;
  step_number: number;
  step_id?: string;
  email: string;
  status: 'sent' | 'failed';
  error_message?: string;
  sent_at: string;
}


