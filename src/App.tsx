import React from 'react';
import { useAppRouting } from './app/routing/useAppRouting';
import { useAdminSession } from './app/session/useAdminSession';
import { useTheme } from './app/navigation/useAppNavigation';
import { usePageSeo } from './app/seo/usePageSeo';
import { AppShell } from './app/shell/AppShell';

/**
 * ProBitian Application Composition Root
 * Modularized across routing, session, SEO, navigation, and shell layers.
 */
export default function App() {
  const {
    currentPage,
    currentBlogSlug,
    selectedBlog,
    handleNavigate,
    handleSelectBlog,
    handleCloseBlogModal,
  } = useAppRouting();

  const {
    adminUser,
    handleAdminLoginSuccess,
    handleAdminLogout,
  } = useAdminSession();

  const {
    isDarkMode,
    toggleDarkMode,
  } = useTheme();

  const seoMeta = usePageSeo(currentPage, currentBlogSlug, selectedBlog);

  return (
    <AppShell
      currentPage={currentPage}
      currentBlogSlug={currentBlogSlug}
      selectedBlog={selectedBlog}
      adminUser={adminUser}
      isDarkMode={isDarkMode}
      seoMeta={seoMeta}
      onNavigate={handleNavigate}
      onSelectBlog={handleSelectBlog}
      onCloseBlogModal={handleCloseBlogModal}
      onAdminLoginSuccess={handleAdminLoginSuccess}
      onAdminLogout={handleAdminLogout}
      onToggleDarkMode={toggleDarkMode}
    />
  );
}
