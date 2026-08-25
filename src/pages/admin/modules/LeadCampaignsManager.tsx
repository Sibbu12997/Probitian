import React, { useState, useEffect, useRef } from 'react';
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
  Layout,
  Smartphone,
  Monitor,
  Building2,
  Briefcase,
  Calendar,
  CheckSquare,
  Square,
  ListOrdered,
  List
} from 'lucide-react';
import { LeadCampaign, Lead, CampaignLead, MediaItem } from '../../../types';
import { cmsService } from '../../../services/cmsService';
import { MediaPicker } from '../../../components/admin/MediaPicker';

function sanitizePreviewHtml(rawHtml?: string): string {
  if (!rawHtml) return '<p class="text-slate-400 italic">No body content written yet.</p>';
  let clean = rawHtml;
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<\/?(?:iframe|object|embed|applet|base|meta|form|link)\b[^>]*>/gi, '');
  clean = clean.replace(/\s*on[a-zA-Z]+\s*=\s*(['"])[^'"]*\1/gi, '');
  clean = clean.replace(/\s*on[a-zA-Z]+\s*=\s*[^>\s]+/gi, '');
  clean = clean.replace(/href\s*=\s*(['"])\s*(?:javascript|vbscript|data(?!\:image)):[^'"]*\1/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*(['"])\s*(?:javascript|vbscript):[^'"]*\1/gi, 'src=""');
  return clean;
}

const OUTREACH_TEMPLATES = [
  {
    id: 'executive_powerbi',
    name: 'Executive Power BI Analytics Proposal',
    subject: 'Transforming {{company_name}}\'s Data into Real-Time Power BI Dashboards',
    preheader: 'Tailored Business Intelligence & automated KPI dashboards for {{company_name}}',
    content: `<p>Hi {{contact_person}},</p>
<p>I hope this email finds you well at <strong>{{company_name}}</strong>.</p>
<p>I have been following your growth in the <strong>{{industry}}</strong> sector and noticed there is a significant opportunity to streamline your reporting and executive decision-making.</p>
<h2>🎯 Tailored Power BI Solution for {{company_name}}</h2>
<p>We specialize in building enterprise-grade Microsoft Power BI ecosystems designed specifically for challenges like:</p>
<div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 6px;">
  <p style="margin: 0; font-weight: 600; color: #1e293b;">Targeted Scope: {{powerbi_use_case}}</p>
</div>
<ul>
  <li><strong>Automated Data Pipelines:</strong> Connect SAP, SQL Server, Excel, and CRM into one unified single source of truth.</li>
  <li><strong>Executive KPI Dashboards:</strong> Real-time visibility into operational efficiency, revenue metrics, and scrap/downtime costs.</li>
  <li><strong>Mobile & Desktop Access:</strong> Secure, role-based dashboards accessible anytime by leadership.</li>
</ul>
<p>Would you or your analytics team be open to a brief 15-minute introductory call this week to review a live demo relevant to {{company_name}}?</p>
<p style="text-align: center; margin: 30px 0;">
  <a href="https://probitian.ai.studio/#/contact" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Schedule 15-Min Power BI Discovery Call &rarr;</a>
</p>
<p>Best regards,<br />
<strong>Shivam & The ProBitian Business Intelligence Team</strong><br />
<span style="color: #64748b; font-size: 13px;">Microsoft Power BI Specialists & Enterprise Analytics Consultants</span><br />
<a href="https://probitian.ai.studio/" style="color: #7c3aed; font-size: 13px;">probitian.ai.studio</a></p>`
  },
  {
    id: 'manufacturing_oee',
    name: 'Manufacturing Plant OEE & Scrap Costing Audit',
    subject: 'Optimizing Plant OEE & Scrap Reduction at {{company_name}}',
    preheader: 'Eliminate manual Excel MIS reports with automated Power BI dashboards',
    content: `<p>Dear {{contact_person}},</p>
<p>Reaching out to you regarding plant operations and production intelligence at <strong>{{company_name}}</strong> in {{location}}.</p>
<p>Manufacturing leaders in {{industry}} frequently spend hours reconciling manual shift logs and daily Excel MIS spreadsheets. We help operations heads automate this entire workflow directly in Power BI.</p>
<h2>⚙️ Real-Time Plant Analytics Scope:</h2>
<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 6px;">
  <p style="margin: 0; font-weight: 600; color: #14532d;">Focus Area: {{powerbi_use_case}}</p>
</div>
<ul>
  <li><strong>Hourly Machine OEE & Downtime Tracking:</strong> Identify bottlenecks before they hurt weekly output.</li>
  <li><strong>Scrap & Rework Cost Analytics:</strong> Track batch variance and defect root causes in real-time.</li>
  <li><strong>Shop Floor Power BI Display:</strong> Live TV dashboards on the plant floor for shift supervisors.</li>
</ul>
<p>I would love to share a 5-minute interactive video demo showing how similar manufacturing plants automated their MIS.</p>
<p style="text-align: center; margin: 28px 0;">
  <a href="https://probitian.ai.studio/#/projects" style="background-color: #0f172a; color: #f59e0b; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; border: 1px solid #f59e0b;">View Manufacturing Case Studies &rarr;</a>
</p>
<p>Warm regards,<br />
<strong>Shivam</strong><br />
Lead Power BI Architect | ProBitian<br />
<span style="color: #64748b; font-size: 13px;">Direct: <a href="https://probitian.ai.studio/#/contact" style="color: #7c3aed;">Contact Us</a> | <a href="https://probitian.ai.studio/" style="color: #7c3aed;">probitian.ai.studio</a></span></p>`
  },
  {
    id: 'cfo_financial_deck',
    name: 'CFO & Financial BI Reporting Automation',
    subject: 'Financial Performance & Cash Flow Intelligence for {{company_name}}',
    preheader: 'Automated P&L, Working Capital & Variance Analysis in Microsoft Power BI',
    content: `<p>Hi {{contact_person}},</p>
<p>As {{company_name}} continues to scale within {{industry}}, getting instant answers on cash flows, EBITDA margins, and budget variances is crucial.</p>
<p>We partner with financial directors and CFOs to replace month-end spreadsheet fatigue with dynamic, boardroom-ready Power BI reporting.</p>
<h2>📊 What We Deliver for {{company_name}}:</h2>
<div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 16px; margin: 20px 0; border-radius: 6px;">
  <p style="margin: 0; font-weight: 600; color: #713f12;">Requirement: {{powerbi_use_case}}</p>
</div>
<ul>
  <li><strong>Dynamic P&L and Balance Sheet:</strong> Drill down from high-level EBITDA to individual GL line items in 2 clicks.</li>
  <li><strong>Working Capital & Aging Analysis:</strong> Live overdue receivables and payable schedules with automated alerts.</li>
  <li><strong>Zero-Manual Reconciliation:</strong> Seamless connection with Tally, SAP, or QuickBooks.</li>
</ul>
<p>Could we set up a 10-minute introduction next Tuesday or Wednesday?</p>
<p style="text-align: center; margin: 28px 0;">
  <a href="https://probitian.ai.studio/#/contact" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Request Financial BI Demo &rarr;</a>
</p>
<p>Best regards,<br />
<strong>ProBitian BI Solutions Team</strong><br />
<a href="https://probitian.ai.studio/" style="color: #7c3aed;">probitian.ai.studio</a></p>`
  }
];

const VARIABLE_TAGS = [
  { tag: '{{company_name}}', label: 'Company Name', desc: 'Target company name' },
  { tag: '{{contact_person}}', label: 'Contact Person', desc: 'Full name or greeting' },
  { tag: '{{industry}}', label: 'Industry', desc: 'Business domain' },
  { tag: '{{location}}', label: 'Location', desc: 'City or state' },
  { tag: '{{powerbi_use_case}}', label: 'Power BI Use Case', desc: 'Specific analytics need' },
  { tag: '{{phone}}', label: 'Phone', desc: 'Contact phone' },
  { tag: '{{linkedin}}', label: 'LinkedIn', desc: 'LinkedIn URL' }
];

interface LeadCampaignsManagerProps {
  initialSelectedLeadIds?: string[];
}

export const LeadCampaignsManager: React.FC<LeadCampaignsManagerProps> = ({ initialSelectedLeadIds = [] }) => {
  const [campaigns, setCampaigns] = useState<LeadCampaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Broadcast / Send Outreach Modal
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [targetCampaign, setTargetCampaign] = useState<LeadCampaign | null>(null);
  const [selectedLeadIdsForBroadcast, setSelectedLeadIdsForBroadcast] = useState<Set<string>>(new Set(initialSelectedLeadIds));
  const [broadcastPriorityFilter, setBroadcastPriorityFilter] = useState<string>('all');
  const [broadcastStatusFilter, setBroadcastStatusFilter] = useState<string>('Not Contacted');
  const [broadcastSearchTerm, setBroadcastSearchTerm] = useState('');
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string; successfulCount?: number; failedCount?: number } | null>(null);

  // Analytics & Recipient Details Modal
  const [viewingCampaign, setViewingCampaign] = useState<(LeadCampaign & { recipients?: CampaignLead[] }) | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Media Library Picker
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  // Editor Ref
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadData();
  }, []);

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

  // Metrics calculation
  const totalCampaigns = campaigns.length;
  const totalSentDeliveries = campaigns.reduce((acc, c) => acc + (c.successful_count || 0), 0);
  const totalFailedDeliveries = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);
  const totalDeliveries = totalSentDeliveries + totalFailedDeliveries;
  const deliverySuccessRate = totalDeliveries > 0 ? Math.round((totalSentDeliveries / totalDeliveries) * 100) : 100;
  const draftsCount = campaigns.filter(c => c.status === 'draft').length;

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
  const handleApplyTemplate = (tmpl: typeof OUTREACH_TEMPLATES[0]) => {
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

  // Calculate live preview HTML by replacing dynamic tokens with preview lead data
  const sampleLead = leads.find(l => l.id === previewLeadId) || leads[0] || {
    company_name: 'Tata Motors Commercial Vehicles',
    industry: 'Automotive Manufacturing',
    location: 'Pune, Maharashtra',
    contact_person: 'Amit Deshmukh',
    email: 'amit.deshmukh@tatamotors.com',
    phone: '+91 98220 11223',
    linkedin: 'https://linkedin.com/in/amit-deshmukh',
    powerbi_use_case: 'Plant Assembly Line OEE, Downtime Analysis & Scrap Costing Dashboard',
    lead_priority: 'High'
  };

  const interpolatePreviewText = (text: string): string => {
    if (!text) return '';
    let res = text;
    const company = sampleLead.company_name || 'Tata Motors Commercial';
    const contact = sampleLead.contact_person || 'Amit Deshmukh';
    const industry = sampleLead.industry || 'Automotive Manufacturing';
    const location = sampleLead.location || 'Pune, Maharashtra';
    const useCase = sampleLead.powerbi_use_case || 'Plant Assembly Line OEE, Downtime Analysis & Scrap Costing Dashboard';
    const phone = sampleLead.phone || '+91 98220 11223';
    const linkedin = sampleLead.linkedin || 'https://linkedin.com/in/amit-deshmukh';
    const priority = sampleLead.lead_priority || 'High';
    const email = sampleLead.email || 'amit.deshmukh@tatamotors.com';

    const mapping: Record<string, string> = {
      company_name: company,
      company: company,
      companyname: company,
      contact_person: contact,
      contactperson: contact,
      contact: contact,
      name: contact,
      fullname: contact,
      person: contact,
      industry: industry,
      sector: industry,
      location: location,
      city: location,
      region: location,
      powerbi_use_case: useCase,
      power_bi_use_case: useCase,
      powerbiusecase: useCase,
      use_case: useCase,
      usecase: useCase,
      phone: phone,
      mobile: phone,
      tel: phone,
      linkedin: linkedin,
      linkedin_url: linkedin,
      linkedinurl: linkedin,
      lead_priority: priority,
      leadpriority: priority,
      priority: priority,
      email: email
    };

    for (const [key, val] of Object.entries(mapping)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      res = res.replace(regex, val);
    }
    return res.replace(/{{\s*[\w_]+\s*}}/g, '');
  };

  const getPersonalizedPreviewHtml = (): string => {
    const raw = editingCampaign.html_content || '';
    const interpolated = interpolatePreviewText(raw);
    return sanitizePreviewHtml(interpolated);
  };

  const getPersonalizedSubject = (): string => {
    return interpolatePreviewText(editingCampaign.subject || '');
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

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-600/20">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
                Lead Outreach Campaigns
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalized B2B email sequences, Power BI proposals, and enterprise outreach broadcast engine.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenNewCampaign}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-purple-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Compose Lead Outreach</span>
        </button>
      </div>

      {/* Notifications Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outreach Campaigns</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCampaigns}</p>
          <span className="text-[10px] text-slate-500">{draftsCount} drafts created</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Emails Delivered</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{totalSentDeliveries}</p>
          <span className="text-[10px] text-slate-500">To B2B prospect inboxes</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Delivery Rate</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{deliverySuccessRate}%</p>
          <span className="text-[10px] text-slate-500">SMTP delivery success</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Available Prospects</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{leads.length}</p>
          <span className="text-[10px] text-slate-500">Business leads in CRM</span>
        </div>
      </div>

      {/* Campaigns Table Container */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search lead outreach campaigns..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Drafts</option>
              <option value="sent">Sent</option>
              <option value="partially_sent">Partially Sent</option>
              <option value="failed">Failed</option>
            </select>

            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
              <p className="text-xs">Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Mail className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Outreach Campaigns Yet</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Create a high-impact personalized email template using dynamic lead tags like {`{{company_name}}`}.
              </p>
              <button
                onClick={handleOpenNewCampaign}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Compose First Outreach</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-3">Campaign Name & Subject</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Sent Progress</th>
                  <th className="py-3 px-3">Last Sent</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{camp.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          Personalized
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">
                        Subject: {camp.subject}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          camp.status === 'sent'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : camp.status === 'partially_sent'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : camp.status === 'failed'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {camp.successful_count || 0} / {camp.total_recipients || 0}
                        </div>
                        {camp.failed_count ? (
                          <span className="text-[10px] text-red-500 font-bold">({camp.failed_count} failed)</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {camp.sent_at ? new Date(camp.sent_at).toLocaleString() : 'Not sent yet'}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenSendModal(camp)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                          title="Send to Selected Leads"
                        >
                          <Send className="w-3 h-3 text-amber-300" />
                          <span>Dispatch</span>
                        </button>

                        <button
                          onClick={() => handleViewCampaignLogs(camp)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                          title="View Delivery Logs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEditCampaign(camp)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
                          title="Edit Campaign"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteCampaign(camp)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* FULL EMAIL EDITOR MODAL */}
      {isEditorOpen && (
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
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'write'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
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
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                          onClick={() => handleApplyTemplate(tmpl)}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 text-left transition-all group"
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
                          onClick={() => handleInsertVariable(item.tag)}
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
                      onClick={() => handleInsertHtmlSnippet('<h2>Your Section Heading</h2>')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                    >
                      <Heading className="w-3.5 h-3.5 text-purple-600" /> Heading
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertHtmlSnippet('<p>Write your detailed paragraph here...</p>')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> Paragraph
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertHtmlSnippet('<div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 6px;">\n  <p style="margin: 0; font-weight: 600; color: #1e293b;">Key Highlight or Case Study Metric</p>\n</div>')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                    >
                      <Layout className="w-3.5 h-3.5 text-indigo-600" /> Callout Box
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertHtmlSnippet('<p style="text-align: center; margin: 28px 0;"><a href="https://probitian.ai.studio/#/contact" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Schedule Consultation &rarr;</a></p>')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-600" /> CTA Button
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMediaPickerOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-slate-600"
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
                          className={`p-1.5 rounded-md ${previewDevice === 'desktop' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                          title="Desktop Preview"
                        >
                          <Monitor className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPreviewDevice('mobile')}
                          className={`p-1.5 rounded-md ${previewDevice === 'mobile' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
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
                            {editingCampaign.preheader.replace(/\{\{\s*company_name\s*\}\}/gi, sampleLead.company_name)}
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
                      onClick={handleSendTestEmail}
                      disabled={isSendingTest}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
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
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCampaign}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Campaign</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH / BROADCAST MODAL */}
      {isSendModalOpen && targetCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Dispatch Outreach: {targetCampaign.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select target B2B prospects for this outreach sequence.
                  </p>
                </div>
              </div>

              <button onClick={() => setIsSendModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Campaign summary card */}
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1">
                <p className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                  Subject: {targetCampaign.subject}
                </p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300">
                  Each email will be dynamically customized with the recipient lead's Company Name, Use Case, and Contact Person.
                </p>
              </div>

              {/* Lead Audience Filters */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Select Recipient Leads ({selectedLeadIdsForBroadcast.size} selected):
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={broadcastStatusFilter}
                      onChange={(e) => setBroadcastStatusFilter(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Not Contacted">Not Contacted Only</option>
                      <option value="Contacted">Already Contacted</option>
                      <option value="Opened">Opened</option>
                      <option value="Replied">Replied</option>
                    </select>

                    <select
                      value={broadcastPriorityFilter}
                      onChange={(e) => setBroadcastPriorityFilter(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                    >
                      <option value="all">All Priorities</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={broadcastSearchTerm}
                    onChange={(e) => setBroadcastSearchTerm(e.target.value)}
                    placeholder="Search in recipient list..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Recipient Selection Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3 w-8 text-center">
                          <button
                            onClick={() => handleSelectAllBroadcastLeads(broadcastFilteredLeads.map(l => l.id))}
                            className="text-slate-400 hover:text-purple-600"
                          >
                            {selectedLeadIdsForBroadcast.size > 0 && selectedLeadIdsForBroadcast.size === broadcastFilteredLeads.length ? (
                              <CheckSquare className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="py-2 px-3">Company & Contact</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Priority</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {broadcastFilteredLeads.map(lead => {
                        const isSelected = selectedLeadIdsForBroadcast.has(lead.id);
                        return (
                          <tr
                            key={lead.id}
                            onClick={() => toggleBroadcastLead(lead.id)}
                            className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                              isSelected ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-purple-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{lead.company_name}</span>
                              {lead.contact_person && (
                                <span className="text-slate-500 text-[10px] ml-1.5">({lead.contact_person})</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{lead.email}</td>
                            <td className="py-2 px-3">
                              <span className="text-[10px] font-bold">{lead.lead_priority}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[10px] text-slate-500">{lead.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Broadcast Result */}
              {broadcastResult && (
                <div
                  className={`p-4 rounded-2xl text-xs space-y-1 ${
                    broadcastResult.success
                      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/30'
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5">
                    {broadcastResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    <span>{broadcastResult.message}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleExecuteBroadcast}
                disabled={isSendingBulk || selectedLeadIdsForBroadcast.size === 0}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSendingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-amber-300" />}
                <span>Send to {selectedLeadIdsForBroadcast.size} Leads</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGN DELIVERY LOGS & RECIPIENTS MODAL */}
      {viewingCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Delivery Report: {viewingCampaign.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Detailed recipient delivery history & provider status.
                </p>
              </div>
              <button onClick={() => setViewingCampaign(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Processed</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{viewingCampaign.total_recipients || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Delivered</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{viewingCampaign.successful_count || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                  <p className="text-[10px] uppercase font-bold text-red-600">Failed</p>
                  <p className="text-xl font-black text-red-600 dark:text-red-400">{viewingCampaign.failed_count || 0}</p>
                </div>
              </div>

              {loadingRecipients ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-500" />
                </div>
              ) : !viewingCampaign.recipients || viewingCampaign.recipients.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  No individual recipient logs found for this campaign yet.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Prospect Company</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Sent At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewingCampaign.recipients.map((rec: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {rec.lead_company || rec.leads?.company_name || 'Prospect'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                            {rec.lead_email || rec.leads?.email}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                rec.status === 'sent'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                              }`}
                            >
                              {rec.status}
                            </span>
                            {rec.error_message && (
                              <p className="text-[9px] text-red-500 line-clamp-1">{rec.error_message}</p>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[10px]">
                            {rec.sent_at ? new Date(rec.sent_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingCampaign(null)}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {isMediaPickerOpen && (
        <MediaPicker
          onClose={() => setIsMediaPickerOpen(false)}
          onSelect={handleSelectMediaImage}
        />
      )}
    </div>
  );
};
