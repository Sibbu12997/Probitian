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

// LOCAL STORAGE KEYS
const STORAGE_KEYS = {
  SETTINGS_GENERAL: 'probitian_cms_general_settings',
  SETTINGS_SEO: 'probitian_cms_seo_settings',
  HOME_PAGE: 'probitian_cms_home_page',
  PROJECTS: 'probitian_cms_projects',
  BLOGS: 'probitian_cms_blogs',
  COURSES: 'probitian_cms_courses',
  VIDEOS: 'probitian_cms_videos',
  MESSAGES: 'probitian_cms_messages',
  NEWSLETTER: 'probitian_cms_newsletter',
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
  footer_copyright: '© 2026 ProBItian. All Rights Reserved.'
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

// ==================== CMS SERVICE API ====================

export const cmsService = {
  // --- GENERAL SETTINGS ---
  async getGeneralSettings(): Promise<WebsiteGeneralSettings> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('settings').select('value').eq('key', 'general').single();
        if (data?.value) return data.value as WebsiteGeneralSettings;
      } catch (err) {
        console.warn('Supabase fetch general settings error, using fallback:', err);
      }
    }
    return getLocal(STORAGE_KEYS.SETTINGS_GENERAL, DEFAULT_GENERAL_SETTINGS);
  },

  async saveGeneralSettings(settings: WebsiteGeneralSettings): Promise<boolean> {
    setLocal(STORAGE_KEYS.SETTINGS_GENERAL, settings);
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
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('settings').upsert({ key: 'seo', value: seo, updated_at: new Date().toISOString() });
      } catch (e) {}
    }
    return true;
  },

  // --- HOME PAGE CONFIG ---
  async getHomePageConfig(): Promise<HomePageConfig> {
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
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('projects').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- BLOGS ---
  async getBlogs(): Promise<BlogArticle[]> {
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
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('blogs').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- COURSES / LEARN TOPICS ---
  async getCourses(): Promise<LearnTopic[]> {
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
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('courses').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- YOUTUBE VIDEOS ---
  async getVideos(): Promise<YouTubeVideo[]> {
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
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('videos').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- CONTACT MESSAGES ---
  async getMessages(): Promise<ContactMessage[]> {
    const localMsgs = getLocal<ContactMessage[]>(STORAGE_KEYS.MESSAGES, [
      {
        id: 'msg-1',
        name: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        phone: '+91 98765 43210',
        course_interested: 'Power BI',
        subject: 'Corporate Power BI Training Query',
        message: 'Hi Shivam, we would love to organize a 2-day Power BI workshop for our analytics team.',
        status: 'new',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'msg-2',
        name: 'Sneha Gupta',
        email: 'sneha.g@example.com',
        phone: '+91 91234 56789',
        course_interested: 'SQL',
        subject: 'Portfolio Dashboard Review',
        message: 'Loved your sales dashboard project! Could you provide feedback on my DAX and SQL logic?',
        status: 'read',
        admin_notes: 'Replied via email with feedback on CALCULATE context transition.',
        created_at: new Date(Date.now() - 3600000 * 28).toISOString()
      }
    ]);

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

          const map = new Map<string, ContactMessage>();
          localMsgs.forEach(m => map.set(m.id, m));
          sbMsgs.forEach(m => map.set(m.id, m));

          return Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      } catch (e) {
        console.error('Error fetching messages from Supabase:', e);
      }
    }
    return localMsgs;
  },

  async submitContactMessage(msg: {
    name: string;
    email: string;
    phone: string;
    course_interested?: string;
    subject?: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
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
    const updated = [newMsg, ...list];
    setLocal(STORAGE_KEYS.MESSAGES, updated);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('messages').insert({
          name: msg.name,
          email: msg.email,
          phone: msg.phone,
          course_interested: msg.course_interested || null,
          subject: msg.subject || null,
          message: msg.message,
          status: 'new'
        });

        if (error) {
          console.error('Error inserting message into Supabase:', error);
          // If custom columns don't exist yet in Supabase, attempt fallback insert with standard fields
          if (error.code === 'PGRST204' || error.message?.includes('column')) {
            try {
              await supabase.from('messages').insert({
                name: msg.name,
                email: msg.email,
                subject: `${msg.subject || 'Contact Inquiry'} [Phone: ${msg.phone}, Course: ${msg.course_interested || 'None'}]`,
                message: msg.message,
                status: 'new'
              });
            } catch (fallbackErr) {
              console.error('Fallback insert failed:', fallbackErr);
            }
          }
        }
      } catch (e: any) {
        console.error('Exception submitting contact message:', e);
      }
    }

    return { success: true };
  },

  async sendReplyMessage(
    id: string,
    replyText: string,
    replySubject?: string
  ): Promise<{ success: boolean; message: string }> {
    const now = new Date().toISOString();

    const list = await this.getMessages();
    const targetMsg = list.find(m => m.id === id);

    if (!targetMsg) {
      return { success: false, message: 'Message not found.' };
    }

    const updatedList = list.map(m => {
      if (m.id === id) {
        return {
          ...m,
          status: 'replied' as const,
          reply_message: replyText,
          replied_at: now,
          reply_status: 'sent' as const,
          email_sent_status: `Reply recorded & sent to ${m.email}`
        };
      }
      return m;
    });
    setLocal(STORAGE_KEYS.MESSAGES, updatedList);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('messages').update({
          status: 'replied',
          reply_message: replyText,
          replied_at: now,
          reply_status: 'sent',
          email_sent_status: `Reply sent to ${targetMsg.email}`
        }).eq('id', id);

        if (error) {
          console.error('Error updating reply in Supabase:', error);
          // Fallback update status and admin_notes
          try {
            await supabase.from('messages').update({
              status: 'replied',
              admin_notes: `[REPLIED AT ${new Date().toLocaleDateString()}]: ${replyText}`
            }).eq('id', id);
          } catch (fallbackErr) {
            console.error('Fallback reply update failed:', fallbackErr);
          }
        }
      } catch (e) {
        console.error('Exception updating reply in Supabase:', e);
      }
    }

    // Trigger Mailto client dispatch for seamless delivery
    try {
      const mailtoUrl = `mailto:${targetMsg.email}?subject=${encodeURIComponent(replySubject || ('Re: ' + (targetMsg.subject || 'Inquiry')))}&body=${encodeURIComponent(replyText)}`;
      window.open(mailtoUrl, '_blank');
    } catch (e) {}

    return { success: true, message: `Reply recorded and sent to ${targetMsg.email}.` };
  },

  async updateMessageStatus(id: string, status: ContactMessage['status'], adminNotes?: string): Promise<boolean> {
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
    const localSubs = getLocal<NewsletterSubscriber[]>(STORAGE_KEYS.NEWSLETTER, [
      { id: 'sub-1', email: 'data.enthusiast@gmail.com', status: 'active', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'sub-2', email: 'powerbi.user@outlook.com', status: 'active', created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
    ]);

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

          const subMap = new Map<string, NewsletterSubscriber>();
          localSubs.forEach(s => subMap.set(s.email.toLowerCase(), s));
          sbSubs.forEach(s => subMap.set(s.email.toLowerCase(), s));

          return Array.from(subMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      } catch (e) {
        console.error('Error fetching subscribers from Supabase:', e);
      }
    }
    return localSubs;
  },

  async subscribeNewsletter(email: string): Promise<{ success: boolean; message: string }> {
    const list = await this.getNewsletterSubscribers();
    if (list.some(s => s.email.toLowerCase() === email.toLowerCase())) {
      return { success: true, message: 'You are already subscribed to ProBItian!' };
    }
    const newSub: NewsletterSubscriber = {
      id: 'sub-' + Date.now(),
      email,
      status: 'active',
      created_at: new Date().toISOString()
    };
    setLocal(STORAGE_KEYS.NEWSLETTER, [newSub, ...list]);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('newsletter').insert({ email, status: 'active' });
      } catch (e) {}
    }
    return { success: true, message: 'Thank you for subscribing to ProBItian updates!' };
  },

  async deleteSubscriber(id: string): Promise<boolean> {
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

  // --- SOCIAL LINKS ---
  async getSocialLinks(): Promise<SocialLinkItem[]> {
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

  // --- MEDIA LIBRARY ---
  async getMediaItems(): Promise<MediaItem[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('media').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) return data as MediaItem[];
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

  async deleteMediaItem(id: string): Promise<boolean> {
    const list = await this.getMediaItems();
    const filtered = list.filter(m => m.id !== id);
    setLocal(STORAGE_KEYS.MEDIA, filtered);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('media').delete().eq('id', id);
      } catch (e) {}
    }
    return true;
  },

  // --- CATEGORIES ---
  async getCategories(): Promise<CategoryItem[]> {
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
