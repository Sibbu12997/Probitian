import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Sliders, Palette, Shield } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { WebsiteGeneralSettings } from '../../../types';
import { MediaInput } from '../../../components/admin/MediaInput';

export const SettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<WebsiteGeneralSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await cmsService.getGeneralSettings();
    setSettings(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    await cmsService.saveGeneralSettings(settings);
    setSaving(false);
    setMessage('Website settings saved!');
    setTimeout(() => setMessage(null), 3000);
  };

  if (!settings) return <div className="text-slate-900 dark:text-white text-xs p-4">Loading settings...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
            Website General Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure site name, brand graphics, footer, and emails.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Website Name</label>
            <input
              type="text"
              required
              value={settings.website_name}
              onChange={(e) => setSettings({ ...settings, website_name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tagline</label>
            <input
              type="text"
              value={settings.tagline}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Primary Website & Communication Email <span className="text-slate-400 font-normal">(Default: probitianofficial@gmail.com)</span>
          </label>
          <input
            type="email"
            required
            value={settings.contact_email}
            onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
            placeholder="probitianofficial@gmail.com"
          />
          <p className="text-[11px] text-slate-400">
            Public contact email displayed across site footers and forms. Server SMTP credentials (<code className="font-mono text-purple-500">GMAIL_USER</code> / <code className="font-mono text-purple-500">GMAIL_APP_PASSWORD</code>) remain securely isolated in server environment variables and cannot be edited from this UI.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <MediaInput 
              label="Logo SVG / Image URL" 
              value={settings.logo_url} 
              onChange={(url) => setSettings({ ...settings, logo_url: url })} 
            />
          </div>
          <div className="space-y-1">
            <MediaInput 
              label="Official Banner URL" 
              value={settings.banner_url} 
              onChange={(url) => setSettings({ ...settings, banner_url: url })} 
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Footer Copyright Text</label>
          <input
            type="text"
            value={settings.footer_copyright}
            onChange={(e) => setSettings({ ...settings, footer_copyright: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Community Hub Location Settings</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Community Hub Name</label>
              <input
                type="text"
                value={settings.community_hub_name || 'ProBitian Community Hub'}
                onChange={(e) => setSettings({ ...settings, community_hub_name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold"
                placeholder="ProBitian Community Hub"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Google Maps URL</label>
              <input
                type="text"
                value={settings.community_hub_maps_url || 'https://maps.app.goo.gl/T4426JADcNHHFPqb7'}
                onChange={(e) => setSettings({ ...settings, community_hub_maps_url: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                placeholder="https://maps.app.goo.gl/T4426JADcNHHFPqb7"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hub Physical Address</label>
            <input
              type="text"
              value={settings.community_hub_address || 'M93M+688, Salaiya, Madhya Pradesh 486440, India'}
              onChange={(e) => setSettings({ ...settings, community_hub_address: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              placeholder="M93M+688, Salaiya, Madhya Pradesh 486440, India"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
