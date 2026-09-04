import React from 'react';
import {
  Send,
  Eye,
  X,
  Sparkles,
  Heading,
  FileText,
  Layout,
  Link as LinkIcon,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  SendHorizontal,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { LeadCampaign, Lead } from '../../../../types';
import { OUTREACH_TEMPLATES, VARIABLE_TAGS } from './constants';
import { OutreachTemplate, TestEmailResult } from './types';

interface CampaignEditorModalProps {
  editingCampaign: Partial<LeadCampaign>;
  setEditingCampaign: React.Dispatch<React.SetStateAction<Partial<LeadCampaign>>>;
  activeTab: 'write' | 'preview';
  setActiveTab: (tab: 'write' | 'preview') => void;
  previewDevice: 'desktop' | 'mobile';
  setPreviewDevice: (device: 'desktop' | 'mobile') => void;
  previewLeadId: string;
  setPreviewLeadId: (id: string) => void;
  leads: Lead[];
  sampleLead: Partial<Lead>;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  isSaving: boolean;
  isSendingTest: boolean;
  testEmailAddress: string;
  setTestEmailAddress: (email: string) => void;
  testResult: TestEmailResult | null;
  onClose: () => void;
  onSave: () => void;
  onSendTestEmail: () => void;
  onApplyTemplate: (tmpl: OutreachTemplate) => void;
  onInsertVariable: (token: string) => void;
  onInsertHtmlSnippet: (snippet: string) => void;
  onOpenMediaPicker: () => void;
  getPersonalizedPreviewHtml: () => string;
  getPersonalizedSubject: () => string;
}

export const CampaignEditorModal: React.FC<CampaignEditorModalProps> = ({
  editingCampaign,
  setEditingCampaign,
  activeTab,
  setActiveTab,
  previewDevice,
  setPreviewDevice,
  previewLeadId,
  setPreviewLeadId,
  leads,
  sampleLead,
  editorRef,
  isSaving,
  isSendingTest,
  testEmailAddress,
  setTestEmailAddress,
  testResult,
  onClose,
  onSave,
  onSendTestEmail,
  onApplyTemplate,
  onInsertVariable,
  onInsertHtmlSnippet,
  onOpenMediaPicker,
  getPersonalizedPreviewHtml,
  getPersonalizedSubject
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingCampaign.id ? 'Edit Lead Outreach Campaign' : 'Compose Lead Outreach Campaign'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Use dynamic tags to automatically personalize each recipient's company, industry, and use case.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch Write / Preview */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('write')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'write'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview as Lead</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'write' ? (
            <div className="space-y-5">
              {/* Preset Templates Selector */}
              <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Pre-Built B2B Outreach Templates</span>
                  </p>
                  <span className="text-[10px] text-slate-400">Click to load into editor</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {OUTREACH_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => onApplyTemplate(tmpl)}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 text-left transition-all group cursor-pointer"
                    >
                      <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {tmpl.name}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {tmpl.subject}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Campaign Internal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCampaign.name || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                    placeholder="e.g. Q3 Automotive Plant Power BI Sequence"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Line (Supports dynamic tags) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCampaign.subject || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, subject: e.target.value })}
                    placeholder="e.g. Power BI Analytics & Scrap Cost Optimization for {{company_name}}"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Preheader / Inbox Preview Text
                </label>
                <input
                  type="text"
                  value={editingCampaign.preheader || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, preheader: e.target.value })}
                  placeholder="e.g. Tailored business intelligence solutions for {{company_name}}"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                />
              </div>

              {/* Personalization Variables Toolbar */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Insert Personalization Tag (Click to insert):</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {VARIABLE_TAGS.map(item => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => onInsertVariable(item.tag)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-purple-600 hover:text-white text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-mono font-bold transition-colors cursor-pointer shadow-xs"
                      title={item.desc}
                    >
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* HTML Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => onInsertHtmlSnippet('<h2>Your Section Heading</h2>')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600 cursor-pointer"
                >
                  <Heading className="w-3.5 h-3.5 text-purple-600" /> Heading
                </button>
                <button
                  type="button"
                  onClick={() => onInsertHtmlSnippet('<p>Write your detailed paragraph here...</p>')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => onInsertHtmlSnippet('<div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 6px;">\n  <p style="margin: 0; font-weight: 600; color: #1e293b;">Key Highlight or Case Study Metric</p>\n</div>')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600 cursor-pointer"
                >
                  <Layout className="w-3.5 h-3.5 text-indigo-600" /> Callout Box
                </button>
                <button
                  type="button"
                  onClick={() => onInsertHtmlSnippet('<p style="text-align: center; margin: 28px 0;"><a href="https://probitian.ai.studio/contact" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Schedule Consultation &rarr;</a></p>')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600 cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-emerald-600" /> CTA Button
                </button>
                <button
                  type="button"
                  onClick={onOpenMediaPicker}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600" /> Insert Media
                </button>
              </div>

              {/* Body Textarea */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Body Content (HTML & Dynamic Variables) <span className="text-red-500">*</span>
                </label>
                <textarea
                  ref={editorRef}
                  rows={14}
                  value={editingCampaign.html_content || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, html_content: e.target.value })}
                  placeholder="Write your email body in HTML. Use {{company_name}}, {{contact_person}}, {{powerbi_use_case}} to personalize dynamically."
                  className="w-full p-4 font-mono text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white leading-relaxed"
                />
              </div>
            </div>
          ) : (
            /* LIVE PERSONALIZED PREVIEW TAB */
            <div className="space-y-4">
              {/* Lead Selector for Preview */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Previewing as:
                  </span>
                  <select
                    value={previewLeadId}
                    onChange={(e) => setPreviewLeadId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.company_name} ({l.contact_person || l.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">View:</span>
                  <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-md cursor-pointer ${previewDevice === 'desktop' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                      title="Desktop Preview"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-md cursor-pointer ${previewDevice === 'mobile' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                      title="Mobile Preview"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Rendered Preview Card */}
              <div className="flex justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
                <div
                  className={`bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden transition-all ${
                    previewDevice === 'mobile' ? 'w-full max-w-sm' : 'w-full max-w-2xl'
                  }`}
                >
                  {/* Email Header Preview */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-1 font-sans">
                    <p className="text-slate-500">
                      <strong>From:</strong> Shivam & The ProBitian Team &lt;shivam@probitian.com&gt;
                    </p>
                    <p className="text-slate-500">
                      <strong>To:</strong> {sampleLead.contact_person ? `${sampleLead.contact_person} <${sampleLead.email}>` : sampleLead.email}
                    </p>
                    <p className="font-bold text-slate-900 text-sm pt-1">
                      {getPersonalizedSubject()}
                    </p>
                    {editingCampaign.preheader && (
                      <p className="text-[11px] text-slate-400 italic">
                        {editingCampaign.preheader.replace(/\{\{\s*company_name\s*\}\}/gi, sampleLead.company_name || '')}
                      </p>
                    )}
                  </div>

                  {/* Rendered Body Preview */}
                  <div className="p-6 sm:p-8">
                    {/* ProBitian Logo Header */}
                    <div className="text-center pb-6 mb-6 border-b border-slate-100">
                      <span className="font-black text-slate-900 text-xl tracking-tight">
                        Pro<span className="text-amber-500">BI</span>tian
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Enterprise Power BI & Business Intelligence</p>
                    </div>

                    <div
                      className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                      dangerouslySetInnerHTML={{ __html: getPersonalizedPreviewHtml() }}
                    />

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400 space-y-1">
                      <p>© {new Date().getFullYear()} ProBitian Analytics. All rights reserved.</p>
                      <p className="text-[10px]">
                        You received this tailored message regarding analytics modernization for {sampleLead.company_name}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Send Test Email Drawer / Action */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <SendHorizontal className="w-4 h-4 text-purple-600" />
                  <span>Send Personalized Test Email to Yourself</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Dispatches a live test email rendered with sample lead data ({sampleLead.company_name}) to your inbox.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="your.email@probitian.com"
                  className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 w-52 sm:w-64"
                />
                <button
                  type="button"
                  onClick={onSendTestEmail}
                  disabled={isSendingTest}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Test</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save Campaign</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
