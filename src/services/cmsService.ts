import {
  WebsiteGeneralSettings,
  SeoSettings,
  HomePageConfig,
  ProjectItem,
  BlogArticle,
  LearnTopic,
  YouTubeVideo,
  ContactMessage,
  NewsletterSubscriber,
  EmailCampaign,
  EmailCampaignRecipient,
  SocialLinkItem,
  NavigationItem,
  MediaItem,
  CategoryItem,
  Lead,
  LeadCampaign,
  CampaignLead,
  LeadStatus,
  LeadPriority
} from '../types';
import { LegalSettings, DEFAULT_LEGAL_SETTINGS } from '../data/defaultLegalData';
import { PROBITIAN_LOGO_URL } from '../constants/branding';

/**
 * Safe fetch helper for Express API routes (Single source of truth: Supabase via Express)
 * Throws explicit error on HTTP non-2xx so callers can distinguish between valid empty data and API failures.
 */
async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const fetchOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers: {
      ...options?.headers
    }
  };
  const response = await fetch(url, fetchOptions);
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorText = '';
    if (contentType.includes('application/json')) {
      try {
        const json = await response.json();
        errorText = json.error || json.message || JSON.stringify(json);
      } catch (e) {
        errorText = await response.text();
      }
    } else {
      errorText = await response.text();
    }
    throw new Error(errorText || `API HTTP ${response.status} (${url})`);
  }

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON from ${url} but received ${contentType}: ${text.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

// ==================== CMS SERVICE API (EXPRESS ROUTED TO SUPABASE) ====================

export const cmsService = {
  // --- GENERAL SETTINGS ---
  async getGeneralSettings(): Promise<WebsiteGeneralSettings> {
    const data = await safeFetchJson<WebsiteGeneralSettings | null>('/api/cms/settings/general');
    return {
      website_name: data?.website_name || 'ProBitian',
      tagline: data?.tagline || 'Master Business Intelligence',
      contact_email: data?.contact_email || 'probitianofficial@gmail.com',
      logo_url: data?.logo_url || PROBITIAN_LOGO_URL,
      favicon_url: data?.favicon_url || PROBITIAN_LOGO_URL,
      banner_url: data?.banner_url || '/banner.svg',
      theme_color: data?.theme_color || 'purple',
      footer_copyright: data?.footer_copyright || '© 2026 ProBitian. All Rights Reserved.',
      community_hub_name: data?.community_hub_name || 'ProBitian Community Hub',
      community_hub_address: data?.community_hub_address || 'M93M+688, Salaiya, Madhya Pradesh 486440, India',
      community_hub_maps_url: data?.community_hub_maps_url || 'https://maps.app.goo.gl/T4426JADcNHHFPqb7'
    };
  },

  async saveGeneralSettings(settings: WebsiteGeneralSettings): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.error('Failed to save general settings via Express API:', e?.message || e);
      return false;
    }
  },

  // --- SEO SETTINGS ---
  async getSeoSettings(): Promise<SeoSettings> {
    const data = await safeFetchJson<SeoSettings | null>('/api/cms/settings/seo');
    return {
      meta_title: data?.meta_title || 'ProBitian | Master Business Intelligence',
      meta_description: data?.meta_description || 'Master Power BI, SQL, Excel, Power Query, AI Tools, and Dashboard Design through practical projects and industry-focused tutorials.',
      keywords: data?.keywords || 'Power BI, SQL, DAX, Power Query, Data Analytics, Business Intelligence, Excel, AI, ProBitian',
      og_image: data?.og_image || '/banner.svg',
      twitter_handle: data?.twitter_handle || '@probitian',
      robots_txt: data?.robots_txt || 'User-agent: *\nAllow: /'
    };
  },

  async saveSeoSettings(seo: SeoSettings): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/settings/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seo)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.error('Failed to save SEO settings via Express API:', e?.message || e);
      return false;
    }
  },

  // --- LEGAL & POLICIES SETTINGS ---
  async getLegalSettings(): Promise<LegalSettings> {
    const data = await safeFetchJson<LegalSettings | null>('/api/cms/settings/legal');
    if (data && typeof data === 'object' && (data.terms || data.privacy)) {
      return data as LegalSettings;
    }
    return DEFAULT_LEGAL_SETTINGS;
  },

  async saveLegalSettings(legal: LegalSettings): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/settings/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(legal)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.error('Failed to save legal settings via Express API:', e?.message || e);
      return false;
    }
  },

  // --- HOME PAGE CONFIG ---
  async getHomePageConfig(): Promise<HomePageConfig | null> {
    const data = await safeFetchJson<HomePageConfig | null>('/api/cms/settings/home');
    if (data && typeof data === 'object' && data.hero_heading) {
      return data as HomePageConfig;
    }
    return null;
  },

  async saveHomePageConfig(config: HomePageConfig): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/settings/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.error('Failed to save home config via Express API:', e?.message || e);
      return false;
    }
  },

  // --- PROJECTS ---
  async getProjects(): Promise<ProjectItem[]> {
    const data = await safeFetchJson<any[]>('/api/cms/projects');
    if (Array.isArray(data)) {
      return data.map((p: any) => ({
        id: String(p.id),
        title: p.title || 'Untitled Project',
        category: p.category || 'General',
        description: p.description || '',
        fullDescription: p.full_description || p.fullDescription || p.description || '',
        toolsUsed: p.tools_used || p.toolsUsed || [],
        imagePlaceholder: p.image_url || p.imagePlaceholder || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
        galleryUrls: p.gallery_urls || p.galleryUrls || [],
        kpis: Array.isArray(p.kpis) ? p.kpis : [],
        featured: Boolean(p.featured),
        published: p.published !== false,
        githubUrl: p.github_url || p.githubUrl,
        liveDemoUrl: p.live_demo_url || p.liveDemoUrl,
        youtubeUrl: p.youtube_url || p.youtubeUrl,
        tags: p.tags || [],
        displayOrder: p.display_order ?? p.displayOrder,
        created_at: p.created_at
      }));
    }
    return [];
  },

  async saveProject(project: ProjectItem): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('[CMS Service] saveProject API warning:', e?.message || e);
      return false;
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/cms/projects/${id}`, { method: 'DELETE' });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('[CMS Service] deleteProject API warning:', e?.message || e);
      return false;
    }
  },

  // --- BLOGS ---
  async getBlogs(): Promise<BlogArticle[]> {
    const data = await safeFetchJson<any[]>('/api/cms/blogs');
    if (Array.isArray(data)) {
      return data.map((b: any) => ({
        id: String(b.id),
        title: b.title || 'Untitled Article',
        slug: b.slug || (b.title ? b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'article'),
        excerpt: b.excerpt || '',
        content: b.content || '',
        category: b.category || 'Data Analytics',
        tags: b.tags || [],
        date: b.date || (b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'),
        readTime: b.read_time || b.readTime || '5 min read',
        author: b.author || 'Shivam Singh',
        imageUrl: b.featured_image || b.imageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        status: b.status || 'published',
        scheduledAt: b.scheduled_at || b.scheduledAt,
        metaTitle: b.meta_title || b.metaTitle,
        metaDescription: b.meta_description || b.metaDescription,
        created_at: b.created_at
      }));
    }
    return [];
  },

  async saveBlog(blog: BlogArticle): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blog)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('[CMS Service] saveBlog API warning:', e?.message || e);
      return false;
    }
  },

  async deleteBlog(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/cms/blogs/${id}`, { method: 'DELETE' });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('[CMS Service] deleteBlog API warning:', e?.message || e);
      return false;
    }
  },

  // --- COURSES / LEARN TOPICS ---
  async getCourses(): Promise<LearnTopic[]> {
    const data = await safeFetchJson<any[]>('/api/cms/courses');
    if (Array.isArray(data)) {
      return data.map((c: any) => ({
        id: String(c.id),
        title: c.title || 'Untitled Course',
        slug: c.slug || (c.title ? c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'course'),
        icon: c.icon || 'BarChart3',
        level: c.level || 'All Levels',
        description: c.description || '',
        modulesCount: c.modules_count ?? c.modulesCount ?? 5,
        duration: c.duration || '5 Hours',
        keyTakeaways: c.key_takeaways || c.keyTakeaways || [],
        syllabus: Array.isArray(c.syllabus) ? c.syllabus : (Array.isArray(c.curriculum) ? c.curriculum : []),
        thumbnail: c.thumbnail || c.thumbnail_url,
        videoUrl: c.video_url || c.videoUrl,
        pdfUrl: c.pdf_url || c.pdfUrl,
        category: c.category || 'Data Analytics',
        published: c.published !== false,
        resources: c.resources || [],
        created_at: c.created_at
      }));
    }
    return [];
  },

  async saveCourse(course: LearnTopic): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('[CMS Service] saveCourse API warning:', e?.message || e);
      return false;
    }
  },

  async deleteCourse(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/cms/courses/${id}`, { method: 'DELETE' });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('[CMS Service] deleteCourse API warning:', e?.message || e);
      return false;
    }
  },

  // --- YOUTUBE VIDEOS ---
  async getVideos(): Promise<YouTubeVideo[]> {
    const data = await safeFetchJson<any[]>('/api/cms/videos');
    if (Array.isArray(data)) {
      return data.map((v: any) => ({
        id: String(v.id),
        title: v.title || 'Untitled Video',
        description: v.description || '',
        thumbnail: v.thumbnail || '',
        duration: v.duration || '10:00',
        views: v.views || (v.views_count ? `${v.views_count} views` : '1K views'),
        url: v.youtube_url || v.url || '',
        youtubeId: v.youtube_id || v.youtubeId || '',
        category: v.category || 'Power BI',
        playlist: v.playlist,
        tags: v.tags || [],
        created_at: v.created_at
      }));
    }
    return [];
  },

  async saveVideo(video: YouTubeVideo): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('[CMS Service] saveVideo API warning:', e?.message || e);
      return false;
    }
  },

  async deleteVideo(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/cms/videos/${id}`, { method: 'DELETE' });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('[CMS Service] deleteVideo API warning:', e?.message || e);
      return false;
    }
  },

  // --- CONTACT MESSAGES / REAL ENQUIRIES ---
  async getMessages(): Promise<ContactMessage[]> {
    const data = await safeFetchJson<any[]>('/api/cms/messages');
    if (Array.isArray(data)) {
      return data.map((m: any) => ({
        id: String(m.id || ('msg-' + m.created_at)),
        name: m.name || '',
        email: m.email || '',
        phone: m.phone || m.phone_number || '',
        course_interested: m.course_interested || m.course || '',
        subject: m.subject || '',
        message: m.message || '',
        status: m.status || 'new',
        admin_notes: m.admin_notes || '',
        reply_message: m.reply_message || '',
        replied_at: m.replied_at || '',
        reply_status: m.reply_status || (m.status === 'replied' ? 'sent' : 'none'),
        email_sent_status: m.email_sent_status || '',
        created_at: m.created_at || new Date().toISOString()
      }));
    }
    return [];
  },

  async submitContactMessage(msg: {
    name: string;
    email: string;
    phone: string;
    course_interested?: string;
    subject?: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await safeFetchJson<{ success?: boolean; message?: ContactMessage; error?: string }>('/api/cms/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      if (res && res.success) {
        return { success: true };
      }
      return { success: false, error: res?.error || 'Failed to submit contact message' };
    } catch (e: any) {
      console.error('Contact submission error:', e?.message || e);
      return { success: false, error: e?.message || 'Failed to submit contact message' };
    }
  },

  async sendReplyMessage(
    id: string,
    replyText: string,
    replySubject?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; message?: string }>(`/api/cms/messages/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replyText, replySubject }),
      });
      if (data && data.success) {
        return { success: true, message: data.message || 'Reply sent successfully.' };
      }
      return { success: false, message: data?.message || 'Failed to send reply via server endpoint.' };
    } catch (e: any) {
      console.error('API reply failed:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to send reply via server endpoint.' };
    }
  },

  async updateMessageStatus(id: string, status: ContactMessage['status'], adminNotes?: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/cms/messages/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to update message status via API:', e?.message || e);
      return false;
    }
  },

  async deleteMessage(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/cms/messages/${id}`, { method: 'DELETE' });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to delete message via API:', e?.message || e);
      return false;
    }
  },

  // --- NEWSLETTER SUBSCRIBERS ---
  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    const data = await safeFetchJson<NewsletterSubscriber[]>('/api/cms/subscribers');
    if (Array.isArray(data)) {
      return data as NewsletterSubscriber[];
    }
    return [];
  },

  async subscribeNewsletter(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; message?: string }>('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (data && data.success) {
        return { success: true, message: data.message || 'Successfully subscribed!' };
      }
      return { success: false, message: data?.message || 'Failed to subscribe' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to subscribe' };
    }
  },

  async deleteSubscriber(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/cms/subscribers/${id}`, { method: 'DELETE' });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to delete subscriber via API:', e?.message || e);
      return false;
    }
  },

  // --- EMAIL CAMPAIGNS ---
  async getCampaignAudienceCount(): Promise<{ count: number; providerConfigured: boolean }> {
    try {
      const data = await safeFetchJson<{ count?: number; providerConfigured?: boolean }>('/api/admin/email-campaigns/audience-count');
      return { count: data.count || 0, providerConfigured: Boolean(data.providerConfigured) };
    } catch (e: any) {
      console.warn('Failed to fetch audience count via API:', e?.message || e);
      return { count: 0, providerConfigured: false };
    }
  },

  async getCampaigns(): Promise<EmailCampaign[]> {
    const data = await safeFetchJson<EmailCampaign[]>('/api/admin/email-campaigns');
    if (Array.isArray(data)) {
      return data as EmailCampaign[];
    }
    return [];
  },

  async getCampaignById(id: string): Promise<(EmailCampaign & { recipients?: EmailCampaignRecipient[] }) | null> {
    try {
      return await safeFetchJson(`/api/admin/email-campaigns/${id}`);
    } catch (e: any) {
      console.warn(`Failed to fetch campaign ${id} via API:`, e?.message || e);
      return null;
    }
  },

  async saveCampaign(campaign: Partial<EmailCampaign>): Promise<{ success: boolean; campaign?: EmailCampaign }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; campaign?: EmailCampaign }>('/api/admin/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });
      if (data && data.campaign) {
        return { success: true, campaign: data.campaign };
      }
      return { success: false };
    } catch (e: any) {
      console.warn('Failed to save campaign via API:', e?.message || e);
      return { success: false };
    }
  },

  async deleteCampaign(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/admin/email-campaigns/${id}`, { method: 'DELETE' });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to delete campaign via API:', e?.message || e);
      return false;
    }
  },

  async sendTestCampaign(id: string, testEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; message?: string }>(`/api/admin/email-campaigns/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });
      return { success: Boolean(data && data.success), message: data?.message || 'Test request processed.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to trigger test email.' };
    }
  },

  async sendBulkCampaign(id: string): Promise<{ success: boolean; message: string; campaign?: EmailCampaign }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; message?: string; campaign?: EmailCampaign }>(`/api/admin/email-campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return { success: Boolean(data && data.success), message: data?.message || 'Send request completed.', campaign: data?.campaign };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to dispatch bulk campaign.' };
    }
  },

  // --- BUSINESS LEADS MANAGEMENT ---
  async getLeads(filters?: { search?: string; status?: string; lead_priority?: string; industry?: string; follow_up?: string }): Promise<Lead[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.set('search', filters.search);
      if (filters?.status && filters.status !== 'all') queryParams.set('status', filters.status);
      if (filters?.lead_priority && filters.lead_priority !== 'all') queryParams.set('lead_priority', filters.lead_priority);
      if (filters?.industry && filters.industry !== 'all') queryParams.set('industry', filters.industry);
      if (filters?.follow_up && filters.follow_up !== 'all') queryParams.set('follow_up', filters.follow_up);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const data = await safeFetchJson<Lead[]>(`/api/admin/leads${qs}`);
      if (Array.isArray(data)) {
        return data as Lead[];
      }
      return [];
    } catch (e: any) {
      console.warn('Failed to fetch leads via API:', e?.message || e);
      return [];
    }
  },

  async getLeadById(id: string): Promise<(Lead & { outreach_history?: any[] }) | null> {
    try {
      return await safeFetchJson<Lead & { outreach_history?: any[] }>(`/api/admin/leads/${id}`);
    } catch (e: any) {
      console.warn(`Failed to fetch lead ${id} via API:`, e?.message || e);
      return null;
    }
  },

  async saveLead(lead: Partial<Lead>): Promise<{ success: boolean; lead?: Lead; error?: string }> {
    try {
      const res = await safeFetchJson<{ success?: boolean; lead?: Lead; error?: string }>('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (res && res.lead) {
        return { success: true, lead: res.lead };
      }
      return { success: false, error: res?.error || 'Failed to save lead' };
    } catch (e: any) {
      console.warn('Failed to save lead via API:', e?.message || e);
      return { success: false, error: e?.message || 'Failed to save lead' };
    }
  },

  async importLeads(leads: Partial<Lead>[], options?: { skipDuplicates?: boolean; updateDuplicates?: boolean }): Promise<{
    success: boolean;
    totalProvided?: number;
    importedCount?: number;
    skippedCount?: number;
    updatedCount?: number;
    invalidCount?: number;
    errors?: any[];
    error?: string;
  }> {
    try {
      const res = await safeFetchJson<{
        success?: boolean;
        totalProvided?: number;
        importedCount?: number;
        skippedCount?: number;
        updatedCount?: number;
        invalidCount?: number;
        errors?: any[];
        error?: string;
      }>('/api/admin/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads,
          skipDuplicates: options?.skipDuplicates !== false,
          updateDuplicates: options?.updateDuplicates === true
        })
      });
      return {
        success: Boolean(res && res.success),
        totalProvided: res?.totalProvided || leads.length,
        importedCount: res?.importedCount || 0,
        skippedCount: res?.skippedCount || 0,
        updatedCount: res?.updatedCount || 0,
        invalidCount: res?.invalidCount || 0,
        errors: res?.errors || [],
        error: res?.error
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Batch lead import failed'
      };
    }
  },

  async updateLeadStatus(id: string, updates: { status?: LeadStatus; follow_up_date?: string | null; notes?: string; lead_priority?: LeadPriority }): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/admin/leads/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn(`Failed to update lead ${id} status:`, e?.message || e);
      return false;
    }
  },

  async deleteLead(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/admin/leads/${id}`, {
        method: 'DELETE'
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn(`Failed to delete lead ${id}:`, e?.message || e);
      return false;
    }
  },

  async batchDeleteLeads(ids: string[]): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/admin/leads/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to batch delete leads:', e?.message || e);
      return false;
    }
  },

  // --- LEAD OUTREACH CAMPAIGNS ---
  async getLeadCampaigns(): Promise<LeadCampaign[]> {
    try {
      const data = await safeFetchJson<LeadCampaign[]>('/api/admin/lead-campaigns');
      if (Array.isArray(data)) {
        return data as LeadCampaign[];
      }
      return [];
    } catch (e: any) {
      console.warn('Failed to fetch lead campaigns:', e?.message || e);
      return [];
    }
  },

  async getLeadCampaignById(id: string): Promise<(LeadCampaign & { recipients?: CampaignLead[] }) | null> {
    try {
      return await safeFetchJson<LeadCampaign & { recipients?: CampaignLead[] }>(`/api/admin/lead-campaigns/${id}`);
    } catch (e: any) {
      console.warn(`Failed to fetch lead campaign ${id}:`, e?.message || e);
      return null;
    }
  },

  async saveLeadCampaign(campaign: Partial<LeadCampaign>): Promise<{ success: boolean; campaign?: LeadCampaign }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; campaign?: LeadCampaign }>('/api/admin/lead-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });
      if (data && data.campaign) {
        return { success: true, campaign: data.campaign };
      }
      return { success: false };
    } catch (e: any) {
      console.warn('Failed to save lead campaign:', e?.message || e);
      return { success: false };
    }
  },

  async deleteLeadCampaign(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/admin/lead-campaigns/${id}`, {
        method: 'DELETE'
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn(`Failed to delete lead campaign ${id}:`, e?.message || e);
      return false;
    }
  },

  async sendTestLeadCampaign(id: string, testEmail: string, sampleLeadId?: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; message?: string }>(`/api/admin/lead-campaigns/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail, sampleLeadId })
      });
      return { success: Boolean(data && data.success), message: data?.message || 'Test outreach processed.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to dispatch test lead email.' };
    }
  },

  async sendBulkLeadCampaign(id: string, leadIds: string[], batchSize?: number): Promise<{
    success: boolean;
    message: string;
    campaign?: LeadCampaign;
    leadsProcessed?: number;
    successfulCount?: number;
    failedCount?: number;
  }> {
    try {
      const data = await safeFetchJson<{
        success?: boolean;
        message?: string;
        campaign?: LeadCampaign;
        leadsProcessed?: number;
        successfulCount?: number;
        failedCount?: number;
      }>(`/api/admin/lead-campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, batchSize: batchSize || 10 })
      });
      return {
        success: Boolean(data && data.success),
        message: data?.message || 'Lead campaign send completed.',
        campaign: data?.campaign,
        leadsProcessed: data?.leadsProcessed,
        successfulCount: data?.successfulCount,
        failedCount: data?.failedCount
      };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to dispatch lead outreach campaign.' };
    }
  },

  // --- SOCIAL LINKS ---
  async getSocialLinks(): Promise<SocialLinkItem[]> {
    const data = await safeFetchJson<any[]>('/api/cms/social');
    if (Array.isArray(data)) {
      return data.map((s: any) => ({
        id: String(s.id),
        platform: s.platform || 'youtube',
        url: s.url || '',
        icon: s.icon || 'Youtube',
        is_active: s.is_active !== false,
        display_order: s.display_order ?? 0
      }));
    }
    return [];
  },

  async saveSocialLink(item: SocialLinkItem): Promise<boolean> {
    try {
      const list = await this.getSocialLinks();
      const idx = list.findIndex(s => s.id === item.id);
      const updated = idx >= 0 ? list.map(s => s.id === item.id ? item : s) : [...list, item];
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to save social links via API:', e?.message || e);
      return false;
    }
  },

  // --- NAVIGATION ---
  async getNavigation(): Promise<NavigationItem[]> {
    const data = await safeFetchJson<any[]>('/api/cms/navigation');
    if (Array.isArray(data)) {
      return data.map((n: any) => ({
        id: String(n.id),
        label: n.label || '',
        path: n.path || '',
        icon: n.icon || 'Home',
        display_order: n.display_order ?? 0,
        is_visible: n.is_visible !== false
      }));
    }
    return [];
  },

  async saveNavigation(items: NavigationItem[]): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to save navigation via API:', e?.message || e);
      return false;
    }
  },

  async getMedia(): Promise<MediaItem[]> {
    return this.getMediaItems();
  },

  async createMedia(item: MediaItem): Promise<void> {
    await this.addMediaItem(item);
  },

  async deleteMedia(id: string): Promise<{ success: boolean; error?: string }> {
    return this.deleteMediaItem(id);
  },

  // --- MEDIA LIBRARY ---
  async uploadMediaFile(params: {
    fileData: string;
    filename: string;
    category?: string;
    folder?: string;
    altText?: string;
  }): Promise<{ success: boolean; media?: MediaItem; error?: string }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; media?: MediaItem; error?: string }>('/api/cms/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'Failed to upload asset to Supabase Storage.'
        };
      }
      return {
        success: true,
        media: data.media as MediaItem
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error communicating with upload server.'
      };
    }
  },

  async getMediaItems(): Promise<MediaItem[]> {
    const data = await safeFetchJson<any[]>('/api/cms/media');
    if (Array.isArray(data)) {
      return data.map((m: any) => ({
        id: String(m.id),
        filename: m.filename || 'asset',
        original_filename: m.original_filename || m.filename,
        storage_path: m.storage_path,
        public_url: m.public_url || m.url || '',
        url: m.url || m.public_url || '',
        size_bytes: m.size_bytes || m.file_size || 0,
        file_size: m.file_size || m.size_bytes || 0,
        mime_type: m.mime_type || 'image/png',
        alt_text: m.alt_text || m.filename,
        category: m.category || m.folder || 'general',
        folder: m.folder || m.category || 'general',
        uploaded_at: m.uploaded_at || m.created_at || new Date().toISOString(),
        created_at: m.created_at || new Date().toISOString()
      }));
    }
    return [];
  },

  async addMediaItem(item: Omit<MediaItem, 'id' | 'created_at'>): Promise<MediaItem> {
    const resData = await safeFetchJson<{ success?: boolean; media?: MediaItem }>('/api/cms/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (resData && resData.media) return resData.media as MediaItem;
    throw new Error('Failed to create media record');
  },

  async deleteMediaItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const resData = await safeFetchJson<{ success?: boolean; error?: string }>(`/api/cms/media/${id}`, { method: 'DELETE' });
      if (resData && resData.success === false) {
        return {
          success: false,
          error: resData.error || 'Failed to delete media asset.'
        };
      }
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Network error deleting media item.'
      };
    }
  },

  // --- CATEGORIES ---
  async getCategories(): Promise<CategoryItem[]> {
    const data = await safeFetchJson<any[]>('/api/cms/categories');
    if (Array.isArray(data)) {
      return data.map((c: any) => ({
        id: String(c.id),
        name: c.name || '',
        type: c.type || 'project',
        slug: c.slug || (c.name ? c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'category'),
        description: c.description || ''
      }));
    }
    return [];
  },

  async saveCategory(cat: CategoryItem): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>('/api/cms/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
      });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to save category via API:', e?.message || e);
      return false;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const res = await safeFetchJson<{ success?: boolean }>(`/api/cms/categories/${id}`, { method: 'DELETE' });
      return Boolean(res && res.success !== false);
    } catch (e: any) {
      console.warn('Failed to delete category via API:', e?.message || e);
      return false;
    }
  },

  // --- FULL DATABASE BACKUP & RESTORE ---
  async exportFullDatabaseBackup() {
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      general: await this.getGeneralSettings(),
      seo: await this.getSeoSettings(),
      homePage: await this.getHomePageConfig(),
      projects: await this.getProjects(),
      blogs: await this.getBlogs(),
      courses: await this.getCourses(),
      videos: await this.getVideos(),
      messages: await this.getMessages(),
      subscribers: await this.getNewsletterSubscribers(),
      socialLinks: await this.getSocialLinks(),
      navigation: await this.getNavigation(),
      media: await this.getMediaItems(),
      categories: await this.getCategories()
    };
    return backup;
  },

  async restoreFullDatabaseBackup(data: any): Promise<boolean> {
    if (!data) return false;
    if (data.general) await this.saveGeneralSettings(data.general);
    if (data.seo) await this.saveSeoSettings(data.seo);
    if (data.homePage) await this.saveHomePageConfig(data.homePage);
    if (data.projects && Array.isArray(data.projects)) {
      for (const p of data.projects) await this.saveProject(p);
    }
    if (data.blogs && Array.isArray(data.blogs)) {
      for (const b of data.blogs) await this.saveBlog(b);
    }
    if (data.courses && Array.isArray(data.courses)) {
      for (const c of data.courses) await this.saveCourse(c);
    }
    if (data.videos && Array.isArray(data.videos)) {
      for (const v of data.videos) await this.saveVideo(v);
    }
    return true;
  }
};
