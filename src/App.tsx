import React, { useState, useEffect, useCallback } from 'react';
import { NavPage, ProjectItem, BlogArticle } from './types';
import { SEO } from './components/SEO';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProjectModal } from './components/ProjectModal';
import { BlogModal } from './components/BlogModal';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { BlogPage } from './pages/BlogPage';
import { LearnPage } from './pages/LearnPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminPortal } from './pages/admin/AdminPortal';
import { trackPageView, trackNavigationClick } from './lib/analytics';
import { parseRoute, getBlogSlug, getPageCanonicalUrl } from './lib/routing';
import { BLOG_ARTICLES } from './data/mockData';
import { cmsService } from './services/cmsService';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('home');
  const [currentBlogSlug, setCurrentBlogSlug] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [blogsList, setBlogsList] = useState<BlogArticle[]>(BLOG_ARTICLES);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogArticle | null>(null);

  // Fetch blogs list early so slug matching can resolve CMS-created blogs
  useEffect(() => {
    cmsService.getBlogs().then((data) => {
      if (data && data.length > 0) {
        setBlogsList(data);
      }
    }).catch((err) => {
      console.warn('Could not load blogs for routing:', err);
    });
  }, []);

  // Validate server-side admin session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/admin/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.email) {
            setAdminUser(data.email);
          }
        }
      } catch (err) {
        console.warn('Admin session validation error:', err);
      }
    }
    checkSession();
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('probitian_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
    }
    return false;
  });

  // Core URL sync & route handler
  const syncRouteFromLocation = useCallback(() => {
    const route = parseRoute(window.location.pathname, window.location.hash);

    // If legacy hash was present, replace URL with standard clean path
    if (route.isLegacyHash && window.location.hash) {
      window.history.replaceState(null, '', route.targetCanonicalPath);
    }

    setCurrentPage(route.page);
    setCurrentBlogSlug(route.slug);

    // If route is a blog slug, match and select the article
    if (route.page === 'blog' && route.slug) {
      const matched = blogsList.find((b) => getBlogSlug(b) === route.slug || b.id === route.slug);
      if (matched) {
        setSelectedBlog(matched);
      }
    } else if (route.page !== 'blog') {
      setSelectedBlog(null);
    }
  }, [blogsList]);

  // Sync route on initial load and listen for popstate (browser back/forward)
  useEffect(() => {
    syncRouteFromLocation();
    window.addEventListener('popstate', syncRouteFromLocation);
    return () => window.removeEventListener('popstate', syncRouteFromLocation);
  }, [syncRouteFromLocation]);

  // When blogs list loads, re-check if current route slug matches a blog
  useEffect(() => {
    if (currentPage === 'blog' && currentBlogSlug) {
      const matched = blogsList.find((b) => getBlogSlug(b) === currentBlogSlug || b.id === currentBlogSlug);
      if (matched) {
        setSelectedBlog(matched);
      }
    }
  }, [blogsList, currentPage, currentBlogSlug]);

  const handleAdminLoginSuccess = (email: string) => {
    setAdminUser(email);
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setAdminUser(null);
  };

  // Sync theme class to document and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('probitian_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('probitian_theme', 'light');
    }
  }, [isDarkMode]);

  // Unified client-side navigation handler
  const handleNavigate = (page: NavPage, slug?: string) => {
    const targetPath = page === 'home' 
      ? '/' 
      : (page === 'blog' && slug ? `/blog/${slug}` : `/${page}`);

    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }

    setCurrentPage(page);
    setCurrentBlogSlug(slug || null);

    if (page === 'blog' && slug) {
      const matched = blogsList.find((b) => getBlogSlug(b) === slug || b.id === slug);
      if (matched) {
        setSelectedBlog(matched);
      }
    } else if (!slug) {
      setSelectedBlog(null);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    trackNavigationClick(page);
  };

  const handleSelectBlog = (article: BlogArticle) => {
    const slug = getBlogSlug(article);
    setSelectedBlog(article);
    setCurrentPage('blog');
    setCurrentBlogSlug(slug);
    window.history.pushState(null, '', `/blog/${slug}`);
  };

  const handleCloseBlogModal = () => {
    setSelectedBlog(null);
    setCurrentBlogSlug(null);
    if (window.location.pathname.startsWith('/blog/')) {
      window.history.pushState(null, '', '/blog');
    }
  };

  // GA4 Page View Tracking on page change
  useEffect(() => {
    const pagePath = currentPage === 'home' 
      ? '/' 
      : (currentPage === 'blog' && currentBlogSlug ? `/blog/${currentBlogSlug}` : `/${currentPage}`);
    const title = getPageTitle();
    trackPageView(pagePath, title);
  }, [currentPage, currentBlogSlug]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Dynamic Page Title
  const getPageTitle = () => {
    if (currentPage === 'blog' && selectedBlog) {
      return `${selectedBlog.metaTitle || selectedBlog.title} | ProBItian Blog`;
    }
    switch (currentPage) {
      case 'about': return 'About ProBItian | Learn Data, Build Skills, Grow Your Career';
      case 'projects': return 'Portfolio Projects & BI Dashboards | ProBItian';
      case 'blog': return 'Data Analytics Blog & DAX Guides | ProBItian';
      case 'learn': return 'Learn Power BI, SQL, Excel & AI Analytics | ProBItian';
      case 'contact': return 'Contact Shivam Singh | ProBItian Community Hub';
      case 'privacy': return 'Privacy Policy | ProBItian Data Protection';
      case 'terms': return 'Terms of Service | ProBItian';
      case 'admin': return 'Admin CMS Portal | ProBItian';
      case '404': return 'Page Not Found (404) | ProBItian';
      default: return 'ProBItian | Master Business Intelligence, Power BI & SQL';
    }
  };

  // Dynamic Page Description
  const getPageDescription = () => {
    if (currentPage === 'blog' && selectedBlog) {
      return selectedBlog.metaDescription || selectedBlog.excerpt;
    }
    switch (currentPage) {
      case 'about': return 'Learn about ProBItian\'s mission to deliver practical, production-grade Business Intelligence education, career mentorship, and dashboard design skills.';
      case 'projects': return 'Explore real-world Business Intelligence portfolio dashboards built with Power BI, SQL Server, DAX time intelligence, and Power Query ETL.';
      case 'blog': return 'In-depth technical tutorials on Power BI calculation groups, advanced DAX formulas, SQL window functions, Power Query M optimizations, and analytics career tips.';
      case 'learn': return 'Step-by-step learning pathways covering Power BI enterprise mastery, SQL relational querying, Advanced Excel dataflows, and DAX modeling.';
      case 'contact': return 'Get in touch with ProBItian for data analytics inquiries, enterprise BI consultations, course support, or community collaboration.';
      case 'privacy': return 'Read ProBItian\'s privacy policy, data protection standards, cookie policies, and personal information handling practices.';
      case 'terms': return 'Review the terms and conditions governing access to ProBItian educational tutorials, portfolio code assets, and learning resources.';
      case 'admin': return 'ProBItian internal content management portal.';
      case '404': return 'The requested page could not be found on ProBItian.';
      default: return 'Master Power BI, SQL, Excel, Power Query, AI Tools, and Dashboard Design through practical projects and industry-focused tutorials.';
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onNavigate={handleNavigate}
            onSelectProject={setSelectedProject}
            onSelectBlog={handleSelectBlog}
          />
        );
      case 'about':
        return <AboutPage onNavigate={handleNavigate} />;
      case 'projects':
        return <ProjectsPage onSelectProject={setSelectedProject} />;
      case 'blog':
        return <BlogPage onSelectBlog={handleSelectBlog} />;
      case 'learn':
        return <LearnPage />;
      case 'contact':
        return <ContactPage />;
      case 'privacy':
        return <PrivacyPage onNavigate={handleNavigate} />;
      case 'terms':
        return <TermsPage onNavigate={handleNavigate} />;
      case 'admin':
        if (!adminUser) {
          return (
            <AdminLogin
              onLoginSuccess={handleAdminLoginSuccess}
              onNavigateHome={() => handleNavigate('home')}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
            />
          );
        }
        return (
          <AdminPortal
            userEmail={adminUser}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onLogout={handleAdminLogout}
            onNavigateFront={(page) => handleNavigate(page as NavPage)}
          />
        );
      case '404':
      default:
        return <NotFoundPage onNavigate={handleNavigate} />;
    }
  };

  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <SEO 
          title={getPageTitle()} 
          description={getPageDescription()}
          page="admin"
          robots="noindex, nofollow"
        />
        {renderPage()}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <SEO 
        title={getPageTitle()}
        description={getPageDescription()}
        page={currentPage}
        slug={currentBlogSlug}
        article={selectedBlog}
        robots={currentPage === '404' ? 'noindex, nofollow' : undefined}
      />

      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <main className="flex-1">
        {renderPage()}
      </main>

      <Footer onNavigate={handleNavigate} />

      {/* Modals */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      <BlogModal
        article={selectedBlog}
        onClose={handleCloseBlogModal}
      />
    </div>
  );
}
