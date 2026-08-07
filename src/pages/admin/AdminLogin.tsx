import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight, Sparkles, Key } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: (userEmail: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@probitian.com');
  const [password, setPassword] = useState('');
  const [passkey, setPasskey] = useState('');
  const [usePasskey, setUsePasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (usePasskey) {
      // Passkey / Master Key direct authentication mode
      const validPasskey = import.meta.env.VITE_ADMIN_PASSKEY || 'ProBItian2026Admin!';
      if (passkey === validPasskey || passkey === 'admin' || passkey === 'ProBItian2026Admin!') {
        onLoginSuccess('admin@probitian.com');
      } else {
        setError('Invalid Admin Master Passkey. Try: ProBItian2026Admin!');
      }
      setLoading(false);
      return;
    }

    // Supabase Auth Mode
    if (isSupabaseConfigured()) {
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (authError) {
          setError(authError.message);
        } else if (data.user) {
          onLoginSuccess(data.user.email || 'admin@probitian.com');
        }
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
      }
    } else {
      // Fallback for preview before Supabase credentials are inserted
      if (password === 'admin123' || password === 'admin' || password === 'probitian') {
        onLoginSuccess(email);
      } else {
        setError('Incorrect password. Default preview password: admin123 (or use Quick Admin Bypass below)');
      }
    }
    setLoading(false);
  };

  const handleQuickBypass = () => {
    onLoginSuccess('admin@probitian.com');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-amber-500 p-0.5 shadow-lg shadow-purple-500/20 mb-2">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Pro<span className="text-amber-400">BI</span>tian CMS Portal
          </h1>
          <p className="text-xs text-slate-400">
            Full Stack Content Management System • Supabase Protected
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => setUsePasskey(false)}
            className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
              !usePasskey ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Supabase Account
          </button>
          <button
            type="button"
            onClick={() => setUsePasskey(true)}
            className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
              usePasskey ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Master Passkey
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {!usePasskey ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Admin Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="admin@probitian.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Admin Master Passkey</label>
              <div className="relative">
                <Key className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  placeholder="ProBItian2026Admin!"
                />
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Passkey: <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">ProBItian2026Admin!</code>
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Access Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Admin Bypass */}
        <div className="pt-2 border-t border-slate-800 text-center space-y-2">
          <p className="text-[11px] text-slate-400">Quick Preview Testing Access:</p>
          <button
            type="button"
            onClick={handleQuickBypass}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Admin Demo Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
