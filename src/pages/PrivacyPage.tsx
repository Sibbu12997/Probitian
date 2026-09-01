import React, { useState, useEffect } from 'react';
import { NavPage } from '../types';
import { ShieldCheck, ArrowLeft, FileText, Mail, Calendar, Lock, Cookie } from 'lucide-react';
import { cmsService } from '../services/cmsService';
import { LegalSettings, DEFAULT_LEGAL_SETTINGS } from '../data/defaultLegalData';
import { getCookieConsent } from '../lib/cookieConsent';

interface PrivacyPageProps {
  onNavigate: (page: NavPage) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate }) => {
  const [legalData, setLegalData] = useState<LegalSettings>(DEFAULT_LEGAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLegalData();
  }, []);

  const loadLegalData = async () => {
    try {
      const data = await cmsService.getLegalSettings();
      setLegalData(data);
    } catch (e) {
      console.error('Failed to load privacy data:', e);
    } finally {
      setLoading(false);
    }
  };

  const privacy = legalData.privacy || DEFAULT_LEGAL_SETTINGS.privacy;
  const contactEmail = legalData.contactEmail || DEFAULT_LEGAL_SETTINGS.contactEmail;

  const formattedLastUpdated = privacy.lastUpdated
    ? new Date(privacy.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'August 9, 2026';

  return (
    <div className="space-y-8 pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <button
          onClick={() => onNavigate('terms')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4 text-purple-500" /> View Terms of Service →
        </button>
      </div>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacy & Data Protection</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {privacy.title || 'Privacy Policy'}
        </h1>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          {privacy.subtitle || 'How ProBitian collects, uses, stores and protects personal information.'}
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>Effective Date: <strong>{privacy.effectiveDate || 'August 9, 2026'}</strong></span>
          </div>
          <span>•</span>
          <div>
            Last Updated: <strong>{formattedLastUpdated}</strong>
          </div>
        </div>
      </div>

      {/* Main Legal Document Content */}
      <div className="card-radius bg-white dark:bg-slate-900/90 p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading Privacy Policy...</div>
        ) : (
          privacy.sections.map((sec) => (
            <section key={sec.id} className="space-y-2 border-b border-slate-100 dark:border-slate-800/80 pb-6 last:border-b-0 last:pb-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{sec.title}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {sec.body}
              </p>
            </section>
          ))
        )}

        {/* Cookie & Tracking Preferences Management */}
        <div className="mt-8 p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cookie className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Cookie &amp; Tracking Preferences
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Manage your choice between strictly necessary storage and optional analytics tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('probitian_open_cookie_preferences'))}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all cursor-pointer shrink-0 shadow-xs"
          >
            Cookie Preferences
          </button>
        </div>

        {/* Contact Footer Banner inside card */}
        <div className="mt-8 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              Privacy Rights & Data Requests
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              To request data correction, deletion, or exercise your privacy rights, email Shivam Singh.
            </p>
          </div>

          <a
            href={`mailto:${contactEmail}`}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all cursor-pointer shrink-0"
          >
            Submit Data Request
          </a>
        </div>
      </div>
    </div>
  );
};
