import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { HomePageConfig } from '../../../types';

export const HomePageManager: React.FC = () => {
  const [config, setConfig] = useState<HomePageConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const data = await cmsService.getHomePageConfig();
    setConfig(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    await cmsService.saveHomePageConfig(config);
    setSaving(false);
    setMessage('Home page configuration updated successfully!');
    setTimeout(() => setMessage(null), 4000);
  };

  if (!config) return <div className="text-white text-xs p-4">Loading home page config...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Home Page Content Manager</h2>
          <p className="text-xs text-slate-400">Edit hero text, buttons, banner, statistics, and call-to-action live.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Hero Section</h3>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Hero Heading</label>
          <textarea
            rows={2}
            value={config.hero_heading}
            onChange={(e) => setConfig({ ...config, hero_heading: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Hero Description</label>
          <textarea
            rows={3}
            value={config.hero_description}
            onChange={(e) => setConfig({ ...config, hero_description: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Official Banner Graphic URL</label>
          <input
            type="text"
            value={config.banner_url}
            onChange={(e) => setConfig({ ...config, banner_url: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Hero Buttons */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Call to Action Buttons</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.buttons.map((btn, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Button Label</label>
                <input
                  type="text"
                  value={btn.label}
                  onChange={(e) => {
                    const btns = [...config.buttons];
                    btns[idx].label = e.target.value;
                    setConfig({ ...config, buttons: btns });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Target Path / Page</label>
                <input
                  type="text"
                  value={btn.path}
                  onChange={(e) => {
                    const btns = [...config.buttons];
                    btns[idx].path = e.target.value;
                    setConfig({ ...config, buttons: btns });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Counter Cards */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Key Statistics Counters</h3>
          <button
            type="button"
            onClick={() => {
              const stats = [...config.statistics, { label: 'New Metric', value: '100+' }];
              setConfig({ ...config, statistics: stats });
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Metric</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {config.statistics.map((stat, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative group">
              <button
                type="button"
                onClick={() => {
                  const stats = config.statistics.filter((_, i) => i !== idx);
                  setConfig({ ...config, statistics: stats });
                }}
                className="absolute right-2 top-2 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Value</label>
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => {
                    const stats = [...config.statistics];
                    stats[idx].value = e.target.value;
                    setConfig({ ...config, statistics: stats });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs font-bold text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Label</label>
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => {
                    const stats = [...config.statistics];
                    stats[idx].label = e.target.value;
                    setConfig({ ...config, statistics: stats });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
};
