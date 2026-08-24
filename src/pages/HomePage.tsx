import React, { useEffect, useState } from 'react';
import { NavPage, ProjectItem, BlogArticle, YouTubeVideo, HomePageConfig } from '../types';
import { FEATURE_CARDS, PROJECTS, YOUTUBE_VIDEOS, BLOG_ARTICLES, WHY_PROBITIAN_CARDS } from '../data/mockData';
import { cmsService } from '../services/cmsService';
import { BannerGraphic } from '../components/BannerGraphic';
import { Youtube, Instagram, ArrowRight, Play, Sparkles, BarChart3, Database, Table, Filter, BrainCircuit, GraduationCap, Briefcase, HeartHandshake, TrendingUp, CheckCircle, ExternalLink } from 'lucide-react';
import { trackSocialClick, trackCtaClick, trackCourseClick, trackProjectClick, trackBlogClick } from '../lib/analytics';

interface HomePageProps {
  onNavigate: (page: NavPage) => void;
  onSelectProject: (project: ProjectItem) => void;
  onSelectBlog: (article: BlogArticle) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectProject, onSelectBlog }) => {
  const [homeConfig, setHomeConfig] = useState<HomePageConfig | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>(PROJECTS);
  const [blogs, setBlogs] = useState<BlogArticle[]>(BLOG_ARTICLES);
  const [videos, setVideos] = useState<YouTubeVideo[]>(YOUTUBE_VIDEOS);

  useEffect(() => {
    loadCmsData();
    const handleBrandingUpdate = () => loadCmsData();
    window.addEventListener('probitian_branding_updated', handleBrandingUpdate);
    return () => window.removeEventListener('probitian_branding_updated', handleBrandingUpdate);
  }, []);

  const loadCmsData = async () => {
    try {
      const [configData, projectList, blogList, videoList] = await Promise.all([
        cmsService.getHomePageConfig(),
        cmsService.getProjects(),
        cmsService.getBlogs(),
        cmsService.getVideos()
      ]);

      if (configData) setHomeConfig(configData);
      if (projectList && projectList.length > 0) setProjects(projectList);
      if (blogList && blogList.length > 0) setBlogs(blogList);
      if (videoList && videoList.length > 0) setVideos(videoList);
    } catch (err) {
      console.error('Error loading CMS data for home page:', err);
    }
  };
  // Helper function to map feature icon names to Lucide icons
  const renderFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'BarChart3': return <BarChart3 className="w-6 h-6 text-amber-500" />;
      case 'Database': return <Database className="w-6 h-6 text-blue-500" />;
      case 'Table': return <Table className="w-6 h-6 text-emerald-500" />;
      case 'Filter': return <Filter className="w-6 h-6 text-purple-500" />;
      case 'BrainCircuit': return <BrainCircuit className="w-6 h-6 text-pink-500" />;
      case 'GraduationCap': return <GraduationCap className="w-6 h-6 text-indigo-500" />;
      default: return <Sparkles className="w-6 h-6 text-purple-600" />;
    }
  };

  // Helper for Why Cards icons
  const renderWhyIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-6 h-6 text-amber-500" />;
      case 'Briefcase': return <Briefcase className="w-6 h-6 text-purple-600" />;
      case 'HeartHandshake': return <HeartHandshake className="w-6 h-6 text-pink-500" />;
      case 'TrendingUp': return <TrendingUp className="w-6 h-6 text-emerald-500" />;
      default: return <CheckCircle className="w-6 h-6 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-24 pt-24 pb-16">
      {/* ----------------- HERO SECTION ----------------- */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Learn Data. Build Skills. Grow Your Career.</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              Master Business Intelligence with{' '}
              <span className="text-gradient">Real-World Projects</span>
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed font-medium">
              {homeConfig?.hero_description || 'Master Power BI, SQL, Excel, AI and Dashboard Design through practical projects and industry-focused tutorials.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://youtube.com/@probitian"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackSocialClick('youtube', 'https://youtube.com/@probitian');
                  trackCtaClick('Start Learning', 'https://youtube.com/@probitian');
                }}
                className="btn-radius px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all duration-300 flex items-center gap-2 group"
              >
                <Play className="w-4 h-4 fill-current text-white group-hover:scale-110 transition-transform" />
                <span>Start Learning</span>
              </a>

              <a
                href="https://instagram.com/probitian"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('instagram', 'https://instagram.com/probitian')}
                className="btn-radius px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 transition-all duration-300 flex items-center gap-2"
              >
                <Instagram className="w-4 h-4 text-pink-500" />
                <span>Follow on Instagram</span>
              </a>
            </div>

            {/* Quick Metrics Badge */}
            <div className="pt-4 flex items-center gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>100% Free Tutorials</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Portfolio Projects</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Banner Showcase */}
          <div className="lg:col-span-6">
            <BannerGraphic type="hero" bannerUrl={homeConfig?.banner_url} />
          </div>
        </div>
      </section>

      {/* ----------------- WHAT IS PROBITIAN ----------------- */}
      <section className="bg-slate-50 dark:bg-slate-900/60 py-16 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            About The Platform
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            What is Pro<span className="text-amber-500 font-black">BI</span>tian
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto font-medium">
            Pro<span className="text-amber-500 font-bold">BI</span>tian is a modern learning platform focused on Data Analytics, Power BI, SQL, Excel, AI and Career Growth. Our goal is to make learning simple, practical and project-based.
          </p>
        </div>
      </section>

      {/* ----------------- FEATURES (6 PREMIUM CARDS) ----------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            Core Curriculum
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Master High-Demand Data Skills
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Everything you need to transform raw datasets into executive dashboards and land your dream data role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.id}
              onClick={() => {
                trackCourseClick(card.title, 'HomePage Feature');
                onNavigate('learn');
              }}
              className="card-radius bg-white dark:bg-slate-800/90 p-6 border border-slate-200 dark:border-slate-700/80 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer space-y-4 group relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200/80 dark:border-slate-600 group-hover:scale-110 transition-transform">
                  {renderFeatureIcon(card.iconName)}
                </div>
                {card.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                    {card.badge}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {card.shortDescription}
                </p>
              </div>

              <div className="pt-2 flex items-center text-xs font-semibold text-purple-600 dark:text-purple-400 gap-1 group-hover:translate-x-1 transition-transform">
                <span>Explore Modules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------- PROJECT SECTION (6 CARDS) ----------------- */}
      <section className="bg-slate-50 dark:bg-slate-900/60 py-16 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                Portfolio Showcase
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                Featured BI Dashboards
              </h2>
            </div>
            <button
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              View All 6 Portfolio Projects <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="card-radius bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  <img
                    src={project.imagePlaceholder}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-md border border-slate-700">
                    {project.category}
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex flex-wrap gap-1.5">
                      {project.toolsUsed.map((tool) => (
                        <span
                          key={tool}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        trackProjectClick(project.title);
                        onSelectProject(project);
                      }}
                      className="btn-radius w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>View Project Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------- LATEST CONTENT (YOUTUBE & BLOGS) ----------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            Fresh Updates
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Latest Tutorials & Articles
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Watch our step-by-step YouTube masterclasses or read deep-dive analytics guides.
          </p>
        </div>

        {/* YouTube Tutorials Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" /> Free YouTube Tutorials
            </h3>
            <a
              href="https://youtube.com/@probitian"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              Visit Channel <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videos.slice(0, 3).map((video) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('youtube', video.url)}
                className="card-radius bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center group-hover:bg-slate-900/10 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/90 text-white text-[10px] font-mono">
                    {video.duration}
                  </span>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 line-clamp-2 leading-snug">
                    {video.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {video.description}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/60">
                    <span>{video.views}</span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">Watch on YouTube →</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Blog Cards Grid */}
        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Recent Blog Posts
            </h3>
            <button
              onClick={() => onNavigate('blog')}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              Browse All Articles →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {blogs.slice(0, 4).map((article) => (
              <div
                key={article.id}
                onClick={() => {
                  trackBlogClick(article.title);
                  onSelectBlog(article);
                }}
                className="card-radius bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer group"
              >
                <div className="relative h-36 overflow-hidden bg-slate-950">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold uppercase">
                    {article.category}
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium text-slate-400">
                      {article.date} • {article.readTime}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 line-clamp-2">
                      {article.title}
                    </h4>
                  </div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    Read Guide →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------- WHY PROBITIAN (4 CARDS) ----------------- */}
      <section className="bg-slate-50 dark:bg-slate-900/60 py-16 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              Our Core Difference
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Why Choose Pro<span className="text-amber-500 font-black">BI</span>tian
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto">
              Designed specifically for aspiring and practicing Business Intelligence professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_PROBITIAN_CARDS.map((item) => (
              <div
                key={item.id}
                className="card-radius bg-white dark:bg-slate-800/90 p-6 border border-slate-200 dark:border-slate-700/80 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 space-y-4"
              >
                <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 w-fit">
                  {renderWhyIcon(item.iconName)}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------- CTA SECTION ----------------- */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-radius relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 text-white p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black">
              Ready to Start?
            </h2>
            <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto font-medium">
              Join thousands of learners building real Power BI dashboards and mastering SQL data analysis today.
            </p>
          </div>

          <div className="relative z-10 pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://youtube.com/@probitian"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackSocialClick('youtube', 'https://youtube.com/@probitian');
                trackCtaClick('Watch on YouTube', 'https://youtube.com/@probitian');
              }}
              className="btn-radius w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg transition-all duration-300 flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <svg 
                className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform duration-200" 
                viewBox="0 0 24 24" 
                aria-hidden="true"
              >
                <path
                  fill="#FF0000"
                  d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
                />
                <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span>Watch on YouTube</span>
            </a>

            <button
              onClick={() => {
                trackCtaClick('Browse Course Catalog', 'learn');
                onNavigate('learn');
              }}
              className="btn-radius w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 backdrop-blur-md transition-all duration-300 cursor-pointer"
            >
              Browse Course Catalog
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
