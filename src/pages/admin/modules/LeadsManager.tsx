import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  Phone,
  Mail,
  Linkedin,
  MapPin,
  FileSpreadsheet,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  CheckSquare,
  Square,
  Briefcase,
  Layers,
  ArrowUpDown,
  History,
  Info,
  Workflow
} from 'lucide-react';
import { Lead, LeadStatus, LeadPriority, LeadSequence } from '../../../types';
import { cmsService } from '../../../services/cmsService';

const STATUS_OPTIONS: LeadStatus[] = [
  'Not Contacted',
  'Contacted',
  'Opened',
  'Replied',
  'Interested',
  'Demo Requested',
  'Proposal Sent',
  'Converted',
  'Not Interested',
  'Bounced',
  'Do Not Contact'
];

const PRIORITY_OPTIONS: LeadPriority[] = ['High', 'Medium', 'Low'];

const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  'Not Contacted': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
  'Contacted': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'Opened': { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  'Replied': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  'Interested': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  'Demo Requested': { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  'Proposal Sent': { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  'Converted': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  'Not Interested': { bg: 'bg-stone-100 dark:bg-stone-900', text: 'text-stone-600 dark:text-stone-400', border: 'border-stone-200 dark:border-stone-800' },
  'Bounced': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  'Do Not Contact': { bg: 'bg-red-100 dark:bg-red-950/50', text: 'text-red-800 dark:text-red-300', border: 'border-red-300 dark:border-red-800' }
};

const PRIORITY_COLORS: Record<LeadPriority, { bg: string; text: string; border: string }> = {
  High: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  Medium: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  Low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' }
};

interface LeadsManagerProps {
  onNavigateToOutreach?: (selectedLeadIds?: string[]) => void;
  onLaunchCampaign?: (selectedLeadIds?: string[]) => void;
  onNavigateToSequences?: () => void;
}

export const LeadsManager: React.FC<LeadsManagerProps> = ({ onNavigateToOutreach, onLaunchCampaign, onNavigateToSequences }) => {
  const launchOutreachHandler = onNavigateToOutreach || onLaunchCampaign;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [followUpFilter, setFollowUpFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sequence Enrollment Modal State
  const [isEnrollSequenceModalOpen, setIsEnrollSequenceModalOpen] = useState(false);
  const [availableSequences, setAvailableSequences] = useState<LeadSequence[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [isEnrollingInSequence, setIsEnrollingInSequence] = useState(false);
  const [leadSequencesForDrawer, setLeadSequencesForDrawer] = useState<any[]>([]);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit / Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<Lead>>({
    company_name: '',
    industry: '',
    location: '',
    contact_person: '',
    email: '',
    phone: '',
    linkedin: '',
    powerbi_use_case: '',
    lead_priority: 'Medium',
    status: 'Not Contacted',
    follow_up_date: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // View Details Modal
  const [viewingLead, setViewingLead] = useState<(Lead & { outreach_history?: any[] }) | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsvRows, setParsedCsvRows] = useState<any[]>([]);
  const [csvParseErrors, setCsvParseErrors] = useState<string[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLeads();
  }, [statusFilter, priorityFilter, followUpFilter]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await cmsService.getLeads({
        search: searchTerm,
        status: statusFilter,
        lead_priority: priorityFilter,
        follow_up: followUpFilter
      });
      setLeads(data);
      setSelectedIds(new Set());
    } catch (e: any) {
      showFeedback('error', 'Failed to load business leads.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  // Metrics calculations
  const totalLeads = leads.length;
  const contactedCount = leads.filter(l => l.status !== 'Not Contacted').length;
  const highPriorityCount = leads.filter(l => l.lead_priority === 'High').length;
  const convertedCount = leads.filter(l => l.status === 'Converted').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const followUpDueCount = leads.filter(l => l.follow_up_date && l.follow_up_date <= todayStr && l.status !== 'Converted' && l.status !== 'Not Interested').length;

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Quick Status change directly in table
  const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const prevLeads = [...leads];
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    const success = await cmsService.updateLeadStatus(leadId, { status: newStatus });
    if (!success) {
      setLeads(prevLeads);
      showFeedback('error', 'Failed to update lead status.');
    } else {
      showFeedback('success', `Lead status updated to "${newStatus}".`);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingLead({
      company_name: '',
      industry: '',
      location: '',
      contact_person: '',
      email: '',
      phone: '',
      linkedin: '',
      powerbi_use_case: '',
      lead_priority: 'Medium',
      status: 'Not Contacted',
      follow_up_date: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead({ ...lead });
    setIsModalOpen(true);
  };

  // Save Lead Form
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead.company_name?.trim() || !editingLead.email?.trim()) {
      showFeedback('error', 'Company Name and Email are required.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await cmsService.saveLead(editingLead);
      if (res.success && res.lead) {
        showFeedback('success', editingLead.id ? 'Lead updated successfully.' : 'New lead created.');
        setIsModalOpen(false);
        loadLeads();
      } else {
        showFeedback('error', res.error || 'Failed to save lead.');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Error saving lead.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Single Lead
  const handleDeleteLead = async (lead: Lead) => {
    if (window.confirm(`Are you sure you want to delete lead "${lead.company_name}" (${lead.email})?`)) {
      const ok = await cmsService.deleteLead(lead.id);
      if (ok) {
        showFeedback('success', `Lead "${lead.company_name}" removed.`);
        loadLeads();
      } else {
        showFeedback('error', 'Failed to delete lead.');
      }
    }
  };

  // Batch Delete Selected Leads
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected leads?`)) {
      const ok = await cmsService.batchDeleteLeads(Array.from(selectedIds));
      if (ok) {
        showFeedback('success', `Successfully deleted ${selectedIds.size} leads.`);
        setSelectedIds(new Set());
        loadLeads();
      } else {
        showFeedback('error', 'Failed to delete selected leads.');
      }
    }
  };

  // Open Sequence Enrollment Modal
  const handleOpenSequenceEnrollModal = async () => {
    if (selectedIds.size === 0) return;
    try {
      const seqs = await cmsService.getLeadSequences();
      setAvailableSequences(seqs || []);
      if (seqs && seqs.length > 0) {
        const activeOne = seqs.find(s => s.status === 'Active') || seqs[0];
        setSelectedSequenceId(activeOne.id);
      }
      setIsEnrollSequenceModalOpen(true);
    } catch (e: any) {
      showFeedback('error', 'Failed to load email sequences');
    }
  };

  // Execute Enrollment of Selected Leads
  const handleExecuteSequenceEnrollment = async () => {
    if (!selectedSequenceId || selectedIds.size === 0) return;
    setIsEnrollingInSequence(true);
    try {
      const res = await cmsService.enrollLeadsInSequence(selectedSequenceId, Array.from(selectedIds));
      if (res.success) {
        showFeedback('success', res.message || `Enrolled ${res.enrolledCount} leads into sequence.`);
        setIsEnrollSequenceModalOpen(false);
        setSelectedIds(new Set());
      } else {
        showFeedback('error', res.message || 'Failed to enroll leads in sequence.');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to enroll leads in sequence');
    } finally {
      setIsEnrollingInSequence(false);
    }
  };

  // View Details Modal
  const handleViewLeadDetails = async (lead: Lead) => {
    setViewingLead(lead);
    setLoadingDetails(true);
    setLeadSequencesForDrawer([]);
    try {
      const [full, seqs] = await Promise.all([
        cmsService.getLeadById(lead.id),
        cmsService.getLeadSequencesForLead(lead.id)
      ]);
      if (full) {
        setViewingLead(full);
      }
      if (seqs) {
        setLeadSequencesForDrawer(seqs);
      }
    } catch (e) {
      console.warn('Failed to load lead outreach history or sequences:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Stop sequence for lead in drawer
  const handleStopLeadSequenceFromDrawer = async (sequenceId: string, leadId: string) => {
    try {
      const res = await cmsService.stopLeadInSequence(sequenceId, leadId, 'Manual Stop from Lead Drawer');
      showFeedback('success', res.message || 'Sequence stopped for lead.');
      // Refresh sequences for this lead
      const updated = await cmsService.getLeadSequencesForLead(leadId);
      setLeadSequencesForDrawer(updated || []);
    } catch (e: any) {
      showFeedback('error', 'Failed to stop lead sequence.');
    }
  };

  // CSV Template Download
  const handleDownloadSampleCsv = () => {
    const headers = [
      'Company Name',
      'Industry',
      'Location',
      'Contact Person',
      'Email',
      'Phone',
      'LinkedIn',
      'Power BI Use Case',
      'Lead Priority',
      'Lead Status',
      'Follow-up Date',
      'Notes'
    ];

    const sampleRows = [
      [
        'Tata Motors Commercial',
        'Automotive Manufacturing',
        'Pune, Maharashtra',
        'Amit Deshmukh',
        'amit.deshmukh@tatamotors-demo.com',
        '+91 98220 11223',
        'https://linkedin.com/in/amit-deshmukh-demo',
        'Plant OEE, Assembly Line Throughput & Scrap Variance Power BI Dashboard',
        'High',
        'Not Contacted',
        new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        'Plant manager keen on automated daily production MIS reports.'
      ],
      [
        'Sun Pharma Global',
        'Pharmaceuticals & Healthcare',
        'Vadodara, Gujarat',
        'Neha Patel',
        'neha.patel@sunpharma-demo.com',
        '+91 98790 44556',
        'https://linkedin.com/in/neha-patel-demo',
        'Batch Yield Quality Control, Regulatory Compliance & Supply Chain Analytics',
        'High',
        'Not Contacted',
        new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        'Interested in DAX training for internal analytics team and custom Power BI report build.'
      ],
      [
        'Adani Logistics & Ports',
        'Supply Chain & Ports',
        'Mundra, Gujarat',
        'Siddharth Mehta',
        'siddharth.m@adanilogistics-demo.com',
        '+91 99090 77889',
        'https://linkedin.com/in/siddharth-mehta-demo',
        'Vessel Turnaround Time, Container Yard Utilization & Freight Rate Intelligence',
        'Medium',
        'Not Contacted',
        '',
        'Initial discovery prospect from LinkedIn.'
      ]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ProBitian_Lead_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export Filtered
  const handleExportCsv = () => {
    const listToExport = filteredLeads;
    if (listToExport.length === 0) {
      showFeedback('error', 'No leads available to export.');
      return;
    }

    const headers = [
      'Company Name',
      'Industry',
      'Location',
      'Contact Person',
      'Email',
      'Phone',
      'LinkedIn',
      'Power BI Use Case',
      'Lead Priority',
      'Status',
      'Follow-up Date',
      'Notes',
      'Created At'
    ];

    const rows = listToExport.map(l => [
      l.company_name,
      l.industry || '',
      l.location || '',
      l.contact_person || '',
      l.email,
      l.phone || '',
      l.linkedin || '',
      l.powerbi_use_case || '',
      l.lead_priority || 'Medium',
      l.status || 'Not Contacted',
      l.follow_up_date || '',
      l.notes || '',
      l.created_at || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ProBItian_Business_Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('success', `Exported ${listToExport.length} leads to CSV.`);
  };

  // Parse CSV File locally before uploading
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportResult(null);
    setCsvParseErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const parseCsvText = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      setCsvParseErrors(['CSV file must have a header row and at least one lead data row.']);
      setParsedCsvRows([]);
      return;
    }

    // Helper to split CSV row respecting double quotes
    const splitCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuote && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (char === ',' && !insideQuote) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerRow = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rawCols = splitCsvLine(lines[i]);
      if (rawCols.length === 0 || rawCols.every(c => c === '')) continue;

      const obj: any = {};
      headerRow.forEach((h, idx) => {
        const val = rawCols[idx] || '';
        if (h.includes('company')) obj.company_name = val;
        else if (h.includes('industry') || h.includes('sector')) obj.industry = val;
        else if (h.includes('location') || h.includes('city') || h.includes('state')) obj.location = val;
        else if (h.includes('contact') || h.includes('person') || h.includes('name')) obj.contact_person = val;
        else if (h.includes('email') || h.includes('mail')) obj.email = val;
        else if (h.includes('phone') || h.includes('mobile') || h.includes('contactno')) obj.phone = val;
        else if (h.includes('linkedin') || h.includes('social')) obj.linkedin = val;
        else if (h.includes('usecase') || h.includes('powerbi') || h.includes('requirement')) obj.powerbi_use_case = val;
        else if (h.includes('priority')) obj.lead_priority = val;
        else if (h.includes('status')) obj.status = val;
        else if (h.includes('follow') || h.includes('date')) obj.follow_up_date = val;
        else if (h.includes('note') || h.includes('comment')) obj.notes = val;
      });

      if (!obj.company_name) {
        errors.push(`Row ${i + 1}: Missing required "Company Name".`);
      }
      if (!obj.email || !obj.email.includes('@')) {
        errors.push(`Row ${i + 1}: Missing or invalid "Email" address (${obj.email || 'empty'}).`);
      }

      rows.push(obj);
    }

    setParsedCsvRows(rows);
    setCsvParseErrors(errors);
  };

  // Submit CSV Import to Server
  const handleExecuteImport = async () => {
    if (parsedCsvRows.length === 0) {
      showFeedback('error', 'No valid rows found in CSV.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await cmsService.importLeads(parsedCsvRows, {
        skipDuplicates,
        updateDuplicates
      });

      setImportResult(res);
      if (res.success) {
        showFeedback('success', `Import complete! ${res.importedCount} new leads imported, ${res.updatedCount || 0} updated, ${res.skippedCount || 0} skipped.`);
        loadLeads();
      } else {
        showFeedback('error', res.error || 'Import failed.');
      }
    } catch (e: any) {
      showFeedback('error', e?.message || 'Failed to import CSV.');
    } finally {
      setIsImporting(false);
    }
  };

  // Client-side quick search filter
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      (lead.company_name && lead.company_name.toLowerCase().includes(s)) ||
      (lead.contact_person && lead.contact_person.toLowerCase().includes(s)) ||
      (lead.email && lead.email.toLowerCase().includes(s)) ||
      (lead.industry && lead.industry.toLowerCase().includes(s)) ||
      (lead.powerbi_use_case && lead.powerbi_use_case.toLowerCase().includes(s)) ||
      (lead.location && lead.location.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-600/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
                Business Leads & Outreach CRM
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage B2B prospects, Power BI use cases, outreach stages, and targeted email campaigns.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToSequences && (
            <button
              onClick={onNavigateToSequences}
              className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title="Manage Automated Email Sequences"
            >
              <Workflow className="w-4 h-4 text-purple-600" />
              <span>Email Sequences</span>
            </button>
          )}

          {selectedIds.size > 0 && launchOutreachHandler && (
            <button
              onClick={() => launchOutreachHandler(Array.from(selectedIds))}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-purple-600/20"
            >
              <Send className="w-4 h-4 text-amber-300" />
              <span>Launch Outreach ({selectedIds.size})</span>
            </button>
          )}

          <button
            onClick={() => {
              setCsvFile(null);
              setParsedCsvRows([]);
              setCsvParseErrors([]);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Lead</span>
          </button>
        </div>
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

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Leads</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalLeads}</p>
          <span className="text-[10px] text-slate-500">In database</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Contacted</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{contactedCount}</p>
          <span className="text-[10px] text-slate-500">{totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0}% outreach rate</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">High Priority</p>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{highPriorityCount}</p>
          <span className="text-[10px] text-slate-500">Enterprise targets</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Converted</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{convertedCount}</p>
          <span className="text-[10px] text-slate-500">Clients closed</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Follow-ups Due</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{followUpDueCount}</p>
          <span className="text-[10px] text-slate-500">Today / Overdue</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company, contact person, email, use case, city..."
              className="w-full pl-10 pr-24 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-purple-600 hover:text-white text-slate-700 dark:text-slate-200 text-[10px] font-bold transition-all"
            >
              Search
            </button>
          </form>

          {/* Quick Refresh */}
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPriorityFilter('all'); setFollowUpFilter('all'); loadLeads(); }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title="Reset Filters & Reload"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Statuses ({leads.length})</option>
            {STATUS_OPTIONS.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Priorities</option>
            {PRIORITY_OPTIONS.map(pr => (
              <option key={pr} value={pr}>{pr} Priority</option>
            ))}
          </select>

          {/* Follow-up Filter */}
          <select
            value={followUpFilter}
            onChange={(e) => setFollowUpFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Follow-ups</option>
            <option value="today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">No Follow-up Scheduled</option>
          </select>

          {/* Batch Actions Toolbar when leads selected */}
          {selectedIds.size > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 px-3 py-1.5 rounded-2xl">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                {selectedIds.size} selected
              </span>

              {launchOutreachHandler && (
                <button
                  onClick={() => launchOutreachHandler(Array.from(selectedIds))}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                  title="Launch Outreach Campaign with selected leads"
                >
                  <Send className="w-3 h-3 text-amber-300" />
                  <span>Launch Campaign</span>
                </button>
              )}

              <button
                onClick={handleOpenSequenceEnrollModal}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                title="Enroll selected leads into an automated multi-step email sequence"
              >
                <Workflow className="w-3 h-3 text-white" />
                <span>Start Email Sequence</span>
              </button>

              <button
                onClick={handleBatchDelete}
                className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                title="Delete Selected Leads"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 text-[10px] font-bold"
                title="Clear Selection"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
            <p className="text-xs font-medium">Loading business leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 px-4">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Business Leads Found</p>
            <p className="text-xs text-slate-500 max-w-md">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search criteria or reset filters.'
                : 'Get started by uploading your CSV lead list or adding your first enterprise lead manually.'}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Single Lead</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3.5 px-3 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-purple-600 cursor-pointer"
                      title={selectedIds.size === filteredLeads.length ? 'Deselect All' : 'Select All'}
                    >
                      {selectedIds.size > 0 && selectedIds.size === filteredLeads.length ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3">Company & Contact</th>
                  <th className="py-3.5 px-3">Industry & Location</th>
                  <th className="py-3.5 px-3">Power BI Use Case</th>
                  <th className="py-3.5 px-3">Priority</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Follow-up</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);
                  const statusStyling = STATUS_COLORS[lead.status] || STATUS_COLORS['Not Contacted'];
                  const priorityStyling = PRIORITY_COLORS[lead.lead_priority] || PRIORITY_COLORS['Medium'];

                  const isOverdue = lead.follow_up_date && lead.follow_up_date < todayStr && lead.status !== 'Converted' && lead.status !== 'Not Interested';
                  const isDueToday = lead.follow_up_date && lead.follow_up_date === todayStr;

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleSelectOne(lead.id)}
                          className="text-slate-400 hover:text-purple-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Company & Contact */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{lead.company_name}</span>
                          {lead.linkedin && (
                            <a
                              href={lead.linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-500 hover:text-blue-600 transition-colors"
                              title="LinkedIn Profile"
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {lead.contact_person && (
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lead.contact_person}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-slate-400">{lead.email}</span>
                          {lead.phone && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Industry & Location */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {lead.industry || '—'}
                        </div>
                        {lead.location && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{lead.location}</span>
                          </div>
                        )}
                      </td>

                      {/* Power BI Use Case */}
                      <td className="py-3 px-3 max-w-xs">
                        <p
                          className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2"
                          title={lead.powerbi_use_case || 'No use case described'}
                        >
                          {lead.powerbi_use_case || <span className="text-slate-400 italic">No use case specified</span>}
                        </p>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${priorityStyling.bg} ${priorityStyling.text} ${priorityStyling.border}`}
                        >
                          {lead.lead_priority}
                        </span>
                      </td>

                      {/* Interactive Status Selector */}
                      <td className="py-3 px-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as LeadStatus)}
                          className={`text-[10px] font-bold rounded-lg px-2 py-1 border transition-colors cursor-pointer focus:outline-none ${statusStyling.bg} ${statusStyling.text} ${statusStyling.border}`}
                        >
                          {STATUS_OPTIONS.map(st => (
                            <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Follow-up Date */}
                      <td className="py-3 px-3">
                        {lead.follow_up_date ? (
                          <div
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isOverdue
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse'
                                : isDueToday
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-black'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>{lead.follow_up_date}</span>
                            {isOverdue && <span className="text-[9px]">(Overdue)</span>}
                            {isDueToday && <span className="text-[9px]">(Today)</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewLeadDetails(lead)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-500/10 text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors"
                            title="View Lead Profile & Outreach History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(lead)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
                            title="Edit Lead"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {editingLead.id ? 'Edit Business Lead' : 'Add New Business Lead'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLead.company_name || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, company_name: e.target.value })}
                    placeholder="e.g. Acme Precision Tools Ltd"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={editingLead.contact_person || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, contact_person: e.target.value })}
                    placeholder="e.g. Vikram Singhania"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editingLead.email || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    placeholder="e.g. vikram.s@acmetools.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="tel"
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    placeholder="e.g. +91 98260 55443"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Industry / Sector
                  </label>
                  <input
                    type="text"
                    value={editingLead.industry || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, industry: e.target.value })}
                    placeholder="e.g. Automotive & Forging"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={editingLead.location || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, location: e.target.value })}
                    placeholder="e.g. Indore, Madhya Pradesh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={editingLead.linkedin || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lead Priority
                  </label>
                  <select
                    value={editingLead.lead_priority || 'Medium'}
                    onChange={(e) => setEditingLead({ ...editingLead, lead_priority: e.target.value as LeadPriority })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white font-bold"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lead Status
                  </label>
                  <select
                    value={editingLead.status || 'Not Contacted'}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as LeadStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white font-bold"
                  >
                    {STATUS_OPTIONS.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={editingLead.follow_up_date || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Power BI Requirement / Use Case
                </label>
                <textarea
                  rows={3}
                  value={editingLead.powerbi_use_case || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, powerbi_use_case: e.target.value })}
                  placeholder="Describe their specific Power BI analytics requirement, e.g. Executive KPI Dashboard, Plant Machine Downtime, Scrap Cost Analysis, SAP HANA Connector..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Notes & History
                </label>
                <textarea
                  rows={2}
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  placeholder="Additional context from conversation, budget notes, decision maker details..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{editingLead.id ? 'Save Changes' : 'Create Lead'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Bulk CSV Import for Business Leads
                </h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Instructions and Sample Template */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    Need the formatted CSV template?
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Download our ready-to-use template with example columns for Company Name, Email, Power BI Use Case, etc.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template CSV</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  {csvFile ? csvFile.name : 'Click or Drag & Drop CSV file to upload'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports .csv files with header rows.
                </p>
              </div>

              {/* Parse Preview & Validation */}
              {parsedCsvRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Parsed Records: <span className="text-purple-600">{parsedCsvRows.length} rows</span>
                    </p>
                    {csvParseErrors.length > 0 && (
                      <span className="text-red-500 font-bold text-[11px]">
                        {csvParseErrors.length} warning(s) detected
                      </span>
                    )}
                  </div>

                  {/* Sample rows table */}
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 sticky top-0 font-bold">
                        <tr>
                          <th className="py-2 px-3">Company</th>
                          <th className="py-2 px-3">Contact</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Industry</th>
                          <th className="py-2 px-3">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedCsvRows.slice(0, 5).map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-1.5 px-3 font-semibold">{r.company_name || '—'}</td>
                            <td className="py-1.5 px-3">{r.contact_person || '—'}</td>
                            <td className="py-1.5 px-3 font-mono text-[10px]">{r.email || '—'}</td>
                            <td className="py-1.5 px-3">{r.industry || '—'}</td>
                            <td className="py-1.5 px-3">{r.lead_priority || 'Medium'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedCsvRows.length > 5 && (
                    <p className="text-[10px] text-slate-400 italic text-right">
                      Showing first 5 of {parsedCsvRows.length} rows...
                    </p>
                  )}

                  {/* Options */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="rounded text-purple-600"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Skip records with already existing email addresses
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateDuplicates}
                        onChange={(e) => setUpdateDuplicates(e.target.checked)}
                        className="rounded text-purple-600"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Update existing leads with new information if email matches
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Import Results Report */}
              {importResult && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import Completed Successfully</span>
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    • <strong>{importResult.importedCount}</strong> new leads imported<br />
                    • <strong>{importResult.updatedCount || 0}</strong> existing leads updated<br />
                    • <strong>{importResult.skippedCount || 0}</strong> duplicate rows skipped
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {importResult ? 'Close' : 'Cancel'}
                </button>

                {parsedCsvRows.length > 0 && !importResult && (
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isImporting}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                  >
                    {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Import {parsedCsvRows.length} Leads</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW LEAD DETAILS & OUTREACH HISTORY MODAL */}
      {viewingLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Lead Profile: {viewingLead.company_name}
                </h3>
              </div>
              <button onClick={() => setViewingLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Profile Header Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {viewingLead.company_name}
                    </h4>
                    <p className="text-slate-500">{viewingLead.industry || 'Industry not specified'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                        (PRIORITY_COLORS[viewingLead.lead_priority] || PRIORITY_COLORS.Medium).bg
                      } ${(PRIORITY_COLORS[viewingLead.lead_priority] || PRIORITY_COLORS.Medium).text}`}
                    >
                      {viewingLead.lead_priority} Priority
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                        (STATUS_COLORS[viewingLead.status] || STATUS_COLORS['Not Contacted']).bg
                      } ${(STATUS_COLORS[viewingLead.status] || STATUS_COLORS['Not Contacted']).text}`}
                    >
                      {viewingLead.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Contact Person</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {viewingLead.contact_person || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Email Address</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                      {viewingLead.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Phone</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {viewingLead.phone || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Location</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {viewingLead.location || '—'}
                    </span>
                  </div>

                  {viewingLead.linkedin && (
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-slate-400 block">LinkedIn Profile</span>
                      <a
                        href={viewingLead.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <span>{viewingLead.linkedin}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Power BI Use Case */}
              <div className="space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Power BI Requirement / Analytics Scope</span>
                </p>
                <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {viewingLead.powerbi_use_case || (
                    <span className="text-slate-400 italic">No specific use case noted yet.</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              {viewingLead.notes && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Internal Notes</p>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    {viewingLead.notes}
                  </div>
                </div>
              )}

              {/* Active Email Sequences for this lead */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Workflow className="w-4 h-4 text-purple-600" />
                    <span>Automated Email Sequences</span>
                  </p>
                  {onNavigateToSequences && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingLead(null);
                        onNavigateToSequences();
                      }}
                      className="text-purple-600 hover:text-purple-700 text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <span>Manage Sequences</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {loadingDetails ? (
                  <div className="py-3 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  </div>
                ) : leadSequencesForDrawer.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-[11px]">
                    This lead is not currently enrolled in any active sequences.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadSequencesForDrawer.map((seqRec: any, idx: number) => {
                      const seq = seqRec.lead_sequences || {};
                      return (
                        <div
                          key={seqRec.id || idx}
                          className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {seq.name || 'Outreach Sequence'}
                            </p>
                            <p className="text-slate-500">
                              Current Progress: <strong>Step {seqRec.current_step || 0}</strong>
                              {seqRec.next_send_at && (
                                <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-mono">
                                  &bull; Next Send: {new Date(seqRec.next_send_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                seqRec.status === 'Active' || seqRec.status === 'Pending'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : seqRec.status === 'Completed'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              }`}
                            >
                              {seqRec.status}
                            </span>

                            {(seqRec.status === 'Active' || seqRec.status === 'Pending') && (
                              <button
                                type="button"
                                onClick={() => handleStopLeadSequenceFromDrawer(seqRec.sequence_id, viewingLead.id)}
                                className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold border border-red-200"
                              >
                                Stop
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Outreach Campaign History */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-500" />
                  <span>Email Outreach History</span>
                </p>

                {loadingDetails ? (
                  <div className="py-4 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  </div>
                ) : !viewingLead.outreach_history || viewingLead.outreach_history.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
                    No outreach campaigns sent to this lead yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {viewingLead.outreach_history.map((log: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {log.lead_campaigns?.name || 'Lead Outreach Campaign'}
                          </p>
                          <p className="text-slate-500">
                            Subject: {log.lead_campaigns?.subject || log.subject || 'Outreach Email'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            }`}
                          >
                            {log.status}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(log.sent_at || log.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const l = viewingLead;
                    setViewingLead(null);
                    handleOpenEditModal(l);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Edit Lead Details
                </button>
                <button
                  type="button"
                  onClick={() => setViewingLead(null)}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENROLL SELECTED LEADS IN SEQUENCE */}
      {isEnrollSequenceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 animate-fade-in my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <Workflow className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Start Email Sequence
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enroll {selectedIds.size} explicitly selected lead(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEnrollSequenceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Select Target Email Sequence *
                </label>
                {availableSequences.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs">
                    No sequences found. Please create a sequence first in the Email Sequences module.
                  </div>
                ) : (
                  <select
                    value={selectedSequenceId}
                    onChange={(e) => setSelectedSequenceId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {availableSequences.map((seq) => (
                      <option key={seq.id} value={seq.id}>
                        {seq.name} ({seq.steps?.length || 0} steps &bull; {seq.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Leads Preview */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Selected Leads to Enroll ({selectedIds.size})
                </label>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800/40 text-xs">
                  {leads
                    .filter((l) => selectedIds.has(l.id))
                    .map((l) => (
                      <div key={l.id} className="py-1.5 px-1 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{l.company_name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{l.email}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold">
                          {l.lead_priority}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-[11px] space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">Safety & Duplicate Protection:</p>
                <p>&bull; Step 1 will be scheduled immediately.</p>
                <p>&bull; Duplicate leads already active in this sequence will be automatically skipped.</p>
                <p>&bull; Leads with "Do Not Contact" / "Bounced" status are excluded.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEnrollSequenceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSequenceEnrollment}
                  disabled={!selectedSequenceId || selectedIds.size === 0 || isEnrollingInSequence}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isEnrollingInSequence ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Enroll {selectedIds.size} Leads</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
