import { useState, useEffect, useCallback } from 'react';
import { NavPage, BlogArticle } from '../../types';
import { parseRoute, getBlogSlug } from '../../lib/routing';
import { trackNavigationClick } from '../../lib/analytics';
import { BLOG_ARTICLES } from '../../data/mockData';
import { cmsService } from '../../services/cmsService';
import { RoutingControls } from './types';

export function useAppRouting(): RoutingControls {
  const [currentPage, setCurrentPage] = useState<NavPage>('home');
  const [currentBlogSlug, setCurrentBlogSlug] = useState<string | null>(null);
  const [blogsList, setBlogsList] = useState<BlogArticle[]>(BLOG_ARTICLES);
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

  // Core URL sync & route handler
  const syncRouteFromLocation = useCallback(() => {
    const route = parseRoute(window.location.pathname, window.location.hash);

    // If legacy hash was present or any hash exists on standard routes, replace URL with standard clean path
    if ((route.isLegacyHash || window.location.hash) && route.targetCanonicalPath) {
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

  // Unified client-side navigation handler
  const handleNavigate = useCallback((page: NavPage, slug?: string) => {
    let targetPath = '/';
    if (page === 'home') {
      targetPath = '/';
    } else if (page === 'admin') {
      targetPath = slug && slug !== 'dashboard' && slug !== 'overview'
        ? `/admin/${slug}`
        : '/admin/';
    } else if (page === 'blog' && slug) {
      targetPath = `/blog/${slug}`;
    } else {
      targetPath = `/${page}`;
    }

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
  }, [blogsList]);

  const handleSelectBlog = useCallback((article: BlogArticle) => {
    const slug = getBlogSlug(article);
    setSelectedBlog(article);
    setCurrentPage('blog');
    setCurrentBlogSlug(slug);
    window.history.pushState(null, '', `/blog/${slug}`);
  }, []);

  const handleCloseBlogModal = useCallback(() => {
    setSelectedBlog(null);
    setCurrentBlogSlug(null);
    if (window.location.pathname.startsWith('/blog/')) {
      window.history.pushState(null, '', '/blog');
    }
  }, []);

  return {
    currentPage,
    currentBlogSlug,
    selectedBlog,
    blogsList,
    handleNavigate,
    handleSelectBlog,
    handleCloseBlogModal,
  };
}
