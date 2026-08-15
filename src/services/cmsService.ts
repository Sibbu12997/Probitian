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
  CategoryItem
} from '../types';
import {
  FEATURE_CARDS,
  PROJECTS,
  BLOG_ARTICLES,
  LEARN_TOPICS,
  YOUTUBE_VIDEOS
} from '../data/mockData';
import { DEFAULT_LEGAL_SETTINGS, LegalSettings } from '../data/defaultLegalData';

// LOCAL STORAGE KEYS (for optimistic updates and client resilience)
const STORAGE_KEYS = {
  SETTINGS_GENERAL: 'probitian_cms_general_settings',
  SETTINGS_SEO: 'probitian_cms_seo_settings',
  LEGAL_POLICIES: 'probitian_cms_legal_policies',
  HOME_PAGE: 'probitian_cms_home_page',
  PROJECTS: 'probitian_cms_projects',
  BLOGS: 'probitian_cms_blogs',
  COURSES: 'probitian_cms_courses',
  VIDEOS: 'probitian_cms_videos',
  MESSAGES: 'probitian_cms_messages',
  NEWSLETTER: 'probitian_cms_newsletter',
  CAMPAIGNS: 'probitian_cms_campaigns',
  SOCIAL_LINKS: 'probitian_cms_social_links',
  NAVIGATION: 'probitian_cms_navigation',
  MEDIA: 'probitian_cms_media',
  CATEGORIES: 'probitian_cms_categories'
};

// INITIAL DEFAULT VALUES
const DEFAULT_GENERAL_SETTINGS: WebsiteGeneralSettings = {
  website_name: 'ProBItian',
  tagline: 'Master Business Intelligence',
  contact_email: 'probitianofficial@gmail.com',
  logo_url: '/logo.svg',
  favicon_url: '/logo.svg',
  banner_url: '/banner.svg',
  theme_color: 'purple',
  footer_copyright: '© 2026 ProBItian. All Rights Reserved.',
  community_hub_name: 'ProBitian Community Hub',
  community_hub_address: 'M93M+688, Salaiya, Madhya Pradesh 486440, India',
  community_hub_maps_url: 'https://maps.app.goo.gl/T4426JADcNHHFPqb7'
};

const DEFAULT_SEO_SETTINGS: SeoSettings = {
  meta_title: 'ProBItian | Master Business Intelligence',
  meta_description: 'Master Power BI, SQL, Excel, Power Query, AI Tools, and Dashboard Design through practical projects and industry-focused tutorials.',
  keywords: 'Power BI, SQL, DAX, Power Query, Data Analytics, Business Intelligence, Excel, AI, ProBItian',
  og_image: '/banner.svg',
  twitter_handle: '@probitian',
  robots_txt: 'User-agent: *\nAllow: /'
};

