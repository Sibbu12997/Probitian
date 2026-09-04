import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight, ArrowLeft, Key, Eye, EyeOff, Sun, Moon, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { PROBITIAN_LOGO_URL } from '../../constants/branding';

interface AdminLoginProps {
  onLoginSuccess: (userEmail: string) => void;
  onNavigateHome?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onNavigateHome,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [loginMode, setLoginMode] = useState<'passkey' | 'supabase'>('passkey');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookieBlocked, setCookieBlocked] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCookieBlocked(false);
    setLoading(true);

    const userEmail = email.trim() || 'admin@probitian.com';

    try {
      if (loginMode === 'passkey') {
        const response = await fetch('/api/admin/verify-passkey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ passkey: passkey.trim() })
        });

        if (response.ok) {
          // Confirm active session state before rendering protected admin portal
          const sessionRes = await fetch('/api/admin/session', { credentials: 'include' });
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData.authenticated && sessionData.email) {
              onLoginSuccess(sessionData.email);
              return;
            }
          }
          setCookieBlocked(true);
          setError('Admin Portal requires a first-party browser tab. This preview is embedded inside AI Studio, where browser privacy settings may block secure administrative session cookies.');
        } else {
          const errData = await response.json().catch(() => null);
          setError(errData?.error || 'Invalid credentials');
        }
      } else {
        if (!isSupabaseConfigured()) {
          setError('Supabase authentication is not configured on this instance.');
          setLoading(false);
          return;
        }

        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password.trim()
        });

        if (!authError && data?.session?.access_token && data?.user) {
          const sessionRes = await fetch('/api/admin/verify-supabase-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ accessToken: data.session.access_token })
          });

          if (sessionRes.ok) {
            const verifyRes = await fetch('/api/admin/session', { credentials: 'include' });
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (verifyData.authenticated && verifyData.email) {
                onLoginSuccess(verifyData.email);
                return;
              }
            }
            setCookieBlocked(true);
            setError('Admin Portal requires a first-party browser tab. This preview is embedded inside AI Studio, where browser privacy settings may block secure administrative session cookies.');
          } else {
            const errData = await sessionRes.json().catch(() => null);
            setError(errData?.error || 'Unauthorized administrator account');
          }
        } else {
          setError('Invalid credentials');
        }
      }
    } catch {
      setError('Unable to authenticate. Please check your network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="admin-login-wrapper"
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 transition-colors duration-200"
    >
      {/* Top Utility Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        {onNavigateHome ? (
          <button
            type="button"
            id="login-btn-back-home"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-amber-400 transition-colors cursor-pointer py-2 px-2.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Website</span>
          </button>
        ) : (
          <div />
        )}

        {onToggleDarkMode && (
          <button
            type="button"
            id="login-btn-theme-toggle"
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-purple-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        )}
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div
          id="admin-login-card"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl shadow-slate-200/50 dark:shadow-purple-950/20 space-y-6"
        >
          {/* Brand & Title Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-md shadow-purple-500/10 border border-slate-200 dark:border-slate-800 mb-1 overflow-hidden">
              <img
                src={PROBITIAN_LOGO_URL}
                alt="ProBitian Official Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Pro<span className="text-amber-500 dark:text-amber-400">BI</span>tian CMS
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Administrator Command Center
            </p>
          </div>

          {/* Authentication Mode Switcher Tabs */}
          <div
            id="auth-mode-tabs"
            className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <button
              type="button"
              id="tab-btn-passkey"
              onClick={() => {
                setLoginMode('passkey');
                setError(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginMode === 'passkey'
                  ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm border border-slate-200/80 dark:border-transparent'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Passkey</span>
            </button>
            <button
              type="button"
              id="tab-btn-supabase"
              onClick={() => {
                setLoginMode('supabase');
                setError(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginMode === 'supabase'
                  ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm border border-slate-200/80 dark:border-transparent'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Supabase Auth</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {loginMode === 'passkey' ? (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-admin-passkey"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Admin Passkey <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-admin-passkey"
                      type={showPasskey ? 'text' : 'password'}
                      value={passkey}
                      onChange={(e) => setPasskey(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-500/30 transition-all"
                      placeholder="Enter admin passkey..."
                    />
                    <button
                      type="button"
                      id="btn-toggle-passkey-visibility"
                      onClick={() => setShowPasskey((prev) => !prev)}
                      aria-label={showPasskey ? 'Hide passkey' : 'Show passkey'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-supabase-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-supabase-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-500/30 transition-all"
                      placeholder="admin@probitian.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="input-supabase-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-supabase-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-600 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-500/30 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      id="btn-toggle-password-visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {cookieBlocked && (
              <div
                id="admin-cookie-blocked-notice"
                className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-amber-900 dark:text-amber-100">
                      Admin Portal requires a first-party browser tab.
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                      This preview is embedded inside AI Studio, where browser privacy settings may block secure administrative session cookies.
                    </p>
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      Open Admin Portal in a new tab to continue.
                    </p>
                  </div>
                </div>
                <a
                  id="btn-open-admin-new-tab"
                  href="/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm transition-colors text-xs cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Admin Portal in New Tab</span>
                </a>
              </div>
            )}

            {error && !cookieBlocked && (
              <div
                id="login-error-alert"
                className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-400 font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              id="login-btn-submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold text-sm shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In via {loginMode === 'passkey' ? 'Passkey' : 'Supabase'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer info */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-slate-400 dark:text-slate-600">
        &copy; {new Date().getFullYear()} ProBItian. Secure Administrative Access.
      </footer>
    </div>
  );
};
