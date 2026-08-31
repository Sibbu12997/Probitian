import React from 'react';
import { NavPage } from '../types';
import { PowerBIDemo } from '../components/PowerBIDemo';
import { ArrowLeft, Home } from 'lucide-react';

interface PowerBIDemoPageProps {
  onNavigate?: (page: NavPage, slug?: string) => void;
}

export const PowerBIDemoPage: React.FC<PowerBIDemoPageProps> = ({ onNavigate }) => {
  return (
    <div className="py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb / Back button */}
        {onNavigate && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                onClick={() => onNavigate('home')}
                className="hover:underline flex items-center gap-1"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold">Power BI Demo</span>
            </div>
          </div>
        )}

        {/* Embedded Interactive Demo Component */}
        <PowerBIDemo onNavigate={onNavigate} />
      </div>
    </div>
  );
};
