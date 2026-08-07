import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Share2 } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { SocialLinkItem } from '../../../types';

export const SocialLinksManager: React.FC = () => {
  const [links, setLinks] = useState<SocialLinkItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    const data = await cmsService.getSocialLinks();
    setLinks(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    for (const item of links) {
      await cmsService.saveSocialLink(item);
    }
    setSaving(false);
    setMessage('Social links updated successfully!');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Social Media & Contact Links</h2>
          <p className="text-xs text-slate-400">Manage social URLs displayed across Header, Footer, and Contact page.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Links'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        {links.map((item, idx) => (
          <div key={item.id || idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{item.platform}</span>
              <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.is_active}
                  onChange={(e) => {
                    const copy = [...links];
                    copy[idx].is_active = e.target.checked;
                    setLinks(copy);
                  }}
                  className="rounded bg-slate-900 border-slate-700 text-purple-600"
                />
                <span>Active</span>
              </label>
            </div>

            <input
              type="text"
              value={item.url}
              onChange={(e) => {
                const copy = [...links];
                copy[idx].url = e.target.value;
                setLinks(copy);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
            />
          </div>
        ))}
      </div>
    </form>
  );
};
