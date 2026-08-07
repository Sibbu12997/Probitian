import React from 'react';
import { NavPage } from '../types';
import { Shield, ArrowLeft } from 'lucide-react';

interface PrivacyPageProps {
  onNavigate: (page: NavPage) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate }) => {
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
          Legal & Privacy
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500">Last updated: August 7, 2026</p>
      </div>

      <div className="card-radius bg-white dark:bg-slate-800/90 p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-soft space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Information We Collect</h2>
          <p>
            Pro<span className="text-amber-500 font-semibold">BI</span>tian respects your privacy. When you contact us or subscribe to our updates, we may collect your name, email address, and any optional message content you provide voluntarily.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. How We Use Information</h2>
          <p>
            Information collected is strictly used to answer user inquiries, deliver educational content, and improve our Business Intelligence course offerings. We never sell or share personal information with third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Third-Party Services</h2>
          <p>
            Our website includes links to external third-party platforms such as YouTube, Instagram, Facebook, and GitHub. Please review their respective privacy policies when visiting those platforms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Contact Us</h2>
          <p>
            For privacy inquiries or data requests, please contact Shivam Baghel at <strong className="text-purple-600 dark:text-purple-400">Probitianofficial@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};
