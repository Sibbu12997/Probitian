import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, Cookie, ExternalLink, X, Info } from 'lucide-react';
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
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check existing stored consent
    const consent = getCookieConsent();
    setCurrentChoice(consent);
    if (!consent) {
      // Show consent modal if no choice has been recorded for this version
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

  // Lock background scrolling while any consent modal is open
  useEffect(() => {
    if (isVisible || isPreferencesOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isVisible, isPreferencesOpen]);

  // Handle keyboard events (Escape to close preferences)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreferencesOpen) {
        setIsPreferencesOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPreferencesOpen]);

  const handleSelect = useCallback((choice: ConsentChoice) => {
    setCookieConsent(choice);
    setIsVisible(false);
    setIsPreferencesOpen(false);
  }, []);

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
        aria-describedby="cookie-preferences-desc"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsPreferencesOpen(false);
          }
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm animate-fadeIn cursor-default"
      >
        <div 
          ref={modalRef}
          className="relative w-full max-w-lg card-radius bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h2 id="cookie-preferences-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  Cookie &amp; Privacy Preferences
                </h2>
                <p id="cookie-preferences-desc" className="text-xs text-slate-500 dark:text-slate-400">
                  Manage your browser storage and tracking settings
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPreferencesOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close preferences"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3.5 text-xs sm:text-sm">
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
                  <span>Analytics &amp; Performance</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  Optional
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Optional Google Analytics 4 tracking to understand aggregate website usage. No personal identifying information is collected.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <a
                href="/privacy"
                onClick={handlePrivacyClick}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Read Privacy Policy</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {currentChoice && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Current: <strong className="text-slate-800 dark:text-slate-200">{currentChoice === 'all' ? 'Allow All' : 'Necessary Only'}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelect('necessary')}
                className="btn-radius px-3 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
              >
                Necessary Only
              </button>
              <button
                type="button"
                onClick={() => handleSelect('necessary')}
                className="btn-radius px-3 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className="btn-radius px-3 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer shadow-soft text-center focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
              >
                Allow All
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial visit Modal (with backdrop overlay & subtle blur)
  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-lg card-radius bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 text-slate-900 dark:text-white"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <h2 id="cookie-consent-title" className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Cookies &amp; Privacy
            </h2>
          </div>

          <p id="cookie-consent-desc" className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We use necessary cookies to keep ProBitian secure and functional. With your permission, optional analytics help us understand website usage and improve ProBitian.
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

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleSelect('necessary')}
            className="btn-radius px-3 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
          >
            Necessary Only
          </button>
          <button
            type="button"
            onClick={() => handleSelect('necessary')}
            className="btn-radius px-3 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={() => handleSelect('all')}
            className="btn-radius px-3 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer shadow-soft text-center focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
          >
            Allow All
          </button>
        </div>
      </div>
    </div>
  );
};

