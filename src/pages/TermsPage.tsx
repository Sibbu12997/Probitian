import React from 'react';
import { NavPage } from '../types';
import { FileText, ArrowLeft } from 'lucide-react';

interface TermsPageProps {
  onNavigate: (page: NavPage) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <button
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="space-y-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          Terms of Service
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Terms & Conditions
        </h1>
        <p className="text-xs text-slate-500">Effective Date: August 7, 2026</p>
      </div>

      <div className="card-radius bg-white dark:bg-slate-800/90 p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-soft space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Pro<span className="text-amber-500 font-semibold">BI</span>tian, you agree to comply with these Terms & Conditions. All course materials, code examples, and Power BI template files are provided for personal educational purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Intellectual Property</h2>
          <p>
            All branding, logos, graphics, and course materials are owned by Pro<span className="text-amber-500 font-semibold">BI</span>tian and Shivam Baghel. You may not republish or monetize our starter datasets without prior permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Educational Disclaimer</h2>
          <p>
            Pro<span className="text-amber-500 font-semibold">BI</span>tian provides practical tutorials and skill guidance. While we strive to present real-world data scenarios, job placement outcomes depend on individual student dedication and interview performance.
          </p>
        </section>
      </div>
    </div>
  );
};