const DEFAULT_HOME_PAGE: HomePageConfig = {
  hero_heading: 'Master Business Intelligence with Real-World Projects',
  hero_description: 'Learn Power BI, SQL, Excel, Power Query, DAX, Microsoft Fabric, and AI Tools through practical hands-on portfolio projects built by industry experts.',
  buttons: [
    { label: 'Explore Courses', path: 'learn', primary: true },
    { label: 'View Projects', path: 'projects', primary: false }
  ],
  banner_url: '/banner.svg',
  statistics: [
    { label: 'Active Learners', value: '15,000+' },
    { label: 'Tutorial Hours', value: '120+' },
    { label: 'Portfolio Projects', value: '25+' },
    { label: 'Community Rating', value: '4.9/5' }
  ],
  feature_cards: FEATURE_CARDS,
  testimonials: [
    { id: '1', quote: 'ProBItian helped me pivot from finance into a Senior BI Analyst role in 4 months!', author: 'Ankit Sharma', role: 'BI Analyst @ Deloitte', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
    { id: '2', quote: 'The DAX and SQL tutorials are better than paid masterclasses. Highly recommended.', author: 'Priya Patel', role: 'Data Engineer @ Microsoft', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' }
  ],
  cta: {
    heading: 'Ready to Become a Confident BI Professional?',
    subheading: 'Join thousands of data analysts building real portfolios today.',
    button_text: 'Get Started for Free',
    button_link: 'learn'
  }
};

const DEFAULT_SOCIAL_LINKS: SocialLinkItem[] = [
  { id: '1', platform: 'youtube', url: 'https://youtube.com/@probitian', icon: 'Youtube', is_active: true, display_order: 1 },
  { id: '2', platform: 'instagram', url: 'https://instagram.com/probitian', icon: 'Instagram', is_active: true, display_order: 2 },
  { id: '3', platform: 'facebook', url: 'https://facebook.com/probitian', icon: 'Facebook', is_active: true, display_order: 3 },
  { id: '4', platform: 'github', url: 'https://github.com/probitian', icon: 'Github', is_active: true, display_order: 4 },
  { id: '5', platform: 'email', url: 'mailto:probitianofficial@gmail.com', icon: 'Mail', is_active: true, display_order: 5 }
];

const DEFAULT_NAVIGATION: NavigationItem[] = [
  { id: '1', label: 'Home', path: 'home', icon: 'Home', display_order: 1, is_visible: true },
  { id: '2', label: 'Learn', path: 'learn', icon: 'BookOpen', display_order: 2, is_visible: true },
  { id: '3', label: 'Projects', path: 'projects', icon: 'FolderKanban', display_order: 3, is_visible: true },
  { id: '4', label: 'Blog', path: 'blog', icon: 'Newspaper', display_order: 4, is_visible: true },
  { id: '5', label: 'About', path: 'about', icon: 'User', display_order: 5, is_visible: true },
  { id: '6', label: 'Contact', path: 'contact', icon: 'Mail', display_order: 6, is_visible: true }
];

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: 'Power BI', type: 'project', slug: 'power-bi', description: 'Dashboards and reports' },
  { id: 'cat-2', name: 'SQL', type: 'blog', slug: 'sql', description: 'Database queries & joins' },
  { id: 'cat-3', name: 'Excel', type: 'course', slug: 'excel', description: 'Spreadsheet mastery' },
  { id: 'cat-4', name: 'DAX', type: 'blog', slug: 'dax', description: 'Power BI DAX formulas' },
  { id: 'cat-5', name: 'AI Tools', type: 'blog', slug: 'ai-tools', description: 'ChatGPT and Copilot for data' }
];

const DEFAULT_MEDIA: MediaItem[] = [
  { id: 'm-1', filename: 'logo.svg', url: '/logo.svg', size_bytes: 4096, mime_type: 'image/svg+xml', folder: 'branding', created_at: new Date().toISOString() },
  { id: 'm-2', filename: 'banner.svg', url: '/banner.svg', size_bytes: 18400, mime_type: 'image/svg+xml', folder: 'branding', created_at: new Date().toISOString() }
];

// Helper to get from LocalStorage or fallback
function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

