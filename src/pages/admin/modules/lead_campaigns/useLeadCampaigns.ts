import { useState, useEffect, useRef } from 'react';
import { LeadCampaign, Lead, CampaignLead, MediaItem } from '../../../../types';
import { cmsService } from '../../../../services/cmsService';
import { OUTREACH_TEMPLATES, DEFAULT_SAMPLE_LEAD } from './constants';
import { interpolatePreviewText, sanitizePreviewHtml } from './utils';
import { ToastFeedback, TestEmailResult, BroadcastResult, CampaignStats } from './types';

export function useLeadCampaigns(initialSelectedLeadIds: string[] = []) {
  const [campaigns, setCampaigns] = useState<LeadCampaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Notifications
  const [feedback, setFeedback] = useState<ToastFeedback | null>(null);

  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewLeadId, setPreviewLeadId] = useState<string>('');

  const [editingCampaign, setEditingCampaign] = useState<Partial<LeadCampaign>>({
    name: '',
    subject: '',
    preheader: '',
    html_content: OUTREACH_TEMPLATES[0].content,
    status: 'draft'
  });

  const [isSaving, setIsSaving] = useState(false);

  // Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState('shivam@probitian.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<TestEmailResult | null>(null);

  // Broadcast / Send Outreach Modal
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [targetCampaign, setTargetCampaign] = useState<LeadCampaign | null>(null);
  const [selectedLeadIdsForBroadcast, setSelectedLeadIdsForBroadcast] = useState<Set<string>>(new Set(initialSelectedLeadIds));
  const [broadcastPriorityFilter, setBroadcastPriorityFilter] = useState<string>('all');
  const [broadcastStatusFilter, setBroadcastStatusFilter] = useState<string>('Not Contacted');
  const [broadcastSearchTerm, setBroadcastSearchTerm] = useState('');
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);

  // Analytics & Recipient Details Modal
  const [viewingCampaign, setViewingCampaign] = useState<(LeadCampaign & { recipients?: CampaignLead[] }) | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Media Library Picker
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  // Editor Ref
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, lList, mList] = await Promise.all([
        cmsService.getLeadCampaigns(),
        cmsService.getLeads(),
        cmsService.getMediaItems()
      ]);
      setCampaigns(cList);
      setLeads(lList);
      setMediaList(mList);
      if (lList.length > 0 && !previewLeadId) {
        setPreviewLeadId(lList[0].id);
      }
    } catch (e) {
      console.error('Failed to load lead campaigns:', e);
      showFeedback('error', 'Failed to load outreach campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Metrics calculation
  const totalCampaigns = campaigns.length;
  const totalSentDeliveries = campaigns.reduce((acc, c) => acc + (c.successful_count || 0), 0);
  const totalFailedDeliveries = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);
  const totalDeliveries = totalSentDeliveries + totalFailedDeliveries;
  const deliverySuccessRate = totalDeliveries > 0 ? Math.round((totalSentDeliveries / totalDeliveries) * 100) : 100;
  const draftsCount = campaigns.filter(c => c.status === 'draft').length;

  const stats: CampaignStats = {
    totalCampaigns,
    totalSentDeliveries,
    totalFailedDeliveries,
    totalDeliveries,
    deliverySuccessRate,
    draftsCount,
    availableProspectsCount: leads.length
  };

  // Insert Variable Token into Editor
  const handleInsertVariable = (token: string) => {
    if (!editorRef.current) {
      setEditingCampaign(prev => ({ ...prev, html_content: (prev.html_content || '') + ' ' + token }));
      return;
    }

    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = editingCampaign.html_content || '';
    const updated = current.substring(0, start) + token + current.substring(end);

    setEditingCampaign(prev => ({ ...prev, html_content: updated }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  // Apply Preset Outreach Template
  const handleApplyTemplate = (tmpl: (typeof OUTREACH_TEMPLATES)[0]) => {
    if (editingCampaign.html_content && editingCampaign.html_content.trim() !== '') {
      if (!window.confirm(`Replace current draft content with template "${tmpl.name}"?`)) {
        return;
      }
    }
    setEditingCampaign(prev => ({
      ...prev,
      name: prev.name || tmpl.name,
      subject: tmpl.subject,
      preheader: tmpl.preheader,
      html_content: tmpl.content
    }));
    showFeedback('success', `Applied template "${tmpl.name}".`);
  };

  // Insert HTML snippet
  const handleInsertHtmlSnippet = (snippet: string) => {
    if (!editorRef.current) {
      setEditingCampaign(prev => ({ ...prev, html_content: (prev.html_content || '') + '\n' + snippet }));
      return;
    }
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = editingCampaign.html_content || '';
    const updated = current.substring(0, start) + '\n' + snippet + '\n' + current.substring(end);

    setEditingCampaign(prev => ({ ...prev, html_content: updated }));
  };

  // Media Library Insert
  const handleSelectMediaImage = (url: string) => {
    const imgHtml = `<p style="text-align: center; margin: 24px 0;"><img src="${url}" alt="ProBitian Analytics" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0;" /></p>`;
    handleInsertHtmlSnippet(imgHtml);
    setIsMediaPickerOpen(false);
  };

  // Create Campaign
  const handleOpenNewCampaign = () => {
    setEditingCampaign({
      id: undefined,
      name: '',
      subject: 'Custom Power BI Analytics Proposal for {{company_name}}',
      preheader: 'Tailored business intelligence solutions for {{company_name}}',
      html_content: OUTREACH_TEMPLATES[0].content,
      status: 'draft'
    });
    setTestResult(null);
    setActiveTab('write');
    setIsEditorOpen(true);
  };

  // Edit Campaign
  const handleOpenEditCampaign = (camp: LeadCampaign) => {
    setEditingCampaign({ ...camp });
    setTestResult(null);
    setActiveTab('write');
    setIsEditorOpen(true);
  };

  // Save Campaign
  const handleSaveCampaign = async () => {
    if (!editingCampaign.name?.trim()) {
      showFeedback('error', 'Please enter a campaign name.');
      return;
    }
    if (!editingCampaign.subject?.trim()) {
      showFeedback('error', 'Please enter an email subject line.');
      return;
    }
    if (!editingCampaign.html_content?.trim()) {
      showFeedback('error', 'Email body content cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await cmsService.saveLeadCampaign(editingCampaign);
      if (res.success && res.campaign) {
        showFeedback('success', 'Lead outreach campaign saved successfully.');
        setIsEditorOpen(false);
        loadData();
      } else {
        showFeedback('error', 'Failed to save lead campaign.');
      }
    } catch (e: any) {
      showFeedback('error', e?.message || 'Error saving campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (camp: LeadCampaign) => {
    if (window.confirm(`Are you sure you want to delete lead outreach campaign "${camp.name}"?`)) {
      const ok = await cmsService.deleteLeadCampaign(camp.id);
      if (ok) {
        showFeedback('success', `Campaign "${camp.name}" deleted.`);
        loadData();
      } else {
        showFeedback('error', 'Failed to delete campaign.');
      }
    }
  };

  // Send Test Email
  const triggerTest = async (campaignId: string) => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      showFeedback('error', 'Please enter a valid test recipient email address.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await cmsService.sendTestLeadCampaign(campaignId, testEmailAddress, previewLeadId || undefined);
      setTestResult(res);
      if (res.success) {
        showFeedback('success', `Personalized test email sent to ${testEmailAddress}!`);
      } else {
        showFeedback('error', res.message || 'Failed to send test email.');
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || 'Failed to send test email.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!editingCampaign.id) {
      // Auto-save first
      if (!editingCampaign.name || !editingCampaign.subject || !editingCampaign.html_content) {
        showFeedback('error', 'Please complete the campaign name, subject, and content first.');
        return;
      }
      const saved = await cmsService.saveLeadCampaign(editingCampaign);
      if (saved.success && saved.campaign) {
        setEditingCampaign(saved.campaign);
        triggerTest(saved.campaign.id);
      } else {
        showFeedback('error', 'Failed to save draft before sending test.');
      }
    } else {
      triggerTest(editingCampaign.id);
    }
  };

  // Open Broadcast Modal
  const handleOpenSendModal = (camp: LeadCampaign) => {
    setTargetCampaign(camp);
    setBroadcastResult(null);
    // Preselect leads based on filter (e.g. all Not Contacted)
    const eligible = leads.filter(l => l.status === 'Not Contacted' && l.status !== 'Do Not Contact' && l.status !== 'Bounced');
    setSelectedLeadIdsForBroadcast(new Set(eligible.map(l => l.id)));
    setIsSendModalOpen(true);
  };

  // Toggle Lead in Broadcast Modal
  const toggleBroadcastLead = (id: string) => {
    const next = new Set(selectedLeadIdsForBroadcast);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedLeadIdsForBroadcast(next);
  };

  // Select all eligible leads matching current broadcast modal filters
  const handleSelectAllBroadcastLeads = (matchedIds: string[]) => {
    if (selectedLeadIdsForBroadcast.size === matchedIds.length && matchedIds.length > 0) {
      setSelectedLeadIdsForBroadcast(new Set());
    } else {
      setSelectedLeadIdsForBroadcast(new Set(matchedIds));
    }
  };

  // Execute Bulk Broadcast
  const handleExecuteBroadcast = async () => {
    if (!targetCampaign) return;
    if (selectedLeadIdsForBroadcast.size === 0) {
      showFeedback('error', 'Please select at least one recipient lead.');
      return;
    }

    if (!window.confirm(`Are you sure you want to dispatch outreach campaign "${targetCampaign.name}" to ${selectedLeadIdsForBroadcast.size} selected leads?`)) {
      return;
    }

    setIsSendingBulk(true);
    setBroadcastResult(null);
    try {
      const res = await cmsService.sendBulkLeadCampaign(
        targetCampaign.id,
        Array.from(selectedLeadIdsForBroadcast),
        10 // safe batch size
      );

      setBroadcastResult(res);
      if (res.success) {
        showFeedback('success', `Campaign outreach completed! ${res.successfulCount || 0} emails delivered successfully.`);
        loadData();
      } else {
        showFeedback('error', res.message || 'Outreach send failed.');
      }
    } catch (e: any) {
      setBroadcastResult({ success: false, message: e?.message || 'Outreach broadcast error.' });
      showFeedback('error', e?.message || 'Outreach broadcast error.');
    } finally {
      setIsSendingBulk(false);
    }
  };

  // View Campaign Delivery Logs
  const handleViewCampaignLogs = async (camp: LeadCampaign) => {
    setViewingCampaign(camp);
    setLoadingRecipients(true);
    try {
      const detailed = await cmsService.getLeadCampaignById(camp.id);
      if (detailed) {
        setViewingCampaign(detailed);
      }
    } catch (e) {
      console.warn('Failed to load campaign recipients:', e);
    } finally {
      setLoadingRecipients(false);
    }
  };

  // Calculate live preview lead data
  const sampleLead = leads.find(l => l.id === previewLeadId) || leads[0] || DEFAULT_SAMPLE_LEAD;

  const getPersonalizedPreviewHtml = (): string => {
    const raw = editingCampaign.html_content || '';
    const interpolated = interpolatePreviewText(raw, sampleLead, true);
    return sanitizePreviewHtml(interpolated);
  };

  const getPersonalizedSubject = (): string => {
    return interpolatePreviewText(editingCampaign.subject || '', sampleLead, false);
  };

  // Filtered campaigns for table
  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(s) ||
        c.subject.toLowerCase().includes(s) ||
        (c.preheader && c.preheader.toLowerCase().includes(s))
      );
    }
    return true;
  });

  // Filtered leads inside the broadcast modal
  const broadcastFilteredLeads = leads.filter(l => {
    if (l.status === 'Do Not Contact' || l.status === 'Bounced') return false;
    if (broadcastStatusFilter !== 'all' && l.status !== broadcastStatusFilter) return false;
    if (broadcastPriorityFilter !== 'all' && l.lead_priority !== broadcastPriorityFilter) return false;
    if (broadcastSearchTerm.trim()) {
      const s = broadcastSearchTerm.toLowerCase();
      return (
        l.company_name.toLowerCase().includes(s) ||
        (l.contact_person && l.contact_person.toLowerCase().includes(s)) ||
        l.email.toLowerCase().includes(s) ||
        (l.industry && l.industry.toLowerCase().includes(s))
      );
    }
    return true;
  });

  return {
    campaigns,
    leads,
    mediaList,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    feedback,
    setFeedback,
    showFeedback,
    loadData,
    stats,
    filteredCampaigns,
    // Editor state & handlers
    isEditorOpen,
    setIsEditorOpen,
    activeTab,
    setActiveTab,
    previewDevice,
    setPreviewDevice,
    previewLeadId,
    setPreviewLeadId,
    editingCampaign,
    setEditingCampaign,
    isSaving,
    editorRef,
    handleInsertVariable,
    handleApplyTemplate,
    handleInsertHtmlSnippet,
    handleSelectMediaImage,
    handleOpenNewCampaign,
    handleOpenEditCampaign,
    handleSaveCampaign,
    handleDeleteCampaign,
    // Test email
    testEmailAddress,
    setTestEmailAddress,
    isSendingTest,
    testResult,
    setTestResult,
    handleSendTestEmail,
    // Broadcast
    isSendModalOpen,
    setIsSendModalOpen,
    targetCampaign,
    setTargetCampaign,
    selectedLeadIdsForBroadcast,
    setSelectedLeadIdsForBroadcast,
    broadcastPriorityFilter,
    setBroadcastPriorityFilter,
    broadcastStatusFilter,
    setBroadcastStatusFilter,
    broadcastSearchTerm,
    setBroadcastSearchTerm,
    isSendingBulk,
    broadcastResult,
    setBroadcastResult,
    handleOpenSendModal,
    toggleBroadcastLead,
    handleSelectAllBroadcastLeads,
    handleExecuteBroadcast,
    broadcastFilteredLeads,
    // Analytics/Logs
    viewingCampaign,
    setViewingCampaign,
    loadingRecipients,
    handleViewCampaignLogs,
    // Preview helpers
    sampleLead,
    getPersonalizedPreviewHtml,
    getPersonalizedSubject,
    // Media Picker
    isMediaPickerOpen,
    setIsMediaPickerOpen
  };
}
