import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Quote, 
  Target, 
  Award, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Lightbulb, 
  Compass, 
  Cpu, 
  Database,
  ExternalLink,
  Linkedin,
  Youtube,
  Mail,
  User,
  ShieldCheck,
  LayoutTemplate
} from 'lucide-react';
import { XIcon } from '../../../components/icons/XIcon';
import { cmsService } from '../../../services/cmsService';
import { FounderMessageConfig, FounderHighlight, FounderSocialLink } from '../../../types';
import { DEFAULT_FOUNDER_MESSAGE } from '../../../data/defaultFounderData';
import { MediaInput } from '../../../components/admin/MediaInput';

const AVAILABLE_ICONS: { [key: string]: React.ElementType } = {
  Target,
  Award,
  CheckCircle2,
  Sparkles,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Compass,
  Cpu,
  Database
};

export const FounderMessageManager: React.FC = () => {
  const [config, setConfig] = useState<FounderMessageConfig>(DEFAULT_FOUNDER_MESSAGE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await cmsService.getFounderMessage();
      setConfig(data);
    } catch (err: any) {
      console.error('Failed to load founder message config:', err);
      setMessage({ type: 'error', text: 'Failed to load configuration. Using defaults.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Client-side validation
    if (!config.name || !config.name.trim()) {
      setMessage({ type: 'error', text: 'Founder Name is required.' });
      return;
    }
    if (!config.role || !config.role.trim()) {
      setMessage({ type: 'error', text: 'Role Title is required.' });
      return;
    }
    if (!config.heading || !config.heading.trim()) {
      setMessage({ type: 'error', text: 'Main Section Heading is required.' });
      return;
    }
    const cleanParagraphs = (config.message_paragraphs || []).map(p => p.trim()).filter(Boolean);
    if (cleanParagraphs.length === 0) {
      setMessage({ type: 'error', text: 'At least one message paragraph is required.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const sanitizedConfig: FounderMessageConfig = {
        ...config,
        name: config.name.trim(),
        role: config.role.trim(),
        bio_subtitle: (config.bio_subtitle || '').trim(),
        avatar_url: (config.avatar_url || '').trim(),
        badge_text: (config.badge_text || "Founder's Note").trim(),
        heading: config.heading.trim(),
        heading_highlight: (config.heading_highlight || '').trim(),
        signature_text: (config.signature_text || '').trim(),
        message_paragraphs: cleanParagraphs,
      };

      const success = await cmsService.saveFounderMessage(sanitizedConfig);
      if (success) {
        setConfig(sanitizedConfig);
        setMessage({ type: 'success', text: 'Saved successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save configuration. Please check your admin privileges and try again.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save configuration. Please try again.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all Founder Message fields to the official ProBitian defaults?')) {
      setConfig(DEFAULT_FOUNDER_MESSAGE);
      setMessage({ type: 'success', text: 'Reset to ProBitian defaults. Click "Save Changes" to apply.' });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const addParagraph = () => {
    setConfig({
      ...config,
      message_paragraphs: [...(config.message_paragraphs || []), '']
    });
  };

  const updateParagraph = (index: number, val: string) => {
    const updated = [...(config.message_paragraphs || [])];
    updated[index] = val;
    setConfig({ ...config, message_paragraphs: updated });
  };

  const removeParagraph = (index: number) => {
    if ((config.message_paragraphs || []).length <= 1) {
      alert('At least one narrative paragraph is required.');
      return;
    }
    const updated = config.message_paragraphs.filter((_, i) => i !== index);
    setConfig({ ...config, message_paragraphs: updated });
  };

  const updateHighlight = (index: number, field: keyof FounderHighlight, val: string) => {
    const updated = [...(config.highlights || [])];
    updated[index] = { ...updated[index], [field]: val };
    setConfig({ ...config, highlights: updated });
  };

  const addHighlight = () => {
    if ((config.highlights || []).length >= 4) {
      alert('Maximum of 4 core commitments recommended for visual balance.');
      return;
    }
    const newHighlight: FounderHighlight = {
      id: Date.now().toString(),
      icon: 'Target',
      title: 'New Pillar',
      description: 'Describe this commitment or focus area.'
    };
    setConfig({
      ...config,
      highlights: [...(config.highlights || []), newHighlight]
    });
  };

  const removeHighlight = (index: number) => {
    const updated = (config.highlights || []).filter((_, i) => i !== index);
    setConfig({ ...config, highlights: updated });
  };

  const updateSocialLink = (platform: string, field: 'url' | 'enabled', val: any) => {
    const links = [...(config.social_links || [])];
    const idx = links.findIndex(l => l.platform === platform);
    if (idx >= 0) {
      links[idx] = { ...links[idx], [field]: val };
    } else {
      links.push({ platform, url: typeof val === 'string' ? val : '', enabled: typeof val === 'boolean' ? val : true });
    }
    setConfig({ ...config, social_links: links });
  };

  const getSocialLinkVal = (platform: string): { url: string; enabled: boolean } => {
    const found = (config.social_links || []).find(l => l.platform === platform);
    return {
      url: found?.url || '',
      enabled: found?.enabled !== false
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3" />
        <span className="text-sm font-semibold">Loading Founder Message settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header & Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
              Founder &amp; CEO Message
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              config.enabled 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {config.enabled ? 'Published on About Page' : 'Draft / Hidden'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
            Manage the editorial narrative, founder photo via Media Library, guiding pillars, and verified social links.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live Preview
            </button>
          </div>

          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {activeTab === 'editor' ? (
        <div className="space-y-6">
          {/* 1. Publication & Visibility Toggle */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-purple-600" />
                  Section Visibility
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Control whether the Founder Message section appears on the public About page.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                <span className="ml-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          {/* 2. Founder Identity & Portrait (Media Library Integrated) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <User className="w-4 h-4 text-purple-600" />
              Founder Profile &amp; Portrait
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Left Portrait Preview Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/70 flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  {config.avatar_url ? (
                    <img
                      src={config.avatar_url}
                      alt={config.name}
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-lg border-2 border-purple-500/50"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 p-1 shadow-lg flex items-center justify-center text-white text-3xl font-black">
                      <span className="tracking-wider">
                        {config.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SS'}
                      </span>
                    </div>
                  )}

                  {config.show_verified_badge && (
                    <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-white shadow-md" title="Verified Badge">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {config.name || 'Founder Name'}
                  </p>
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {config.role || 'Role & Title'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {config.bio_subtitle || 'Subtitle / Focus'}
                  </p>
                </div>
              </div>

              {/* Right Form Fields */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Founder Full Name</label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      placeholder="e.g. Shivam Singh"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Role / Title</label>
                    <input
                      type="text"
                      value={config.role}
                      onChange={(e) => setConfig({ ...config, role: e.target.value })}
                      placeholder="e.g. Founder & Lead BI Instructor"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Subtitle / Specialization</label>
                  <input
                    type="text"
                    value={config.bio_subtitle || ''}
                    onChange={(e) => setConfig({ ...config, bio_subtitle: e.target.value })}
                    placeholder="e.g. Data Analyst & Business Intelligence Specialist"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Media Library Image Selector */}
                <MediaInput
                  label="Founder Portrait Image (Select from Media Library or Upload)"
                  value={config.avatar_url || ''}
                  onChange={(url) => setConfig({ ...config, avatar_url: url })}
                />

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={Boolean(config.show_verified_badge)}
                      onChange={(e) => setConfig({ ...config, show_verified_badge: e.target.checked })}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Display Verified Instructor badge</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Editorial Message Content */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Quote className="w-4 h-4 text-purple-600" />
              Editorial Message &amp; Headlines
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Eyebrow / Badge Text</label>
                <input
                  type="text"
                  value={config.badge_text || "Founder's Note"}
                  onChange={(e) => setConfig({ ...config, badge_text: e.target.value })}
                  placeholder="e.g. Founder's Note"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Main Headline</label>
                <input
                  type="text"
                  value={config.heading || 'Why We Built ProBItian'}
                  onChange={(e) => setConfig({ ...config, heading: e.target.value })}
                  placeholder="e.g. Why We Built ProBItian"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Narrative Paragraphs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Message Narrative (Paragraphs)
                </label>
                <button
                  type="button"
                  onClick={addParagraph}
                  className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Paragraph
                </button>
              </div>

              {(config.message_paragraphs || []).map((paragraph, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <textarea
                      rows={3}
                      value={paragraph}
                      onChange={(e) => updateParagraph(index, e.target.value)}
                      placeholder={`Paragraph ${index + 1}...`}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs leading-relaxed text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeParagraph(index)}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors cursor-pointer mt-1"
                    title="Remove paragraph"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Signature Text */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Closing Sign-off / Signature</label>
              <input
                type="text"
                value={config.signature_text || ''}
                onChange={(e) => setConfig({ ...config, signature_text: e.target.value })}
                placeholder="e.g. Shivam Singh — Founder & Instructor"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Core Guiding Pillars / Commitments */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  Guiding Commitments / Highlight Cards
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Key core values displayed as high-contrast feature cards beneath the founder note.
                </p>
              </div>
              <button
                type="button"
                onClick={addHighlight}
                className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Pillar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(config.highlights || []).map((highlight, index) => {
                const IconComponent = AVAILABLE_ICONS[highlight.icon] || Target;
                return (
                  <div
                    key={highlight.id || index}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <select
                          value={highlight.icon}
                          onChange={(e) => updateHighlight(index, 'icon', e.target.value)}
                          className="bg-white dark:bg-slate-700 text-[11px] font-semibold rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-600 focus:outline-none"
                        >
                          {Object.keys(AVAILABLE_ICONS).map((iconKey) => (
                            <option key={iconKey} value={iconKey}>{iconKey}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeHighlight(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 opacity-80 group-hover:opacity-100 transition-opacity"
                        title="Remove highlight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="text"
                        value={highlight.title}
                        onChange={(e) => updateHighlight(index, 'title', e.target.value)}
                        placeholder="Pillar Title"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <textarea
                        rows={2}
                        value={highlight.description}
                        onChange={(e) => updateHighlight(index, 'description', e.target.value)}
                        placeholder="Description..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[11px] leading-normal text-slate-600 dark:text-slate-300 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Social & Direct Connect Channels */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Founder Verified Social &amp; Direct Channels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* LinkedIn */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Linkedin className="w-4 h-4 text-[#0077b5]" />
                    <span>LinkedIn Profile</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getSocialLinkVal('linkedin').enabled}
                      onChange={(e) => updateSocialLink('linkedin', 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={getSocialLinkVal('linkedin').url}
                  onChange={(e) => updateSocialLink('linkedin', 'url', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* YouTube */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Youtube className="w-4 h-4 text-red-500" />
                    <span>YouTube Channel</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getSocialLinkVal('youtube').enabled}
                      onChange={(e) => updateSocialLink('youtube', 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={getSocialLinkVal('youtube').url}
                  onChange={(e) => updateSocialLink('youtube', 'url', e.target.value)}
                  placeholder="https://youtube.com/@..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* X / Twitter */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <XIcon className="w-4 h-4 text-slate-900 dark:text-white" />
                    <span>X (Twitter) Profile</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getSocialLinkVal('x').enabled}
                      onChange={(e) => updateSocialLink('x', 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={getSocialLinkVal('x').url}
                  onChange={(e) => updateSocialLink('x', 'url', e.target.value)}
                  placeholder="https://x.com/..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Direct Email */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Mail className="w-4 h-4 text-purple-500" />
                    <span>Direct Email Address</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={getSocialLinkVal('email').enabled}
                      onChange={(e) => updateSocialLink('email', 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={getSocialLinkVal('email').url}
                  onChange={(e) => updateSocialLink('email', 'url', e.target.value)}
                  placeholder="probitianofficial@gmail.com"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Live Interactive Preview */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
            <span className="font-semibold">
              Live Preview of Founder Message Section as rendered on the About Page:
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full">
              {config.enabled ? 'Enabled' : 'Draft / Disabled'}
            </span>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 sm:p-12">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
              {/* Left Identity Card */}
              <div className="w-full lg:w-80 shrink-0 space-y-5 bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center flex flex-col items-center">
                <div className="relative">
                  {config.avatar_url ? (
                    <img
                      src={config.avatar_url}
                      alt={config.name}
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-lg border-2 border-purple-500/50"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 p-1 shadow-lg flex items-center justify-center text-white text-3xl font-black">
                      <span className="tracking-wider">
                        {config.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SS'}
                      </span>
                    </div>
                  )}

                  {config.show_verified_badge && (
                    <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-white shadow-md" title="Verified Instructor">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-center">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {config.name}
                  </h3>
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {config.role}
                  </p>
                  {config.bio_subtitle && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      {config.bio_subtitle}
                    </p>
                  )}
                </div>

                <div className="w-full pt-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-center gap-2">
                  {config.social_links?.filter(l => l.enabled && l.url).map(link => {
                    if (link.platform === 'linkedin') {
                      return (
                        <div key="linkedin" className="p-2 rounded-lg bg-white dark:bg-slate-700 text-[#0077b5] shadow-xs">
                          <Linkedin className="w-4 h-4" />
                        </div>
                      );
                    }
                    if (link.platform === 'youtube') {
                      return (
                        <div key="youtube" className="p-2 rounded-lg bg-white dark:bg-slate-700 text-red-500 shadow-xs">
                          <Youtube className="w-4 h-4" />
                        </div>
                      );
                    }
                    if (link.platform === 'x') {
                      return (
                        <div key="x" className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs">
                          <XIcon className="w-4 h-4" />
                        </div>
                      );
                    }
                    if (link.platform === 'email') {
                      return (
                        <div key="email" className="p-2 rounded-lg bg-white dark:bg-slate-700 text-purple-600 shadow-xs">
                          <Mail className="w-4 h-4" />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              {/* Right Message Body */}
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    <Quote className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{config.badge_text || "Founder's Note"}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {config.heading || 'Why We Built ProBItian'}
                  </h2>
                </div>

                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {(config.message_paragraphs || []).map((p, i) => (
                    <p key={i}>"{p}"</p>
                  ))}
                </div>

                {/* Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {(config.highlights || []).map((item, i) => {
                    const IconComp = AVAILABLE_ICONS[item.icon] || Target;
                    return (
                      <div key={i} className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                          <IconComp className="w-4 h-4 text-purple-500" />
                          <span>{item.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {config.signature_text && (
                  <div className="pt-2 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    — {config.signature_text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
