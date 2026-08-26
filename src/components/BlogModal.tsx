import React from 'react';
import { BlogArticle } from '../types';
import { X, Calendar, Clock, User, Share2, Youtube, ArrowLeft } from 'lucide-react';
import { trackSocialClick, trackCtaClick } from '../lib/analytics';

interface BlogModalProps {
  article: BlogArticle | null;
  onClose: () => void;
}

export const BlogModal: React.FC<BlogModalProps> = ({ article, onClose }) => {
  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[20px] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Back Link */}
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Articles
        </button>

        {/* Article Meta Header */}
        <div className="space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {article.category}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <User className="w-3.5 h-3.5 text-purple-600" /> {article.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {article.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {article.readTime}
            </span>
          </div>
        </div>

        {/* Article Image Cover */}
        <div className="relative h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <img 
            src={article.imageUrl} 
            alt={`${article.title} - ProBItian Technical Guide Banner`} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Content Body */}
        <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 italic text-slate-600 dark:text-slate-300">
            "{article.excerpt}"
          </div>

          <div className="whitespace-pre-line font-sans">
            {article.content}
          </div>
        </div>

        {/* Article Footer & Social CTA */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <a
            href="https://youtube.com/@probitian"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackSocialClick('youtube', 'https://youtube.com/@probitian');
              trackCtaClick(`Blog Video: ${article.title}`, 'https://youtube.com/@probitian');
            }}
            className="btn-radius px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-soft flex items-center gap-2"
          >
            <Youtube className="w-4 h-4 text-red-400" />
            <span>Watch Video Version on ProBItian YouTube</span>
          </a>

          <button
            onClick={onClose}
            className="btn-radius px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
          >
            Close Article
          </button>
        </div>
      </div>
    </div>
  );
};
