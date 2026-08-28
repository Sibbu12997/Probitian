import React from 'react';
import { NavPage, ProjectItem, BlogArticle } from '../../types';
import { HomePage } from '../../pages/HomePage';
import { AboutPage } from '../../pages/AboutPage';
import { ProjectsPage } from '../../pages/ProjectsPage';
import { BlogPage } from '../../pages/BlogPage';
import { LearnPage } from '../../pages/LearnPage';
import { ContactPage } from '../../pages/ContactPage';
import { PrivacyPage } from '../../pages/PrivacyPage';
import { TermsPage } from '../../pages/TermsPage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { AdminLogin } from '../../pages/admin/AdminLogin';
import { AdminPortal } from '../../pages/admin/AdminPortal';

export interface PageRendererProps {
  currentPage: NavPage;
  adminUser: string | null;
  isDarkMode: boolean;
  onNavigate: (page: NavPage, slug?: string) => void;
  onSelectProject: (project: ProjectItem | null) => void;
  onSelectBlog: (article: BlogArticle) => void;
  onAdminLoginSuccess: (email: string) => void;
  onAdminLogout: () => void;
  onToggleDarkMode: () => void;
}

export const PageRenderer: React.FC<PageRendererProps> = ({
  currentPage,
  adminUser,
  isDarkMode,
  onNavigate,
  onSelectProject,
  onSelectBlog,
  onAdminLoginSuccess,
  onAdminLogout,
  onToggleDarkMode,
}) => {
  switch (currentPage) {
    case 'home':
      return (
        <HomePage
          onNavigate={onNavigate}
          onSelectProject={onSelectProject}
          onSelectBlog={onSelectBlog}
        />
      );
    case 'about':
      return <AboutPage onNavigate={onNavigate} />;
    case 'projects':
      return <ProjectsPage onSelectProject={onSelectProject} />;
    case 'blog':
      return <BlogPage onSelectBlog={onSelectBlog} />;
    case 'learn':
      return <LearnPage />;
    case 'contact':
      return <ContactPage />;
    case 'privacy':
      return <PrivacyPage onNavigate={onNavigate} />;
    case 'terms':
      return <TermsPage onNavigate={onNavigate} />;
    case 'admin':
      if (!adminUser) {
        return (
          <AdminLogin
            onLoginSuccess={onAdminLoginSuccess}
            onNavigateHome={() => onNavigate('home')}
            isDarkMode={isDarkMode}
            onToggleDarkMode={onToggleDarkMode}
          />
        );
      }
      return (
        <AdminPortal
          userEmail={adminUser}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onLogout={onAdminLogout}
          onNavigateFront={(page) => onNavigate(page as NavPage)}
        />
      );
    case '404':
    default:
      return <NotFoundPage onNavigate={onNavigate} />;
  }
};
