import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, ExternalLink, X } from 'lucide-react';
import {
  getCookieConsent,
  setCookieConsent,
  subscribeToConsentChanges,
  ConsentChoice
} from '../lib/cookieConsent';
import { NavPage } from '../types';

interface CookieConsentBannerProps {
  onNavigate?: (page: NavPage, slug?: string) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [currentChoice, setCurrentChoice] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    // Check existing stored consent
    const consent = getCookieConsent();
    setCurrentChoice(consent);
    if (!consent) {
      // Show consent banner if no choice has been recorded for this version
      setIsVisible(true);
    }

    // Subscribe to consent changes
    const unsubscribe = subscribeToConsentChanges((newChoice) => {
      setCurrentChoice(newChoice);
    });

    // Listen for manual preference trigger (from footer / privacy page)
    const handleOpenPreferences = () => {
      setIsPreferencesOpen(true);
    };

    window.addEventListener('probitian_open_cookie_preferences', handleOpenPreferences);

    return () => {
      unsubscribe();
      window.removeEventListener('probitian_open_cookie_preferences', handleOpenPreferences);
    };
  }, []);

  const handleSelect = (choice: ConsentChoice) => {
    setCookieConsent(choice);
    setIsVisible(false);
    setIsPreferencesOpen(false);
  };

  const handlePrivacyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('privacy');
    }
  };

  // Preference management modal (when opened via Footer / Privacy Page)
  if (isPreferencesOpen) {
    return (
      <div 
        role="dialog"
        aria-labelledby="cookie-preferences-title"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn"
      >
        <div 
          className="relative w-full max-w-lg card-radius bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h2 id="cookie-preferences-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Cookie & Privacy Preferences
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage your browser storage and tracking settings
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPreferencesOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close preferences"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            {/* Necessary Category */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Strictly Necessary</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Always Active
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Required for core website security, authentication tokens, theme preferences, and session continuity.
              </p>
            </div>

            {/* Analytics Category */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Cookie className="w-4 h-4 text-purple-500" />
                  <span>Analytics & Performance</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  Optional
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Helps us measure aggregated traffic and page navigation to improve tutorials and projects. No PII is collected.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="/privacy"
              onClick={handlePrivacyClick}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Read Privacy Policy</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSelect('necessary')}
                className={`flex-1 sm:flex-initial btn-radius px-4 py-2.5 text-xs font-bold border transition-colors cursor-pointer ${
                  currentChoice === 'necessary'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                Necessary Only
              </button>
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`flex-1 sm:flex-initial btn-radius px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-soft ${
                  currentChoice === 'all'
                    ? 'bg-purple-700 dark:bg-purple-600 ring-2 ring-purple-400'
                    : 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500'
                }`}
              >
                Allow All
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial visit Banner
  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 animate-slideUp pointer-events-none"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <div className="card-radius bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 pr-2">
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Cookies &amp; Privacy
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              We use necessary cookies and browser storage to keep ProBitian secure and functional. With your permission, optional cookies may be used to understand website usage and improve the experience.
            </p>
            <div>
              <a
                href="/privacy"
                onClick={handlePrivacyClick}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                <span>Privacy Policy</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => handleSelect('necessary')}
              className="flex-1 md:flex-initial btn-radius px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
            >
              Necessary Only
            </button>
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className="flex-1 md:flex-initial btn-radius px-5 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer shadow-soft text-center"
            >
              Allow All
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
