import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Mail, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Eye, 
  SendHorizontal, 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Heading, 
  Code, 
  RefreshCw, 
  X, 
  Info, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Layers,
  Layout
} from 'lucide-react';
import { EmailCampaign, MediaItem } from '../../../types';
import { cmsService } from '../../../services/cmsService';

export const CampaignsManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [audienceCount, setAudienceCount] = useState(0);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Editor / Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [editingCampaign, setEditingCampaign] = useState<Partial<EmailCampaign>>({
    name: '',
    subject: '',
    preview_text: '',
    content: '<p>Hi BI Specialist,</p>\n<p>Welcome to this week\'s ProBitian Business Intelligence digest! Here are the latest guides and tutorials designed to help you master Power BI and SQL.</p>\n<h2>🚀 What\'s New This Week</h2>\n<p>Check out our latest portfolio project guide on building executive dashboards.</p>\n<p style="text-align: center; margin: 24px 0;"><a href="https://probitian.com/learn" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Explore Latest Courses &rarr;</a></p>',
    status: 'draft',
    audience_type: 'all_active'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('shivam@probitian.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Send Confirmation Modal
  const [isConfirmSendOpen, setIsConfirmSendOpen] = useState(false);
  const [targetSendCampaign, setTargetSendCampaign] = useState<EmailCampaign | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string } | null>(null);

  // Detail Modal
  const [viewingCampaign, setViewingCampaign] = useState<EmailCampaign | null>(null);

  // Media Library Picker State
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, audienceInfo, mediaItems] = await Promise.all([
        cmsService.getCampaigns(),
        cmsService.getCampaignAudienceCount(),
        cmsService.getMediaItems()
      ]);
      setCampaigns(cList);
      setAudienceCount(audienceInfo.count);
      setProviderConfigured(audienceInfo.providerConfigured);
      setMediaList(mediaItems);
    } catch (e) {
      console.error('Failed to load campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewCampaign = () => {
    setEditingCampaign({
      id: undefined,
      name: '',
      subject: '',
      preview_text: '',
      content: '<p>Hi BI Specialist,</p>\n<p>Welcome to this week\'s ProBitian Business Intelligence update! Here are our latest tutorials and portfolio guides.</p>\n<h2>🚀 What\'s New</h2>\n<p>Master DAX formulas and Power BI data models with our hands-on guides.</p>\n<p style="text-align: center; margin: 24px 0;"><a href="https://probitian.com/learn" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Explore Masterclasses &rarr;</a></p>',
      status: 'draft',
      audience_type: 'all_active'
    });
    setTestResult(null);
    setActiveTab('write');
    setIsEditorOpen(true);
  };

  const handleEditCampaign = (c: EmailCampaign) => {
    setEditingCampaign({ ...c });
    setTestResult(null);
    setActiveTab('write');
    setIsEditorOpen(true);
  };

  const handleSaveDraft = async () => {
    if (!editingCampaign.name || !editingCampaign.subject || !editingCampaign.content) {
      alert('Campaign Title, Subject Line, and Body Content are required.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await cmsService.saveCampaign({
        ...editingCampaign,
        status: editingCampaign.status === 'sent' ? 'sent' : 'draft'
      });
      if (res.success && res.campaign) {
        setIsEditorOpen(false);
        await loadData();
      }
    } catch (e) {
      alert('Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email campaign? This action cannot be undone.')) return;
    await cmsService.deleteCampaign(id);
    await loadData();
  };

  const handleSendTest = async () => {
    if (!editingCampaign.subject || !editingCampaign.content) {
      alert('Please fill in Subject Line and Body Content before sending a test.');
      return;
    }

    // First ensure campaign draft is saved
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const saveRes = await cmsService.saveCampaign({
        ...editingCampaign,
        status: editingCampaign.status === 'sent' ? 'sent' : 'draft'
      });

      if (!saveRes.success || !saveRes.campaign) {
        setTestResult({ success: false, message: 'Failed to auto-save campaign before sending test.' });
        setIsSendingTest(false);
        return;
      }

      setEditingCampaign(saveRes.campaign);

      const testRes = await cmsService.sendTestCampaign(saveRes.campaign.id, testEmailAddress);
      setTestResult(testRes);
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || 'Error triggering test email.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handlePromptSendCampaign = (c: EmailCampaign) => {
    setTargetSendCampaign(c);
    setBroadcastResult(null);
    setIsConfirmSendOpen(true);
  };

  const handleExecuteBroadcast = async () => {
    if (!targetSendCampaign) return;
    setIsBroadcasting(true);
    setBroadcastResult(null);

    try {
      const res = await cmsService.sendBulkCampaign(targetSendCampaign.id);
      setBroadcastResult(res);
      if (res.success) {
        await loadData();
      }
    } catch (e: any) {
      setBroadcastResult({ success: false, message: e?.message || 'Broadcast failed.' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Helper to insert snippet into content
  const insertContentSnippet = (snippet: string) => {
    setEditingCampaign(prev => ({
      ...prev,
      content: (prev.content || '') + '\n' + snippet
    }));
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sentCount = campaigns.filter(c => c.status === 'sent' || c.status === 'partially_sent').length;
  const draftCount = campaigns.filter(c => c.status === 'draft').length;

  return (
    <div className="space-y-8">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Email Campaign & Newsletter Manager
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Module 18
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Create, test, schedule, and broadcast email newsletters to your verified community subscriber list.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenNewCampaign}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Audience</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{audienceCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Subscribers receiving broadcasts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Campaigns</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{campaigns.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">{draftCount} drafts in progress</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sent Broadcasts</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <SendHorizontal className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{sentCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Dispatched to community</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Delivery Provider</span>
            <div className={`p-2 rounded-lg ${providerConfigured ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${providerConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              {providerConfigured ? 'Resend API Active' : 'Setup Required'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {providerConfigured ? 'Live bulk delivery ready' : 'Set RESEND_API_KEY in .env'}
          </p>
        </div>
      </div>

      {/* Provider Warning Banner if not configured */}
      {!providerConfigured && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Email Provider Setup Info (Resend API)</p>
            <p>
              Transactional emails continue sending via Gmail SMTP/Nodemailer. To enable live bulk campaign broadcasting, set <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200 font-mono">RESEND_API_KEY</code> in environment variables. Draft creation, email previews, and test email flows remain fully operational.
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search campaigns by name or subject..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="sent">Sent Broadcasts</option>
            <option value="partially_sent">Partially Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
            <span>Loading email campaigns...</span>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-3">
            <Mail className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No campaigns found</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Create your first email newsletter campaign to share tutorials, articles, and community updates with subscribers.
            </p>
            <button
              onClick={handleOpenNewCampaign}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
            >
              Create New Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase tracking-wider text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Campaign Name & Subject</th>
                  <th className="px-6 py-4">Audience</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Recipients</th>
                  <th className="px-6 py-4">Created / Sent Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 truncate max-w-xs font-medium">
                        {c.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                        <Users className="w-3 h-3 text-purple-500" />
                        All Active ({audienceCount})
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Sent
                        </span>
                      ) : c.status === 'partially_sent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" /> Partial
                        </span>
                      ) : c.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold border border-red-500/20">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                          <Clock className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      {c.status === 'sent' || c.status === 'partially_sent' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {c.successful_count} / {c.total_recipients}
                        </span>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {c.sent_at ? (
                        <div>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(c.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(c.sent_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>Created {new Date(c.created_at).toLocaleDateString()}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditCampaign(c)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Edit Campaign"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handlePromptSendCampaign(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[11px] flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                          title="Send / Broadcast Campaign"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCampaign(c.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal Drawer */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingCampaign.id ? 'Edit Campaign Draft' : 'Create New Email Campaign'}
                </h2>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('write')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'write' ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Edit Content
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'preview' ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Live Email Preview
                </button>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {activeTab === 'write' ? (
                <div className="space-y-5">
                  {/* Title & Audience */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Campaign Internal Name *</label>
                      <input
                        type="text"
                        value={editingCampaign.name || ''}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                        placeholder="e.g. July 2026 Power BI Tutorial Newsletter"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Audience</label>
                      <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between">
                        <span>All Active Subscribers</span>
                        <span className="font-mono text-purple-500 font-bold">({audienceCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Subject Line & Preview Text */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Subject Line *</label>
                      <input
                        type="text"
                        value={editingCampaign.subject || ''}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, subject: e.target.value })}
                        placeholder="e.g. New Power BI Masterclass & DAX Formula Cheat Sheet 🚀"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Preheader / Preview Text</label>
                      <input
                        type="text"
                        value={editingCampaign.preview_text || ''}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, preview_text: e.target.value })}
                        placeholder="e.g. Master Power BI data modeling with practical portfolio examples."
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Content Toolbar & Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Body HTML / Formatted Text *</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => insertContentSnippet('<h2>🚀 Featured Topic Header</h2>')}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          + Heading
                        </button>
                        <button
                          type="button"
                          onClick={() => insertContentSnippet('<p style="text-align: center; margin: 24px 0;"><a href="https://probitian.com/learn" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">View Course &rarr;</a></p>')}
                          className="px-2 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold hover:bg-purple-500/20 cursor-pointer"
                        >
                          + Button CTA
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMediaPickerOpen(true)}
                          className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 cursor-pointer flex items-center gap-1"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Media Library</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={12}
                      value={editingCampaign.content || ''}
                      onChange={(e) => setEditingCampaign({ ...editingCampaign, content: e.target.value })}
                      placeholder="Write your newsletter HTML or text here..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                    />
                  </div>

                  {/* Test Email Bar */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Send Test Email</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="Enter test recipient email..."
                        className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleSendTest}
                        disabled={isSendingTest}
                        className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                        <span>Send Test</span>
                      </button>
                    </div>

                    {testResult && (
                      <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                        testResult.success ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}>
                        {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Live Email Preview */
                <div className="bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[400px]">
                  <div className="max-w-[560px] mx-auto bg-white text-slate-900 rounded-xl shadow-lg overflow-hidden border border-slate-200">
                    {/* Mock Header */}
                    <div className="bg-slate-900 text-white p-6 text-center">
                      <div className="inline-block bg-amber-500 text-slate-950 font-black px-2.5 py-1 rounded-md text-sm mb-2">
                        PB
                      </div>
                      <h3 className="font-extrabold text-lg text-white">ProBitian Community Bulletin</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Master Business Intelligence, SQL & Power BI</p>
                    </div>

                    {/* Mock Content */}
                    <div className="p-6 text-sm text-slate-700 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: editingCampaign.content || '<p class="text-slate-400 italic">No body content written yet.</p>' }} />

                    {/* Mock Footer */}
                    <div className="bg-slate-50 p-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2">
                      <p className="font-bold text-slate-700">ProBitian Global BI Community Hub</p>
                      <p>Salaiya, Madhya Pradesh 486440, India</p>
                      <div className="pt-2 text-purple-600 font-medium">
                        <span>Unsubscribe from Newsletter</span> &bull; <span>Privacy Policy</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Saving Draft...' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditorOpen(false);
                    if (editingCampaign.id && editingCampaign.name) {
                      handlePromptSendCampaign(editingCampaign as EmailCampaign);
                    } else {
                      alert('Please save the campaign draft first.');
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Proceed to Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Picker Modal */}
      {isMediaPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-500" />
                Select Image from Media Library
              </h3>
              <button onClick={() => setIsMediaPickerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-1 p-1">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    insertContentSnippet(`<img src="${m.url}" alt="${m.filename}" style="max-width: 100%; border-radius: 8px; margin: 16px 0;" />`);
                    setIsMediaPickerOpen(false);
                  }}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 hover:border-purple-500 cursor-pointer group transition-all"
                >
                  <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={m.url} alt={m.filename} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1.5 truncate">{m.filename}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Send Confirmation Modal */}
      {isConfirmSendOpen && targetSendCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Campaign Broadcast</h3>
                <p className="text-xs text-slate-500">Explicit Admin Action Required</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Campaign:</span>
                <span className="font-bold text-slate-900 dark:text-white">{targetSendCampaign.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subject:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{targetSendCampaign.subject}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold">
                <span className="text-slate-400">Active Recipients:</span>
                <span className="text-emerald-500 text-sm font-mono">{audienceCount} Subscribers</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to broadcast this campaign to <strong className="text-slate-900 dark:text-white">{audienceCount} active subscribers</strong>?
            </p>

            {broadcastResult && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                broadcastResult.success ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
              }`}>
                {broadcastResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                <span>{broadcastResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSendOpen(false)}
                disabled={isBroadcasting}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleExecuteBroadcast}
                disabled={isBroadcasting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-purple-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Send Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
