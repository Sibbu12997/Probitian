import React from 'react';
import { NavPage } from '../types';
import { Home, Search, HelpCircle } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (page: NavPage) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center pt-24 pb-16 max-w-2xl mx-auto px-4 text-center">
      <div className="card-radius bg-white dark:bg-slate-800/90 p-8 sm:p-12 border border-slate-200 dark:border-slate-700 shadow-soft space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-black text-purple-600 dark:text-purple-400">404</h1>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Page Not Found</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            The page or dashboard view you requested could not be located. Let's get you back to learning!
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="btn-radius px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-soft flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" /> Go to Home
          </button>

          <button
            onClick={() => onNavigate('learn')}
            className="btn-radius px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold w-full sm:w-auto justify-center"
          >
            Explore Courses
          </button>
        </div>
      </div>
    </div>
  );
};
