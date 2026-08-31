import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { HomePageConfig } from '../../../types';
import { DEFAULT_HOME_CONFIG } from '../../../constants/branding';
import { MediaInput } from '../../../components/admin/MediaInput';

export const HomePageManager: React.FC = () => {
  const [config, setConfig] = useState<HomePageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cmsService.getHomePageConfig();
      setConfig(data || (DEFAULT_HOME_CONFIG as HomePageConfig));
    } catch (err: any) {
      console.error('Failed to load home page config:', err);
      setError('Unable to load server configuration. Showing default configuration.');
      setConfig(DEFAULT_HOME_CONFIG as HomePageConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const success = await cmsService.saveHomePageConfig(config);
      if (success) {
        setMessage('Home page configuration updated successfully!');
        setTimeout(() => setMessage(null), 4000);
      } else {
        setError('Failed to save home page configuration to server.');
      }
    } catch (err: any) {
      console.error('Error saving home page config:', err);
      setError(err?.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-slate-500 dark:text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-xs font-semibold">Loading home page configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Failed to initialize home page configuration</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The configuration could not be loaded from the server or local storage.
        </p>
        <button
          type="button"
          onClick={loadConfig}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  const buttons = Array.isArray(config.buttons) ? config.buttons : [];
  const statistics = Array.isArray(config.statistics) ? config.statistics : [];

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
            Home Page Content Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Edit hero text, buttons, banner graphic, statistics, and call-to-action sections live.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <h3 className="text-xs md:text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Hero Section</h3>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hero Heading</label>
          <textarea
            rows={2}
            value={config.hero_heading || ''}
            onChange={(e) => setConfig({ ...config, hero_heading: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hero Description</label>
          <textarea
            rows={3}
            value={config.hero_description || ''}
            onChange={(e) => setConfig({ ...config, hero_description: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <MediaInput 
            label="Official Banner Graphic URL" 
            value={config.banner_url || ''} 
            onChange={(url) => setConfig({ ...config, banner_url: url })} 
          />
        </div>
      </div>

      {/* Hero Buttons */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs md:text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Call to Action Buttons</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {buttons.map((btn, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Button Label</label>
                <input
                  type="text"
                  value={btn.label || ''}
                  onChange={(e) => {
                    const btns = [...buttons];
                    btns[idx] = { ...btns[idx], label: e.target.value };
                    setConfig({ ...config, buttons: btns });
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Target Path / Page</label>
                <input
                  type="text"
                  value={btn.path || ''}
                  onChange={(e) => {
                    const btns = [...buttons];
                    btns[idx] = { ...btns[idx], path: e.target.value };
                    setConfig({ ...config, buttons: btns });
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Counter Cards */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs md:text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Key Statistics Counters</h3>
          <button
            type="button"
            onClick={() => {
              const stats = [...statistics, { label: 'New Metric', value: '100+' }];
              setConfig({ ...config, statistics: stats });
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold text-xs flex items-center gap-1 cursor-pointer border border-amber-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Metric</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {statistics.map((stat, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 relative group">
              <button
                type="button"
                onClick={() => {
                  const stats = statistics.filter((_, i) => i !== idx);
                  setConfig({ ...config, statistics: stats });
                }}
                className="absolute right-2 top-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Value</label>
                <input
                  type="text"
                  value={stat.value || ''}
                  onChange={(e) => {
                    const stats = [...statistics];
                    stats[idx] = { ...stats[idx], value: e.target.value };
                    setConfig({ ...config, statistics: stats });
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Label</label>
                <input
                  type="text"
                  value={stat.label || ''}
                  onChange={(e) => {
                    const stats = [...statistics];
                    stats[idx] = { ...stats[idx], label: e.target.value };
                    setConfig({ ...config, statistics: stats });
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
};
