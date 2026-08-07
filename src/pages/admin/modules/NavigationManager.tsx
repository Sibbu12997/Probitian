import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ArrowUp, ArrowDown, CheckCircle2, Menu } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { NavigationItem } from '../../../types';

export const NavigationManager: React.FC = () => {
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadNav();
  }, []);

  const loadNav = async () => {
    const data = await cmsService.getNavigation();
    setNavItems(data);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const copy = [...navItems];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= copy.length) return;
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    copy.forEach((item, i) => (item.display_order = i + 1));
    setNavItems(copy);
  };

  const handleAdd = () => {
    setNavItems([
      ...navItems,
      {
        id: 'nav-' + Date.now(),
        label: 'New Page',
        path: 'new-path',
        icon: 'BookOpen',
        display_order: navItems.length + 1,
        is_visible: true
      }
    ]);
  };

  const handleDelete = (id: string) => {
    setNavItems(navItems.filter((n) => n.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await cmsService.saveNavigation(navItems);
    setSaving(false);
    setMessage('Navigation menu saved!');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Header Navigation Menu Manager</h2>
          <p className="text-xs text-slate-400">Reorder, rename, or toggle visibility for navbar pages.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Menu</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Menu'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        {navItems.map((item, idx) => (
          <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMove(idx, 'up')}
                disabled={idx === 0}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(idx, 'down')}
                disabled={idx === navItems.length - 1}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3">
              <input
                type="text"
                value={item.label}
                onChange={(e) => {
                  const copy = [...navItems];
                  copy[idx].label = e.target.value;
                  setNavItems(copy);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                placeholder="Label"
              />
              <input
                type="text"
                value={item.path}
                onChange={(e) => {
                  const copy = [...navItems];
                  copy[idx].path = e.target.value;
                  setNavItems(copy);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono"
                placeholder="Path Key"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.is_visible}
                  onChange={(e) => {
                    const copy = [...navItems];
                    copy[idx].is_visible = e.target.checked;
                    setNavItems(copy);
                  }}
                  className="rounded bg-slate-900 border-slate-700 text-purple-600"
                />
                <span>Show</span>
              </label>

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded bg-slate-900 hover:bg-red-500/20 text-slate-500 hover:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </form>
  );
};
