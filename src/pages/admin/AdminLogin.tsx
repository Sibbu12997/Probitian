import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight, Key } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: (userEmail: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@probitian.com');
  const [password, setPassword] = useState('');
  const [passkey, setPasskey] = useState('');
  const [usePasskey, setUsePasskey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (usePasskey) {
        // Passkey authentication mode
        const validPasskey = import.meta.env.VITE_ADMIN_PASSKEY;
        if (validPasskey && passkey.trim() === validPasskey.trim()) {
          onLoginSuccess(email || 'admin@probitian.com');
        } else {
          setError('Invalid credentials');
        }
        setLoading(false);
        return;
      }

      // Supabase Auth Mode
      if (isSupabaseConfigured()) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (authError || !data.user) {
          setError('Invalid credentials');
        } else {
          onLoginSuccess(data.user.email || 'admin@probitian.com');
        }
      } else {
        const validPasskey = import.meta.env.VITE_ADMIN_PASSKEY;
        if (validPasskey && password.trim() === validPasskey.trim()) {
          onLoginSuccess(email || 'admin@probitian.com');
        } else {
          setError('Invalid credentials');
        }
      }
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
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
            Secure Admin Access
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => {
              setUsePasskey(true);
              setError(null);
            }}
            className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
              usePasskey ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Admin Passkey
          </button>
          <button
            type="button"
            onClick={() => {
              setUsePasskey(false);
              setError(null);
            }}
            className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
              !usePasskey ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Supabase Login
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
              <label className="text-xs font-semibold text-slate-300">Admin Passkey</label>
              <div className="relative">
                <Key className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  placeholder="Enter Admin Passkey"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium text-center">
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
                <span>Sign In to Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
