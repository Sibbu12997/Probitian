import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Globe, Search } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { SeoSettings } from '../../../types';
import { MediaInput } from '../../../components/admin/MediaInput';

export const SeoManager: React.FC = () => {
  const [seo, setSeo] = useState<SeoSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSeo();
  }, []);

  const loadSeo = async () => {
    const data = await cmsService.getSeoSettings();
    setSeo(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seo) return;
    setSaving(true);
    await cmsService.saveSeoSettings(seo);
    setSaving(false);
    setMessage('SEO meta tags saved successfully!');
    setTimeout(() => setMessage(null), 3000);
  };

  if (!seo) return <div className="text-slate-900 dark:text-white text-xs p-4">Loading SEO configuration...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
            SEO & Meta Tags Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure global search engine optimization, keywords, and social sharing tags.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save SEO'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Global Title Tag</label>
          <input
            type="text"
            required
            value={seo.meta_title}
            onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Global Meta Description</label>
          <textarea
            rows={3}
            required
            value={seo.meta_description}
            onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Keywords (comma separated)</label>
          <input
            type="text"
            value={seo.keywords}
            onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <MediaInput 
              label="Open Graph Preview Image URL" 
              value={seo.og_image} 
              onChange={(url) => setSeo({ ...seo, og_image: url })} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Twitter Handle</label>
            <input
              type="text"
              value={seo.twitter_handle}
              onChange={(e) => setSeo({ ...seo, twitter_handle: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Robots.txt Content</label>
          <textarea
            rows={3}
            value={seo.robots_txt}
            onChange={(e) => setSeo({ ...seo, robots_txt: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
          />
        </div>
      </div>
    </form>
  );
};
