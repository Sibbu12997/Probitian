import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Edit3, 
  Calendar, 
  Mail, 
  Scale, 
  ArrowUp, 
  ArrowDown,
  Info
} from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { LegalSettings, LegalDocument, LegalSection, DEFAULT_LEGAL_SETTINGS } from '../../../data/defaultLegalData';

export const LegalManager: React.FC = () => {
  const [settings, setSettings] = useState<LegalSettings>(DEFAULT_LEGAL_SETTINGS);
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'config'>('terms');
  const [activeMode, setActiveMode] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await cmsService.getLegalSettings();
      setSettings(data);
    } catch (e) {
      console.error('Failed to load legal settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setToastMessage(null);
    try {
      const updatedSettings: LegalSettings = {
        ...settings,
        terms: {
          ...settings.terms,
          lastUpdated: new Date().toISOString()
        },
        privacy: {
          ...settings.privacy,
          lastUpdated: new Date().toISOString()
        }
      };

      const success = await cmsService.saveLegalSettings(updatedSettings);
      if (success) {
        setSettings(updatedSettings);
        setToastMessage({ type: 'success', text: 'Legal Policies & Terms updated successfully!' });
      } else {
        setToastMessage({ type: 'error', text: 'Failed to save legal settings to server.' });
      }
    } catch (e) {
      console.error('Error saving legal settings:', e);
      setToastMessage({ type: 'error', text: 'An unexpected error occurred while saving.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const updateDocField = (docKey: 'terms' | 'privacy', field: keyof LegalDocument, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [docKey]: {
        ...prev[docKey],
        [field]: value
      }
    }));
  };

  const updateSection = (docKey: 'terms' | 'privacy', index: number, field: keyof LegalSection, value: string) => {
    setSettings((prev) => {
      const doc = prev[docKey];
      const newSections = [...doc.sections];
      newSections[index] = { ...newSections[index], [field]: value };
      return {
        ...prev,
        [docKey]: {
          ...doc,
          sections: newSections
        }
      };
    });
  };

  const addSection = (docKey: 'terms' | 'privacy') => {
    setSettings((prev) => {
      const doc = prev[docKey];
      const nextNum = doc.sections.length + 1;
      const newSection: LegalSection = {
        id: `${docKey}-${Date.now()}`,
        title: `${nextNum}. New Section Title`,
        body: 'Enter detailed clause or policy statement here.'
      };
      return {
        ...prev,
        [docKey]: {
          ...doc,
          sections: [...doc.sections, newSection]
        }
      };
    });
  };

  const removeSection = (docKey: 'terms' | 'privacy', index: number) => {
    setSettings((prev) => {
      const doc = prev[docKey];
      const newSections = doc.sections.filter((_, i) => i !== index);
      return {
        ...prev,
        [docKey]: {
          ...doc,
          sections: newSections
        }
      };
    });
  };

  const moveSection = (docKey: 'terms' | 'privacy', index: number, direction: 'up' | 'down') => {
    setSettings((prev) => {
      const doc = prev[docKey];
      const newSections = [...doc.sections];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSections.length) return prev;
      const temp = newSections[index];
      newSections[index] = newSections[targetIndex];
      newSections[targetIndex] = temp;
      return {
        ...prev,
        [docKey]: {
          ...doc,
          sections: newSections
        }
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading Legal & Policies CMS...</p>
        </div>
      </div>
    );
  }

  const currentDoc = activeTab === 'terms' ? settings.terms : settings.privacy;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Legal & Policies Manager</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage editable Terms of Service, Privacy Policy, contact details and governing jurisdiction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab !== 'config' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeMode === 'edit'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                onClick={() => setActiveMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Public Preview</span>
              </button>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Policies'}</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'terms'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Terms of Service (/terms)</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'privacy'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Privacy Policy (/privacy-policy)</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>General Policy Config</span>
        </button>
      </div>

      {/* Content Body */}
      {activeTab === 'config' ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-500" />
            General Policy Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Official Legal Contact Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="probitianofficial@gmail.com"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Displayed in user rights and contact clauses across all documents.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Governing Jurisdiction / Law
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={settings.governingLaw}
                  onChange={(e) => setSettings({ ...settings, governingLaw: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="[Configure applicable jurisdiction]"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Substituted into Section 17 of Terms of Service.</p>
            </div>
          </div>
        </div>
      ) : activeMode === 'preview' ? (
        /* Preview Component */
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Live Document Preview
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{currentDoc.title}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{currentDoc.subtitle}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Effective Date: {currentDoc.effectiveDate || 'August 9, 2026'} | Last Updated: {new Date(currentDoc.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="space-y-6 max-w-4xl">
            {currentDoc.sections.map((sec) => (
              <div key={sec.id} className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{sec.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {sec.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Editor Mode */
        <div className="space-y-6">
          {/* Header Metadata Editors */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Document Header Information</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Title</label>
                <input
                  type="text"
                  value={currentDoc.title}
                  onChange={(e) => updateDocField(activeTab, 'title', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={currentDoc.subtitle}
                  onChange={(e) => updateDocField(activeTab, 'subtitle', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Effective Date Label</label>
                <input
                  type="text"
                  value={currentDoc.effectiveDate || ''}
                  onChange={(e) => updateDocField(activeTab, 'effectiveDate', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="August 9, 2026"
                />
              </div>
            </div>
          </div>

          {/* Section Clauses List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Sections & Clauses ({currentDoc.sections.length})</h3>
                <p className="text-xs text-slate-500">Edit, reorder, or add clauses below.</p>
              </div>

              <button
                onClick={() => addSection(activeTab)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold text-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Section</span>
              </button>
            </div>

            <div className="space-y-4">
              {currentDoc.sections.map((sec, idx) => (
                <div key={sec.id || idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg">
                      Section #{idx + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveSection(activeTab, idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveSection(activeTab, idx, 'down')}
                        disabled={idx === currentDoc.sections.length - 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeSection(activeTab, idx)}
                        className="p-1.5 rounded-lg text-red-500/80 hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer ml-2"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Clause Heading
                    </label>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => updateSection(activeTab, idx, 'title', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Clause Content / Text
                    </label>
                    <textarea
                      rows={3}
                      value={sec.body}
                      onChange={(e) => updateSection(activeTab, idx, 'body', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Required Legal Disclaimer Notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
        <Info className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-bold">Legal Disclaimer:</strong> These documents are general website policies and should be reviewed by qualified legal counsel before being relied upon as formal legal documents.
        </p>
      </div>
    </div>
  );
};