/**
 * Safe fetch helper for Express API routes
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
        errorText = json.error || JSON.stringify(json);
      } catch (e) {
        errorText = await response.text();
      }
    } else {
      errorText = await response.text();
    }
    throw new Error(`API ${response.status} (${url}): ${errorText.slice(0, 300)}`);
  }

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON from ${url} but received ${contentType}: ${text.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

// ==================== CMS SERVICE API (EXPRESS ROUTED) ====================

export const cmsService = {
  // --- GENERAL SETTINGS ---
  async getGeneralSettings(): Promise<WebsiteGeneralSettings> {
    try {
      const data = await safeFetchJson<WebsiteGeneralSettings | null>('/api/cms/settings/general');
      if (data && typeof data === 'object') {
        const settings: WebsiteGeneralSettings = {
          website_name: data.website_name || DEFAULT_GENERAL_SETTINGS.website_name,
          tagline: data.tagline || DEFAULT_GENERAL_SETTINGS.tagline,
          contact_email: data.contact_email || DEFAULT_GENERAL_SETTINGS.contact_email,
          logo_url: data.logo_url || DEFAULT_GENERAL_SETTINGS.logo_url,
          favicon_url: data.favicon_url || DEFAULT_GENERAL_SETTINGS.favicon_url,
          banner_url: data.banner_url || DEFAULT_GENERAL_SETTINGS.banner_url,
          theme_color: data.theme_color || DEFAULT_GENERAL_SETTINGS.theme_color,
          footer_copyright: data.footer_copyright || DEFAULT_GENERAL_SETTINGS.footer_copyright,
          community_hub_name: data.community_hub_name || DEFAULT_GENERAL_SETTINGS.community_hub_name,
          community_hub_address: data.community_hub_address || DEFAULT_GENERAL_SETTINGS.community_hub_address,
          community_hub_maps_url: data.community_hub_maps_url || DEFAULT_GENERAL_SETTINGS.community_hub_maps_url
        };
        setLocal(STORAGE_KEYS.SETTINGS_GENERAL, settings);
        return settings;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getGeneralSettings API warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.SETTINGS_GENERAL, DEFAULT_GENERAL_SETTINGS);
  },

  async saveGeneralSettings(settings: WebsiteGeneralSettings): Promise<boolean> {
    setLocal(STORAGE_KEYS.SETTINGS_GENERAL, settings);
    try {
      await safeFetchJson('/api/cms/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return true;
    } catch (e: any) {
      console.error('Failed to save general settings via Express API:', e?.message || e);
      return false;
    }
  },

  // --- SEO SETTINGS ---
  async getSeoSettings(): Promise<SeoSettings> {
    try {
      const data = await safeFetchJson<SeoSettings | null>('/api/cms/settings/seo');
      if (data && typeof data === 'object') {
        const seo: SeoSettings = {
          meta_title: data.meta_title || DEFAULT_SEO_SETTINGS.meta_title,
          meta_description: data.meta_description || DEFAULT_SEO_SETTINGS.meta_description,
          keywords: data.keywords || DEFAULT_SEO_SETTINGS.keywords,
          og_image: data.og_image || DEFAULT_SEO_SETTINGS.og_image,
          twitter_handle: data.twitter_handle || DEFAULT_SEO_SETTINGS.twitter_handle,
          robots_txt: data.robots_txt || DEFAULT_SEO_SETTINGS.robots_txt
        };
        setLocal(STORAGE_KEYS.SETTINGS_SEO, seo);
        return seo;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getSeoSettings API warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.SETTINGS_SEO, DEFAULT_SEO_SETTINGS);
  },

  async saveSeoSettings(seo: SeoSettings): Promise<boolean> {
    setLocal(STORAGE_KEYS.SETTINGS_SEO, seo);
    try {
      await safeFetchJson('/api/cms/settings/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seo)
      });
      return true;
    } catch (e: any) {
      console.error('Failed to save SEO settings via Express API:', e?.message || e);
      return false;
    }
  },

  // --- LEGAL & POLICIES SETTINGS ---
  async getLegalSettings(): Promise<LegalSettings> {
    try {
      const data = await safeFetchJson<LegalSettings | null>('/api/cms/settings/legal');
      if (data && typeof data === 'object' && (data.terms || data.privacy)) {
        setLocal(STORAGE_KEYS.LEGAL_POLICIES, data);
        return data as LegalSettings;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getLegalSettings API warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.LEGAL_POLICIES, DEFAULT_LEGAL_SETTINGS);
  },

  async saveLegalSettings(legal: LegalSettings): Promise<boolean> {
    setLocal(STORAGE_KEYS.LEGAL_POLICIES, legal);
    try {
      await safeFetchJson('/api/cms/settings/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(legal)
      });
      return true;
    } catch (e: any) {
      console.error('Failed to save legal settings via Express API:', e?.message || e);
      return false;
    }
  },

  // --- HOME PAGE CONFIG ---
  async getHomePageConfig(): Promise<HomePageConfig> {
    try {
      const data = await safeFetchJson<HomePageConfig | null>('/api/cms/settings/home');
      if (data && typeof data === 'object' && data.hero_heading) {
        setLocal(STORAGE_KEYS.HOME_PAGE, data);
        return data as HomePageConfig;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getHomePageConfig API warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.HOME_PAGE, DEFAULT_HOME_PAGE);
  },

  async saveHomePageConfig(config: HomePageConfig): Promise<boolean> {
    setLocal(STORAGE_KEYS.HOME_PAGE, config);
    try {
      await safeFetchJson('/api/cms/settings/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return true;
    } catch (e: any) {
      console.error('Failed to save home config via Express API:', e?.message || e);
      return false;
    }
  },

  // --- PROJECTS ---
  async getProjects(): Promise<ProjectItem[]> {
    try {
      const data = await safeFetchJson<any[]>('/api/cms/projects');
      if (Array.isArray(data)) {
        const normalized: ProjectItem[] = data.map((p: any) => ({
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
        setLocal(STORAGE_KEYS.PROJECTS, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getProjects API warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.PROJECTS, PROJECTS);
  },

  async saveProject(project: ProjectItem): Promise<boolean> {
    const list = await this.getProjects();
    const idx = list.findIndex(p => p.id === project.id);
    let updatedList: ProjectItem[];
    if (idx >= 0) {
      updatedList = [...list];
      updatedList[idx] = project;
    } else {
      updatedList = [project, ...list];
    }
    setLocal(STORAGE_KEYS.PROJECTS, updatedList);

    try {
      await safeFetchJson('/api/cms/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      return true;
    } catch (e: any) {
      console.warn('[CMS Service] saveProject API warning:', e?.message || e);
      return false;
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    const list = await this.getProjects();
    const filtered = list.filter(p => p.id !== id);
    setLocal(STORAGE_KEYS.PROJECTS, filtered);

    try {
      await safeFetchJson(`/api/cms/projects/${id}`, { method: 'DELETE' });
      return true;
    } catch (e: any) {
      console.warn('[CMS Service] deleteProject API warning:', e?.message || e);
      return false;
    }
  },

  // --- BLOGS ---
  async getBlogs(): Promise<BlogArticle[]> {
    try {
      const data = await safeFetchJson<any[]>('/api/cms/blogs');
      if (Array.isArray(data)) {
        const normalized: BlogArticle[] = data.map((b: any) => ({
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
        setLocal(STORAGE_KEYS.BLOGS, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getBlogs API warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.BLOGS, BLOG_ARTICLES);
  },

  async saveBlog(blog: BlogArticle): Promise<boolean> {
    const list = await this.getBlogs();
    const idx = list.findIndex(b => b.id === blog.id);
    let updatedList: BlogArticle[];
    if (idx >= 0) {
      updatedList = [...list];
      updatedList[idx] = blog;
    } else {
      updatedList = [blog, ...list];
    }
    setLocal(STORAGE_KEYS.BLOGS, updatedList);

    try {
      await safeFetchJson('/api/cms/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blog)
      });
      return true;
    } catch (e: any) {
      console.warn('[CMS Service] saveBlog API warning:', e?.message || e);
      return false;
    }
  },

  async deleteBlog(id: string): Promise<boolean> {
    const list = await this.getBlogs();
    const filtered = list.filter(b => b.id !== id);
    setLocal(STORAGE_KEYS.BLOGS, filtered);

    try {
      await safeFetchJson(`/api/cms/blogs/${id}`, { method: 'DELETE' });
      return true;
    } catch (e: any) {
      console.warn('[CMS Service] deleteBlog API warning:', e?.message || e);
      return false;
    }
  },

  // --- COURSES / LEARN TOPICS ---
  async getCourses(): Promise<LearnTopic[]> {
    try {
      const data = await safeFetchJson<any[]>('/api/cms/courses');
      if (Array.isArray(data)) {
        const normalized: LearnTopic[] = data.map((c: any) => ({
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
        setLocal(STORAGE_KEYS.COURSES, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getCourses API warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.COURSES, LEARN_TOPICS);
  },

  async saveCourse(course: LearnTopic): Promise<boolean> {
    const list = await this.getCourses();
    const idx = list.findIndex(c => c.id === course.id);
    let updatedList: LearnTopic[];
    if (idx >= 0) {
      updatedList = [...list];
      updatedList[idx] = course;
    } else {
      updatedList = [course, ...list];
    }
    setLocal(STORAGE_KEYS.COURSES, updatedList);

    try {
      await safeFetchJson('/api/cms/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course)
      });
      return true;
    } catch (e: any) {
      console.warn('[CMS Service] saveCourse API warning:', e?.message || e);
      return false;
    }
  },

  async deleteCourse(id: string): Promise<boolean> {
    const list = await this.getCourses();
    const filtered = list.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.COURSES, filtered);

    try {
      await safeFetchJson(`/api/cms/courses/${id}`, { method: 'DELETE' });
      return true;
    } catch (e: any) {
      console.warn('[CMS Service] deleteCourse API warning:', e?.message || e);
      return false;
    }
  },

  // --- YOUTUBE VIDEOS ---
  async getVideos(): Promise<YouTubeVideo[]> {
    try {
      const data = await safeFetchJson<any[]>('/api/cms/videos');
      if (Array.isArray(data)) {
        const normalized: YouTubeVideo[] = data.map((v: any) => ({
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
        setLocal(STORAGE_KEYS.VIDEOS, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getVideos API warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.VIDEOS, YOUTUBE_VIDEOS);
  },

  async saveVideo(video: YouTubeVideo): Promise<boolean> {
    const list = await this.getVideos();
    const idx = list.findIndex(v => v.id === video.id);
    let updatedList: YouTubeVideo[];
    if (idx >= 0) {
      updatedList = [...list];
      updatedList[idx] = video;
    } else {
      updatedList = [video, ...list];
    }
    setLocal(STORAGE_KEYS.VIDEOS, updatedList);

    try {
      await safeFetchJson('/api/cms/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video)
      });
      return true;
    } catch (e: any) {
      console.warn('[CMS Service] saveVideo API warning:', e?.message || e);
      return false;
    }
  },

  async deleteVideo(id: string): Promise<boolean> {
    const list = await this.getVideos();
    const filtered = list.filter(v => v.id !== id);
    setLocal(STORAGE_KEYS.VIDEOS, filtered);

    try {
      await safeFetchJson(`/api/cms/videos/${id}`, { method: 'DELETE' });
      return true;
    } catch (e: any) {
      console.warn('[CMS Service] deleteVideo API warning:', e?.message || e);
      return false;
    }
  },

  // --- CONTACT MESSAGES / REAL ENQUIRIES ---
  async getMessages(): Promise<ContactMessage[]> {
    try {
      const data = await safeFetchJson<any[]>('/api/cms/messages');
      if (Array.isArray(data)) {
        const normalized: ContactMessage[] = data.map((m: any) => ({
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
        setLocal(STORAGE_KEYS.MESSAGES, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('Failed to fetch messages via Express API:', e?.message || e);
    }
    return getLocal<ContactMessage[]>(STORAGE_KEYS.MESSAGES, []);
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
      const responseData = await safeFetchJson<{ success?: boolean; message?: ContactMessage; error?: string }>('/api/cms/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      if (responseData && responseData.message) {
        const list = getLocal<ContactMessage[]>(STORAGE_KEYS.MESSAGES, []);
        setLocal(STORAGE_KEYS.MESSAGES, [responseData.message, ...list]);
      }
      return { success: true };
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
      await this.getMessages(); // Refresh list
      return { success: true, message: data.message || 'Reply sent successfully.' };
    } catch (e: any) {
      console.error('API reply failed:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to send reply via server endpoint.' };
    }
  },

  async updateMessageStatus(id: string, status: ContactMessage['status'], adminNotes?: string): Promise<boolean> {
    try {
      await safeFetchJson(`/api/cms/messages/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
      });
      const list = await this.getMessages();
      const idx = list.findIndex(m => m.id === id);
      if (idx >= 0) {
        list[idx].status = status;
        if (adminNotes !== undefined) list[idx].admin_notes = adminNotes;
        setLocal(STORAGE_KEYS.MESSAGES, list);
      }
      return true;
    } catch (e: any) {
      console.warn('Failed to update message status via API:', e?.message || e);
      return false;
    }
  },

  async deleteMessage(id: string): Promise<boolean> {
    try {
      await safeFetchJson(`/api/cms/messages/${id}`, { method: 'DELETE' });
      const list = await this.getMessages();
      const filtered = list.filter(m => m.id !== id);
      setLocal(STORAGE_KEYS.MESSAGES, filtered);
      return true;
    } catch (e: any) {
      console.warn('Failed to delete message via API:', e?.message || e);
      return false;
    }
  },

  // --- NEWSLETTER SUBSCRIBERS ---
  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    try {
      const data = await safeFetchJson<NewsletterSubscriber[]>('/api/cms/subscribers');
      if (Array.isArray(data)) {
        setLocal(STORAGE_KEYS.NEWSLETTER, data);
        return data as NewsletterSubscriber[];
      }
    } catch (e: any) {
      console.warn('Failed to fetch subscribers via Express API:', e?.message || e);
    }
    return getLocal<NewsletterSubscriber[]>(STORAGE_KEYS.NEWSLETTER, []);
  },

  async subscribeNewsletter(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; message?: string }>('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return { success: true, message: data.message || 'Successfully subscribed!' };
    } catch (e: any) {
      console.warn('Newsletter subscription API error:', e?.message || e);
      throw e;
    }
  },

  async deleteSubscriber(id: string): Promise<boolean> {
    try {
      await safeFetchJson(`/api/cms/subscribers/${id}`, { method: 'DELETE' });
      const list = await this.getNewsletterSubscribers();
      const filtered = list.filter(s => s.id !== id);
      setLocal(STORAGE_KEYS.NEWSLETTER, filtered);
      return true;
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
    }
    const subs = await this.getNewsletterSubscribers();
    const activeCount = subs.filter(s => s.status === 'active').length;
    return { count: activeCount, providerConfigured: false };
  },

  async getCampaigns(): Promise<EmailCampaign[]> {
    try {
      const data = await safeFetchJson<EmailCampaign[]>('/api/admin/email-campaigns');
      if (Array.isArray(data)) {
        setLocal(STORAGE_KEYS.CAMPAIGNS, data);
        return data as EmailCampaign[];
      }
    } catch (e: any) {
      console.warn('Failed to fetch campaigns via API:', e?.message || e);
    }
    return getLocal<EmailCampaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
  },

  async getCampaignById(id: string): Promise<(EmailCampaign & { recipients?: EmailCampaignRecipient[] }) | null> {
    try {
      return await safeFetchJson(`/api/admin/email-campaigns/${id}`);
    } catch (e: any) {
      console.warn(`Failed to fetch campaign ${id} via API:`, e?.message || e);
    }
    const campaigns = await this.getCampaigns();
    return campaigns.find(c => c.id === id) || null;
  },

  async saveCampaign(campaign: Partial<EmailCampaign>): Promise<{ success: boolean; campaign?: EmailCampaign }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; campaign?: EmailCampaign }>('/api/admin/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      });
      if (data && data.campaign) {
        const list = await this.getCampaigns();
        const idx = list.findIndex(c => c.id === data.campaign!.id);
        if (idx >= 0) list[idx] = data.campaign;
        else list.unshift(data.campaign);
        setLocal(STORAGE_KEYS.CAMPAIGNS, list);
        return { success: true, campaign: data.campaign };
      }
    } catch (e: any) {
      console.warn('Failed to save campaign via API:', e?.message || e);
    }

    const fullCampaign: EmailCampaign = {
      id: campaign.id || ('camp-' + Date.now()),
      name: campaign.name || 'Untitled Campaign',
      subject: campaign.subject || '',
      preview_text: campaign.preview_text || '',
      content: campaign.content || '',
      status: campaign.status || 'draft',
      audience_type: campaign.audience_type || 'all_active',
      scheduled_at: campaign.scheduled_at,
      total_recipients: campaign.total_recipients || 0,
      successful_count: campaign.successful_count || 0,
      failed_count: campaign.failed_count || 0,
      created_at: campaign.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const list = await this.getCampaigns();
    const idx = list.findIndex(c => c.id === fullCampaign.id);
    if (idx >= 0) list[idx] = fullCampaign;
    else list.unshift(fullCampaign);
    setLocal(STORAGE_KEYS.CAMPAIGNS, list);

    return { success: true, campaign: fullCampaign };
  },

  async deleteCampaign(id: string): Promise<boolean> {
    try {
      await safeFetchJson(`/api/admin/email-campaigns/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Failed to delete campaign via API:', e?.message || e);
    }
    const list = await this.getCampaigns();
    const filtered = list.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.CAMPAIGNS, filtered);
    return true;
  },

  async sendTestCampaign(id: string, testEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = await safeFetchJson<{ success?: boolean; message?: string }>(`/api/admin/email-campaigns/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });
      return { success: Boolean(data.success), message: data.message || 'Test request processed.' };
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
      if (data && data.campaign) {
        await this.getCampaigns();
      }
      return { success: Boolean(data.success), message: data.message || 'Send request completed.', campaign: data.campaign };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to dispatch bulk campaign.' };
    }
  },

  // --- SOCIAL LINKS ---
  async getSocialLinks(): Promise<SocialLinkItem[]> {
    try {
      const data = await safeFetchJson<any[]>('/api/cms/social');
      if (Array.isArray(data)) {
        const normalized: SocialLinkItem[] = data.map((s: any) => ({
          id: String(s.id),
          platform: s.platform || 'youtube',
          url: s.url || '',
          icon: s.icon || 'Youtube',
          is_active: s.is_active !== false,
          display_order: s.display_order ?? 0
        }));
        setLocal(STORAGE_KEYS.SOCIAL_LINKS, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('Social links fetch warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.SOCIAL_LINKS, DEFAULT_SOCIAL_LINKS);
  },

  async saveSocialLink(item: SocialLinkItem): Promise<boolean> {
    const list = await this.getSocialLinks();
    const idx = list.findIndex(s => s.id === item.id);
    let updated: SocialLinkItem[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [...list, item];
    }
    setLocal(STORAGE_KEYS.SOCIAL_LINKS, updated);

    try {
      await safeFetchJson('/api/cms/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      return true;
    } catch (e: any) {
      console.warn('Failed to save social links via API:', e?.message || e);
      return false;
    }
  },

  // --- NAVIGATION ---
  async getNavigation(): Promise<NavigationItem[]> {
    try {
      const data = await safeFetchJson<any[]>('/api/cms/navigation');
      if (Array.isArray(data)) {
        const normalized: NavigationItem[] = data.map((n: any) => ({
          id: String(n.id),
          label: n.label || '',
          path: n.path || '',
          icon: n.icon || 'Home',
          display_order: n.display_order ?? 0,
          is_visible: n.is_visible !== false
        }));
        setLocal(STORAGE_KEYS.NAVIGATION, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('Navigation fetch warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.NAVIGATION, DEFAULT_NAVIGATION);
  },

  async saveNavigation(items: NavigationItem[]): Promise<boolean> {
    setLocal(STORAGE_KEYS.NAVIGATION, items);
    try {
      await safeFetchJson('/api/cms/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });
      return true;
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
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to upload asset to Supabase Storage.'
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
    try {
      const data = await safeFetchJson<any[]>('/api/cms/media');
      if (Array.isArray(data)) {
        const normalized: MediaItem[] = data.map((m: any) => ({
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
        setLocal(STORAGE_KEYS.MEDIA, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('Media fetch warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.MEDIA, DEFAULT_MEDIA);
  },

  async addMediaItem(item: Omit<MediaItem, 'id' | 'created_at'>): Promise<MediaItem> {
    const newItem: MediaItem = {
      ...item,
      id: 'm-' + Date.now(),
      created_at: new Date().toISOString()
    };
    const list = await this.getMediaItems();
    setLocal(STORAGE_KEYS.MEDIA, [newItem, ...list]);

    try {
      const resData = await safeFetchJson<{ success?: boolean; media?: MediaItem }>('/api/cms/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (resData && resData.media) return resData.media as MediaItem;
    } catch (e: any) {
      console.warn('Add media item API warning:', e?.message || e);
    }
    return newItem;
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
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Network error deleting media item.'
      };
    }

    const list = await this.getMediaItems();
    const filtered = list.filter(m => m.id !== id);
    setLocal(STORAGE_KEYS.MEDIA, filtered);
    return { success: true };
  },

  // --- CATEGORIES ---
  async getCategories(): Promise<CategoryItem[]> {
    try {
      const data = await safeFetchJson<any[]>('/api/cms/categories');
      if (Array.isArray(data)) {
        const normalized: CategoryItem[] = data.map((c: any) => ({
          id: String(c.id),
          name: c.name || '',
          type: c.type || 'project',
          slug: c.slug || (c.name ? c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'category'),
          description: c.description || ''
        }));
        setLocal(STORAGE_KEYS.CATEGORIES, normalized);
        return normalized;
      }
    } catch (e: any) {
      console.warn('Categories fetch warning:', e?.message || e);
    }
    return getLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },

  async saveCategory(cat: CategoryItem): Promise<boolean> {
    const list = await this.getCategories();
    const idx = list.findIndex(c => c.id === cat.id);
    let updated: CategoryItem[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = cat;
    } else {
      updated = [...list, cat];
    }
    setLocal(STORAGE_KEYS.CATEGORIES, updated);

    try {
      await safeFetchJson('/api/cms/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
      });
      return true;
    } catch (e: any) {
      console.warn('Failed to save category via API:', e?.message || e);
      return false;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    const list = await this.getCategories();
    const filtered = list.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.CATEGORIES, filtered);

    try {
      await safeFetchJson(`/api/cms/categories/${id}`, { method: 'DELETE' });
      return true;
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
      setLocal(STORAGE_KEYS.PROJECTS, data.projects);
      for (const p of data.projects) await this.saveProject(p);
    }
    if (data.blogs && Array.isArray(data.blogs)) {
      setLocal(STORAGE_KEYS.BLOGS, data.blogs);
      for (const b of data.blogs) await this.saveBlog(b);
    }
    if (data.courses && Array.isArray(data.courses)) {
      setLocal(STORAGE_KEYS.COURSES, data.courses);
      for (const c of data.courses) await this.saveCourse(c);
    }
    if (data.videos && Array.isArray(data.videos)) {
      setLocal(STORAGE_KEYS.VIDEOS, data.videos);
      for (const v of data.videos) await this.saveVideo(v);
    }
    return true;
  }
};
