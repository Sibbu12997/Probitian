import { NavPage, BlogArticle } from '../../types';

export interface RouteState {
  currentPage: NavPage;
  currentBlogSlug: string | null;
  selectedBlog: BlogArticle | null;
}

export interface RoutingControls {
  currentPage: NavPage;
  currentBlogSlug: string | null;
  selectedBlog: BlogArticle | null;
  blogsList: BlogArticle[];
  handleNavigate: (page: NavPage, slug?: string) => void;
  handleSelectBlog: (article: BlogArticle) => void;
  handleCloseBlogModal: () => void;
}
