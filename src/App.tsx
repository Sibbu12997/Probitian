import React, { useState, useEffect } from 'react';
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

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('home');
  const [adminUser, setAdminUser] = useState<string | null>(() => {
    return localStorage.getItem('probitian_admin_session');
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('probitian_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
    }
    return false;
  });
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogArticle | null>(null);

  // Sync route from URL hash on load
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (['home', 'about', 'projects', 'blog', 'learn', 'contact', 'privacy', 'terms', 'admin'].includes(hash)) {
        setCurrentPage(hash as NavPage);
      } else if (hash === '404') {
        setCurrentPage('404');
      } else if (!hash) {
        setCurrentPage('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleAdminLoginSuccess = (email: string) => {
    setAdminUser(email);
    localStorage.setItem('probitian_admin_session', email);
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('probitian_admin_session');
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

  const handleNavigate = (page: NavPage) => {
    setCurrentPage(page);
    window.location.hash = page === 'home' ? '/' : `/${page}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onNavigate={handleNavigate}
            onSelectProject={setSelectedProject}
            onSelectBlog={setSelectedBlog}
          />
        );
      case 'about':
        return <AboutPage onNavigate={handleNavigate} />;
      case 'projects':
        return <ProjectsPage onSelectProject={setSelectedProject} />;
      case 'blog':
        return <BlogPage onSelectBlog={setSelectedBlog} />;
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
          return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
        }
        return (
          <AdminPortal
            userEmail={adminUser}
            onLogout={handleAdminLogout}
            onNavigateFront={(page) => handleNavigate(page as NavPage)}
          />
        );
      case '404':
      default:
        return <NotFoundPage onNavigate={handleNavigate} />;
    }
  };

  // Dynamic Page Title
  const getPageTitle = () => {
    switch (currentPage) {
      case 'about': return 'About ProBItian | Learn Data, Build Skills, Grow Your Career';
      case 'projects': return 'Portfolio Projects & Dashboards | ProBItian';
      case 'blog': return 'Data Analytics Blog & DAX Guides | ProBItian';
      case 'learn': return 'Learn Power BI, SQL, Excel & AI | ProBItian';
      case 'contact': return 'Contact Shivam Baghel | ProBItian';
      case 'privacy': return 'Privacy Policy | ProBItian';
      case 'terms': return 'Terms of Service | ProBItian';
      case 'admin': return 'Admin CMS Portal | ProBItian';
      default: return 'ProBItian | Master Business Intelligence';
    }
  };

  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <SEO title={getPageTitle()} />
        {renderPage()}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <SEO title={getPageTitle()} />

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
        onClose={() => setSelectedBlog(null)}
      />
    </div>
  );
}

