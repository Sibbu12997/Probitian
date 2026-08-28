import React, { useState } from 'react';
import { NavPage, ProjectItem, BlogArticle } from '../../types';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ProjectModal } from '../../components/ProjectModal';
import { BlogModal } from '../../components/BlogModal';
import { PageRenderer } from './PageRenderer';
import { PageSeoMeta } from '../seo/usePageSeo';

export interface AppShellProps {
  currentPage: NavPage;
  currentBlogSlug: string | null;
  selectedBlog: BlogArticle | null;
  adminUser: string | null;
  isDarkMode: boolean;
  seoMeta: PageSeoMeta;
  onNavigate: (page: NavPage, slug?: string) => void;
  onSelectBlog: (article: BlogArticle) => void;
  onCloseBlogModal: () => void;
  onAdminLoginSuccess: (email: string) => void;
  onAdminLogout: () => void;
  onToggleDarkMode: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  currentBlogSlug,
  selectedBlog,
  adminUser,
  isDarkMode,
  seoMeta,
  onNavigate,
  onSelectBlog,
  onCloseBlogModal,
  onAdminLoginSuccess,
  onAdminLogout,
  onToggleDarkMode,
}) => {
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <SEO 
          title={seoMeta.title} 
          description={seoMeta.description}
          page="admin"
          robots="noindex, nofollow"
        />
        <PageRenderer
          currentPage={currentPage}
          adminUser={adminUser}
          isDarkMode={isDarkMode}
          onNavigate={onNavigate}
          onSelectProject={setSelectedProject}
          onSelectBlog={onSelectBlog}
          onAdminLoginSuccess={onAdminLoginSuccess}
          onAdminLogout={onAdminLogout}
          onToggleDarkMode={onToggleDarkMode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <SEO 
        title={seoMeta.title}
        description={seoMeta.description}
        page={currentPage}
        slug={currentBlogSlug}
        article={selectedBlog}
        robots={seoMeta.robots}
      />

      <Header
        currentPage={currentPage}
        onNavigate={onNavigate}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
      />

      <main className="flex-1">
        <PageRenderer
          currentPage={currentPage}
          adminUser={adminUser}
          isDarkMode={isDarkMode}
          onNavigate={onNavigate}
          onSelectProject={setSelectedProject}
          onSelectBlog={onSelectBlog}
          onAdminLoginSuccess={onAdminLoginSuccess}
          onAdminLogout={onAdminLogout}
          onToggleDarkMode={onToggleDarkMode}
        />
      </main>

      <Footer onNavigate={onNavigate} />

      {/* Interactive Modals */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      <BlogModal
        article={selectedBlog}
        onClose={onCloseBlogModal}
      />
    </div>
  );
};
