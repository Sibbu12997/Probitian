import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  YOUTUBE_VIDEOS,
  WHY_PROBITIAN_CARDS
} from '../data/mockData';

import { DEFAULT_LEGAL_SETTINGS, LegalSettings } from '../data/defaultLegalData';

// LOCAL STORAGE KEYS
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
  contact_email: 'Probitianofficial@gmail.com',
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
  { id: '5', platform: 'email', url: 'mailto:Probitianofficial@gmail.com', icon: 'Mail', is_active: true, display_order: 5 }
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

// Helper to get from LocalStorage or default
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
 * Helper to safely perform API fetch requests and guarantee JSON response handling.
 * Throws a descriptive error if the status is not OK or if the response is HTML.
 */
async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
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

// ==================== CMS SERVICE API ====================

export const cmsService = {
  // --- GENERAL SETTINGS ---
  async getGeneralSettings(): Promise<WebsiteGeneralSettings> {
    try {
      const data = await safeFetchJson<WebsiteGeneralSettings | null>('/api/cms/settings/general');
      if (data && data.logo_url) {
        setLocal(STORAGE_KEYS.SETTINGS_GENERAL, data);
        return data as WebsiteGeneralSettings;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getGeneralSettings API error:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'general').single();
        if (data?.value) return data.value as WebsiteGeneralSettings;
      } catch (err) {
        console.warn('Supabase fetch general settings error, using fallback:', err);
      }
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
    } catch (e: any) {
      console.error('Failed to post general settings to server store:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('settings').upsert({ key: 'general', value: settings, updated_at: new Date().toISOString() });
      } catch (err) {
        console.error('Supabase save error:', err);
      }
    }
    return true;
  },

  // --- SEO SETTINGS ---
  async getSeoSettings(): Promise<SeoSettings> {
    try {
      const data = await safeFetchJson<SeoSettings | null>('/api/cms/settings/seo');
      if (data && data.meta_title) {
        setLocal(STORAGE_KEYS.SETTINGS_SEO, data);
        return data as SeoSettings;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getSeoSettings API error:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'seo').single();
        if (data?.value) return data.value as SeoSettings;
      } catch (e) {}
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
    } catch (e: any) {
      console.error('Failed to post SEO settings to server store:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('settings').upsert({ key: 'seo', value: seo, updated_at: new Date().toISOString() });
      } catch (e) {}
    }
    return true;
  },

  // --- LEGAL & POLICIES SETTINGS ---
  async getLegalSettings(): Promise<LegalSettings> {
    try {
      const data = await safeFetchJson<LegalSettings | null>('/api/cms/settings/legal');
      if (data && data.terms && data.privacy) {
        setLocal(STORAGE_KEYS.LEGAL_POLICIES, data);
        return data as LegalSettings;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getLegalSettings API error:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'legal_policies').single();
        if (data?.value) return data.value as LegalSettings;
      } catch (e) {}
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
    } catch (e: any) {
      console.error('Failed to post legal settings to server store:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('settings').upsert({ key: 'legal_policies', value: legal, updated_at: new Date().toISOString() });
      } catch (e) {}
    }
    return true;
  },

  // --- HOME PAGE CONFIG ---
  async getHomePageConfig(): Promise<HomePageConfig> {
    try {
      const data = await safeFetchJson<HomePageConfig | null>('/api/cms/settings/home');
      if (data && data.hero_heading) {
        setLocal(STORAGE_KEYS.HOME_PAGE, data);
        return data as HomePageConfig;
      }
    } catch (e: any) {
      console.warn('[CMS Service] getHomePageConfig API error:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('pages').select('*').eq('page_key', 'home').single();
        if (data) {
          return {
            hero_heading: data.hero_heading || DEFAULT_HOME_PAGE.hero_heading,
            hero_description: data.hero_description || DEFAULT_HOME_PAGE.hero_description,
            buttons: data.buttons || DEFAULT_HOME_PAGE.buttons,
            banner_url: data.banner_url || DEFAULT_HOME_PAGE.banner_url,
            statistics: data.statistics || DEFAULT_HOME_PAGE.statistics,
            feature_cards: data.feature_cards || DEFAULT_HOME_PAGE.feature_cards,
            testimonials: data.testimonials || DEFAULT_HOME_PAGE.testimonials,
            cta: data.cta || DEFAULT_HOME_PAGE.cta
          };
        }
      } catch (e) {}
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
    } catch (e: any) {
      console.error('Failed to post home config to server store:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('pages').upsert({
          page_key: 'home',
          title: 'Home Page Configuration',
          hero_heading: config.hero_heading,
          hero_description: config.hero_description,
          buttons: config.buttons,
          banner_url: config.banner_url,
          statistics: config.statistics,
          feature_cards: config.feature_cards,
          testimonials: config.testimonials,
          cta: config.cta,
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    }
    return true;
  },

  // --- PROJECTS ---
  async getProjects(): Promise<ProjectItem[]> {
    try {
      const data = await safeFetchJson<ProjectItem[]>('/api/cms/projects');
      if (Array.isArray(data) && data.length > 0) {
        setLocal(STORAGE_KEYS.PROJECTS, data);
        return data as ProjectItem[];
      }
    } catch (e: any) {
      console.warn('[CMS Service] getProjects API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          return data.map(p => ({
            id: p.id,
            title: p.title,
            category: p.category,
            description: p.description,
            fullDescription: p.full_description || p.description,
            toolsUsed: p.tools_used || [],
            imagePlaceholder: p.image_url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
            galleryUrls: p.gallery_urls || [],
            kpis: p.kpis || [],
            featured: p.featured,
            published: p.published !== false,
            githubUrl: p.github_url,
            liveDemoUrl: p.live_demo_url,
            youtubeUrl: p.youtube_url,
            tags: p.tags || [],
            created_at: p.created_at
          }));
        }
      } catch (e) {}
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
    } catch (e: any) {
      console.warn('[CMS Service] saveProject API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('projects').upsert({
          id: project.id.includes('-') && project.id.length > 20 ? project.id : undefined,
          title: project.title,
          category: project.category,
          description: project.description,
          full_description: project.fullDescription,
          tools_used: project.toolsUsed,
          image_url: project.imagePlaceholder,
          gallery_urls: project.galleryUrls || [],
          kpis: project.kpis,
          featured: project.featured,
          published: project.published !== false,
          github_url: project.githubUrl,
          live_demo_url: project.liveDemoUrl,
          youtube_url: project.youtubeUrl,
          tags: project.tags || [],
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    }
    return true;
  },

  async deleteProject(id: string): Promise<boolean> {
    const list = await this.getProjects();
    const filtered = list.filter(p => p.id !== id);
    setLocal(STORAGE_KEYS.PROJECTS, filtered);

    try {
      await safeFetchJson(`/api/cms/projects/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('[CMS Service] deleteProject API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('projects').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- BLOGS ---
  async getBlogs(): Promise<BlogArticle[]> {
    try {
      const data = await safeFetchJson<BlogArticle[]>('/api/cms/blogs');
      if (Array.isArray(data) && data.length > 0) {
        setLocal(STORAGE_KEYS.BLOGS, data);
        return data as BlogArticle[];
      }
    } catch (e: any) {
      console.warn('[CMS Service] getBlogs API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          return data.map(b => ({
            id: b.id,
            title: b.title,
            slug: b.slug,
            excerpt: b.excerpt,
            content: b.content,
            category: b.category,
            tags: b.tags || [],
            date: new Date(b.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            readTime: b.read_time || '5 min read',
            author: b.author || 'Shivam Baghel',
            imageUrl: b.featured_image || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
            status: b.status || 'published',
            scheduledAt: b.scheduled_at,
            created_at: b.created_at
          }));
        }
      } catch (e) {}
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
    } catch (e: any) {
      console.warn('[CMS Service] saveBlog API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const slug = blog.slug || blog.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await supabase.from('blogs').upsert({
          id: blog.id.includes('-') && blog.id.length > 20 ? blog.id : undefined,
          title: blog.title,
          slug,
          excerpt: blog.excerpt,
          content: blog.content,
          category: blog.category,
          tags: blog.tags || [],
          featured_image: blog.imageUrl,
          author: blog.author,
          read_time: blog.readTime,
          status: blog.status || 'published',
          scheduled_at: blog.scheduledAt,
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    }
    return true;
  },

  async deleteBlog(id: string): Promise<boolean> {
    const list = await this.getBlogs();
    const filtered = list.filter(b => b.id !== id);
    setLocal(STORAGE_KEYS.BLOGS, filtered);

    try {
      await safeFetchJson(`/api/cms/blogs/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('[CMS Service] deleteBlog API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('blogs').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- COURSES / LEARN TOPICS ---
  async getCourses(): Promise<LearnTopic[]> {
    try {
      const data = await safeFetchJson<LearnTopic[]>('/api/cms/courses');
      if (Array.isArray(data) && data.length > 0) {
        setLocal(STORAGE_KEYS.COURSES, data);
        return data as LearnTopic[];
      }
    } catch (e: any) {
      console.warn('[CMS Service] getCourses API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          return data.map(c => ({
            id: c.id,
            title: c.title,
            slug: c.slug,
            icon: c.icon || 'BarChart3',
            level: c.level || 'All Levels',
            description: c.description,
            modulesCount: c.modules_count || 5,
            duration: c.duration || '5 Hours',
            keyTakeaways: c.key_takeaways || [],
            syllabus: c.syllabus || [],
            thumbnail: c.thumbnail,
            videoUrl: c.video_url,
            pdfUrl: c.pdf_url,
            category: c.category,
            published: c.published !== false,
            resources: c.resources || [],
            created_at: c.created_at
          }));
        }
      } catch (e) {}
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
    } catch (e: any) {
      console.warn('[CMS Service] saveCourse API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const slug = course.slug || course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await supabase.from('courses').upsert({
          id: course.id.includes('-') && course.id.length > 20 ? course.id : undefined,
          title: course.title,
          slug,
          icon: course.icon,
          level: course.level,
          description: course.description,
          category: course.category || 'Data Analytics',
          thumbnail: course.thumbnail,
          video_url: course.videoUrl,
          pdf_url: course.pdfUrl,
          modules_count: course.modulesCount,
          duration: course.duration,
          key_takeaways: course.keyTakeaways,
          syllabus: course.syllabus,
          resources: course.resources || [],
          published: course.published !== false,
          updated_at: new Date().toISOString()
        });
      } catch (e) {}
    }
    return true;
  },

  async deleteCourse(id: string): Promise<boolean> {
    const list = await this.getCourses();
    const filtered = list.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.COURSES, filtered);

    try {
      await safeFetchJson(`/api/cms/courses/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('[CMS Service] deleteCourse API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('courses').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- YOUTUBE VIDEOS ---
  async getVideos(): Promise<YouTubeVideo[]> {
    try {
      const data = await safeFetchJson<YouTubeVideo[]>('/api/cms/videos');
      if (Array.isArray(data) && data.length > 0) {
        setLocal(STORAGE_KEYS.VIDEOS, data);
        return data as YouTubeVideo[];
      }
    } catch (e: any) {
      console.warn('[CMS Service] getVideos API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          return data.map(v => ({
            id: v.id,
            title: v.title,
            description: v.description || '',
            thumbnail: v.thumbnail,
            duration: v.duration || '10:00',
            views: v.views || '1K views',
            url: v.youtube_url,
            youtubeId: v.youtube_id,
            category: v.category,
            playlist: v.playlist,
            tags: v.tags || [],
            created_at: v.created_at
          }));
        }
      } catch (e) {}
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
    } catch (e: any) {
      console.warn('[CMS Service] saveVideo API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('videos').upsert({
          id: video.id.includes('-') && video.id.length > 20 ? video.id : undefined,
          title: video.title,
          description: video.description,
          youtube_url: video.url,
          youtube_id: video.youtubeId || 'video-id',
          thumbnail: video.thumbnail,
          duration: video.duration,
          views: video.views,
          category: video.category || 'Power BI',
          playlist: video.playlist,
          tags: video.tags || []
        });
      } catch (e) {}
    }
    return true;
  },

  async deleteVideo(id: string): Promise<boolean> {
    const list = await this.getVideos();
    const filtered = list.filter(v => v.id !== id);
    setLocal(STORAGE_KEYS.VIDEOS, filtered);

    try {
      await safeFetchJson(`/api/cms/videos/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('[CMS Service] deleteVideo API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('videos').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- CONTACT MESSAGES / REAL ENQUIRIES ---
  async getMessages(): Promise<ContactMessage[]> {
    try {
      const data = await safeFetchJson<ContactMessage[]>('/api/cms/messages');
      if (Array.isArray(data)) {
        setLocal(STORAGE_KEYS.MESSAGES, data);
        return data as ContactMessage[];
      }
    } catch (e: any) {
      console.warn('Failed to fetch backend messages:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          const sbMsgs: ContactMessage[] = data.map((m: any) => ({
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
          return sbMsgs;
        }
      } catch (e) {
        console.error('Error fetching messages from Supabase:', e);
      }
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
      const responseData = await safeFetchJson<{ message?: ContactMessage }>('/api/cms/messages', {
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
      console.error('Backend submission failed:', e?.message || e);
    }

    const newMsg: ContactMessage = {
      id: 'msg-' + Date.now(),
      name: msg.name,
      email: msg.email,
      phone: msg.phone,
      course_interested: msg.course_interested || '',
      subject: msg.subject || '',
      message: msg.message,
      status: 'new',
      created_at: new Date().toISOString()
    };

    const list = getLocal<ContactMessage[]>(STORAGE_KEYS.MESSAGES, []);
    setLocal(STORAGE_KEYS.MESSAGES, [newMsg, ...list]);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('messages').insert({
          name: msg.name,
          email: msg.email,
          phone: msg.phone,
          course_interested: msg.course_interested || null,
          subject: msg.subject || null,
          message: msg.message,
          status: 'new'
        });
      } catch (e) {}
    }

    return { success: true };
  },

  async sendReplyMessage(
    id: string,
    replyText: string,
    replySubject?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const data = await safeFetchJson<{ message?: string }>(`/api/cms/messages/${id}/reply`, {
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
    }

    return { success: false, message: 'Failed to send reply via server endpoint.' };
  },

  async updateMessageStatus(id: string, status: ContactMessage['status'], adminNotes?: string): Promise<boolean> {
    try {
      await safeFetchJson(`/api/cms/messages/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
      });
    } catch (e: any) {
      console.warn('Failed to update message status:', e?.message || e);
    }

    const list = await this.getMessages();
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) {
      list[idx].status = status;
      if (adminNotes !== undefined) list[idx].admin_notes = adminNotes;
      setLocal(STORAGE_KEYS.MESSAGES, list);
    }
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('messages').update({ status, admin_notes: adminNotes }).eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  async deleteMessage(id: string): Promise<boolean> {
    try {
      await safeFetchJson(`/api/cms/messages/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Failed to delete message:', e?.message || e);
    }

    const list = await this.getMessages();
    const filtered = list.filter(m => m.id !== id);
    setLocal(STORAGE_KEYS.MESSAGES, filtered);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('messages').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
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
      console.warn('Failed to fetch subscribers:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('newsletter').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          const sbSubs: NewsletterSubscriber[] = data.map((s: any) => ({
            id: String(s.id || ('sub-' + s.created_at)),
            email: s.email || '',
            status: s.status || 'active',
            created_at: s.created_at || new Date().toISOString()
          }));
          return sbSubs;
        }
      } catch (e) {}
    }
    return getLocal<NewsletterSubscriber[]>(STORAGE_KEYS.NEWSLETTER, []);
  },

  async subscribeNewsletter(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = await safeFetchJson<{ message?: string }>('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      await this.getNewsletterSubscribers();
      return { success: true, message: data.message || 'Successfully subscribed!' };
    } catch (e: any) {
      console.warn('Failed to subscribe via API:', e?.message || e);
    }

    const newSub: NewsletterSubscriber = {
      id: 'sub-' + Date.now(),
      email,
      status: 'active',
      created_at: new Date().toISOString()
    };
    const list = await this.getNewsletterSubscribers();
    setLocal(STORAGE_KEYS.NEWSLETTER, [newSub, ...list]);

    return { success: true, message: 'Thank you for subscribing to ProBitian updates!' };
  },

  async deleteSubscriber(id: string): Promise<boolean> {
    try {
      await safeFetchJson(`/api/cms/subscribers/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Failed to delete subscriber:', e?.message || e);
    }

    const list = await this.getNewsletterSubscribers();
    const filtered = list.filter(s => s.id !== id);
    setLocal(STORAGE_KEYS.NEWSLETTER, filtered);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('newsletter').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- EMAIL CAMPAIGNS ---
  async getCampaignAudienceCount(): Promise<{ count: number; providerConfigured: boolean }> {
    try {
      const data = await safeFetchJson<{ count?: number; providerConfigured?: boolean }>('/api/admin/email-campaigns/audience-count');
      return { count: data.count || 0, providerConfigured: Boolean(data.providerConfigured) };
    } catch (e: any) {
      console.warn('Failed to fetch audience count:', e?.message || e);
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
      console.warn('Failed to fetch campaigns:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) return data as EmailCampaign[];
      } catch (e) {}
    }

    return getLocal<EmailCampaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
  },

  async getCampaignById(id: string): Promise<(EmailCampaign & { recipients?: EmailCampaignRecipient[] }) | null> {
    try {
      return await safeFetchJson(`/api/admin/email-campaigns/${id}`);
    } catch (e: any) {
      console.warn(`Failed to fetch campaign ${id}:`, e?.message || e);
    }

    const campaigns = await this.getCampaigns();
    return campaigns.find(c => c.id === id) || null;
  },

  async saveCampaign(campaign: Partial<EmailCampaign>): Promise<{ success: boolean; campaign?: EmailCampaign }> {
    try {
      const data = await safeFetchJson<{ campaign?: EmailCampaign }>('/api/admin/email-campaigns', {
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
      console.warn('Failed to save campaign:', e?.message || e);
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

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('email_campaigns').upsert(fullCampaign);
      } catch (e) {}
    }

    return { success: true, campaign: fullCampaign };
  },

  async deleteCampaign(id: string): Promise<boolean> {
    try {
      await safeFetchJson(`/api/admin/email-campaigns/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Failed to delete campaign:', e?.message || e);
    }

    const list = await this.getCampaigns();
    const filtered = list.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.CAMPAIGNS, filtered);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('email_campaigns').delete().eq('id', id);
      } catch (e) {}
    }

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
      const data = await safeFetchJson<SocialLinkItem[]>('/api/cms/social');
      if (Array.isArray(data) && data.length > 0) {
        setLocal(STORAGE_KEYS.SOCIAL_LINKS, data);
        return data as SocialLinkItem[];
      }
    } catch (e: any) {
      console.warn('Social links fetch warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('social_links').select('*').order('display_order', { ascending: true });
        if (data && data.length > 0) return data as SocialLinkItem[];
      } catch (e) {}
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
    } catch (e: any) {
      console.warn('Failed to save social links via API:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('social_links').upsert({
          id: item.id.length > 20 ? item.id : undefined,
          platform: item.platform,
          url: item.url,
          icon: item.icon,
          is_active: item.is_active,
          display_order: item.display_order
        });
      } catch (e) {}
    }
    return true;
  },

  // --- NAVIGATION ---
  async getNavigation(): Promise<NavigationItem[]> {
    try {
      const data = await safeFetchJson<NavigationItem[]>('/api/cms/navigation');
      if (Array.isArray(data) && data.length > 0) {
        setLocal(STORAGE_KEYS.NAVIGATION, data);
        return data as NavigationItem[];
      }
    } catch (e: any) {
      console.warn('Navigation fetch warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('navigation').select('*').order('display_order', { ascending: true });
        if (data && data.length > 0) return data as NavigationItem[];
      } catch (e) {}
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
    } catch (e: any) {
      console.warn('Failed to save navigation via API:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        for (const nav of items) {
          await supabase.from('navigation').upsert({
            id: nav.id.length > 20 ? nav.id : undefined,
            label: nav.label,
            path: nav.path,
            icon: nav.icon,
            display_order: nav.display_order,
            is_visible: nav.is_visible
          });
        }
      } catch (e) {}
    }
    return true;
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
      const data = await safeFetchJson<MediaItem[]>('/api/cms/media');
      if (Array.isArray(data)) {
        setLocal(STORAGE_KEYS.MEDIA, data);
        return data as MediaItem[];
      }
    } catch (e: any) {
      console.warn('Media fetch warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('media').select('*').order('created_at', { ascending: false });
        if (data) return data as MediaItem[];
      } catch (e) {}
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
      const resData = await safeFetchJson<{ media?: MediaItem }>('/api/cms/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (resData && resData.media) return resData.media as MediaItem;
    } catch (e: any) {
      console.warn('Add media item API warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('media').insert({
          filename: item.filename,
          url: item.url,
          size_bytes: item.size_bytes,
          mime_type: item.mime_type,
          folder: item.folder
        }).select().single();
        if (data) return data as MediaItem;
      } catch (e) {}
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
      const data = await safeFetchJson<CategoryItem[]>('/api/cms/categories');
      if (Array.isArray(data) && data.length > 0) {
        setLocal(STORAGE_KEYS.CATEGORIES, data);
        return data as CategoryItem[];
      }
    } catch (e: any) {
      console.warn('Categories fetch warning:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('categories').select('*');
        if (data && data.length > 0) return data as CategoryItem[];
      } catch (e) {}
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
    } catch (e: any) {
      console.warn('Failed to save category via API:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('categories').upsert({
          id: cat.id.length > 20 ? cat.id : undefined,
          name: cat.name,
          type: cat.type,
          slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: cat.description
        });
      } catch (e) {}
    }
    return true;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const list = await this.getCategories();
    const filtered = list.filter(c => c.id !== id);
    setLocal(STORAGE_KEYS.CATEGORIES, filtered);

    try {
      await safeFetchJson(`/api/cms/categories/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Failed to delete category via API:', e?.message || e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
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
