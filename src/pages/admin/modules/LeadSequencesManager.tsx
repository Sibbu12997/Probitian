import React, { useState, useEffect, useMemo } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Layers,
  Mail,
  Building2,
  X,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Monitor,
  Ban,
  Check,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { LeadSequence, SequenceStep, SequenceLead, Lead, SequenceStatus } from '../../../types';

interface LeadSequencesManagerProps {
  onNavigateToLeads?: () => void;
}

const TEMPLATE_TAGS = [
  { tag: '{{company_name}}', label: 'Company Name', desc: 'Target company name' },
  { tag: '{{contact_person}}', label: 'Contact Person', desc: 'Name of key decision-maker' },
  { tag: '{{industry}}', label: 'Industry', desc: 'Operating business vertical' },
  { tag: '{{location}}', label: 'Location', desc: 'City or industrial cluster' },
  { tag: '{{powerbi_use_case}}', label: 'Power BI Scope', desc: 'Tailored analytics use case' },
  { tag: '{{phone}}', label: 'Phone', desc: 'Phone number if available' },
];

export const LeadSequencesManager: React.FC<LeadSequencesManagerProps> = ({ onNavigateToLeads }) => {
  const [sequences, setSequences] = useState<LeadSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<LeadSequence | null>(null);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);
  const [sequenceLeads, setSequenceLeads] = useState<SequenceLead[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | SequenceStatus>('All');
  const [leadTabFilter, setLeadTabFilter] = useState<'All' | 'Active' | 'Completed' | 'Stopped'>('All');
  const [activeTab, setActiveTab] = useState<'steps' | 'leads' | 'analytics'>('steps');

  // Step Editor State
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [previewStepIndex, setPreviewStepIndex] = useState<number | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [savingSteps, setSavingSteps] = useState(false);

  // New Sequence Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSeqName, setNewSeqName] = useState('');
  const [newSeqDesc, setNewSeqDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Test Email Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testStepNumber, setTestStepNumber] = useState<number>(1);
  const [testRecipientEmail, setTestRecipientEmail] = useState('shivambaghel79@gmail.com');
  const [sendingTest, setSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // All CRM leads for enrollment modal & preview sampling
  const [crmLeads, setCrmLeads] = useState<Lead[]>([]);
  const [sampleLeadId, setSampleLeadId] = useState<string>('');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedLeadIdsToEnroll, setSelectedLeadIdsToEnroll] = useState<string[]>([]);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // General Notification / Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchSequences = async () => {
    try {
      setLoading(true);
      const data = await cmsService.getLeadSequences();
      setSequences(data || []);
      if (activeSequenceId) {
        loadSequenceDetails(activeSequenceId);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load sequences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSequenceDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const seq = await cmsService.getLeadSequenceById(id);
      if (seq) {
        setSelectedSequence(seq);
        setSequenceSteps(seq.steps || []);
        setSequenceLeads(seq.leads || []);
      }
    } catch (err: any) {
      showToast('Failed to load sequence details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadCrmLeads = async () => {
    try {
      const leads = await cmsService.getLeads();
      setCrmLeads(leads || []);
      if (leads && leads.length > 0 && !sampleLeadId) {
        setSampleLeadId(leads[0].id);
      }
    } catch (e) {
      console.warn('Failed to load CRM leads:', e);
    }
  };

  useEffect(() => {
    fetchSequences();
    loadCrmLeads();
  }, []);

  const handleSelectSequence = (seqId: string) => {
    setActiveSequenceId(seqId);
    loadSequenceDetails(seqId);
    setEditingStepIndex(null);
    setPreviewStepIndex(null);
    setActiveTab('steps');
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeqName.trim()) return;

    try {
      setIsCreating(true);
      const res = await cmsService.createLeadSequence({
        name: newSeqName.trim(),
        description: newSeqDesc.trim(),
        steps: [
          {
            step_number: 1,
            delay_days: 0,
            subject: 'Power BI Analytics for {{company_name}}',
            preheader: 'Transform manual MIS reports into automated Power BI dashboards',
            html_content: `<h2>Hello {{contact_person}},</h2>\n<p>I noticed <strong>{{company_name}}</strong> operates in {{industry}}.</p>\n<p>Based on your business scale in {{location}}, a dedicated Power BI dashboard tailored for <strong>{{powerbi_use_case}}</strong> can eliminate manual Excel consolidation and deliver executive clarity in real time.</p>\n<p><a href="https://probitian.ai.studio/#/contact" class="btn-cta">Schedule Power BI Consultation</a></p>\n<p>Best regards,<br/><strong>Shivam Baghel</strong><br/>ProBitian Analytics</p>`,
            enabled: true
          },
          {
            step_number: 2,
            delay_days: 3,
            subject: 'Following up — Power BI for {{company_name}}',
            preheader: 'Quick follow-up regarding automated analytics for {{company_name}}',
            html_content: `<h2>Hi {{contact_person}},</h2>\n<p>Following up on my previous note regarding <strong>{{company_name}}</strong>'s analytics workflow in {{location}}.</p>\n<p>We specialize in turning complex multi-source data into real-time Power BI executive dashboards for {{industry}} organizations — specifically around <strong>{{powerbi_use_case}}</strong>.</p>\n<p>Would you have 10 minutes this week for a brief walkthrough of live enterprise dashboards?</p>\n<p><a href="https://probitian.ai.studio/#/projects" class="btn-cta">Explore Live Portfolio</a></p>\n<p>Regards,<br/><strong>Shivam Baghel</strong><br/>ProBitian Analytics</p>`,
            enabled: true
          }
        ]
      });

      if (res.success && res.sequence) {
        showToast(`Sequence "${res.sequence.name}" created successfully!`);
        setIsCreateModalOpen(false);
        setNewSeqName('');
        setNewSeqDesc('');
        await fetchSequences();
        handleSelectSequence(res.sequence.id);
      } else {
        showToast(res.error || 'Failed to create sequence', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to create sequence', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleSequenceStatus = async (seq: LeadSequence) => {
    const nextStatus: SequenceStatus = seq.status === 'Active' ? 'Paused' : 'Active';
    try {
      if (nextStatus === 'Paused') {
        const res = await cmsService.pauseLeadSequence(seq.id);
        showToast(res.message);
      } else {
        const res = await cmsService.resumeLeadSequence(seq.id);
        showToast(res.message);
      }
      await fetchSequences();
    } catch (err: any) {
      showToast('Failed to toggle sequence status', 'error');
    }
  };

  const handleDeleteSequence = async (seqId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete sequence "${name}"? All step templates and enrollment records will be removed.`)) {
      return;
    }
    try {
      const ok = await cmsService.deleteLeadSequence(seqId);
      if (ok) {
        showToast('Sequence deleted');
        if (activeSequenceId === seqId) {
          setActiveSequenceId(null);
          setSelectedSequence(null);
        }
        await fetchSequences();
      } else {
        showToast('Failed to delete sequence', 'error');
      }
    } catch (err: any) {
      showToast('Failed to delete sequence', 'error');
    }
  };

  // Step Management
  const handleAddStep = () => {
    const nextNum = sequenceSteps.length + 1;
    const newStep: SequenceStep = {
      id: crypto.randomUUID(),
      sequence_id: selectedSequence?.id || '',
      step_number: nextNum,
      delay_days: nextNum === 1 ? 0 : 3,
      subject: `Follow-up #${nextNum} for {{company_name}}`,
      preheader: `Quick check-in regarding Power BI initiatives`,
      html_content: `<h2>Hello {{contact_person}},</h2>\n<p>Following up on our Power BI discussion for <strong>{{company_name}}</strong> in {{location}}.</p>\n<p>Specifically regarding <strong>{{powerbi_use_case}}</strong>, let me know if you would like to review sample dashboards.</p>\n<p>Best regards,<br/><strong>Shivam Baghel</strong></p>`,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSequenceSteps([...sequenceSteps, newStep]);
    setEditingStepIndex(sequenceSteps.length);
  };

  const handleDeleteStep = (idx: number) => {
    const updated = sequenceSteps.filter((_, i) => i !== idx).map((st, i) => ({
      ...st,
      step_number: i + 1
    }));
    setSequenceSteps(updated);
    if (editingStepIndex === idx) setEditingStepIndex(null);
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sequenceSteps.length - 1)) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...sequenceSteps];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    const renumbered = updated.map((st, i) => ({
      ...st,
      step_number: i + 1
    }));
    setSequenceSteps(renumbered);
    setEditingStepIndex(targetIdx);
  };

  const handleSaveSteps = async () => {
    if (!selectedSequence) return;
    try {
      setSavingSteps(true);
      const res = await cmsService.saveSequenceSteps(selectedSequence.id, sequenceSteps);
      if (res.success) {
        showToast('All sequence steps saved to Supabase!');
        await loadSequenceDetails(selectedSequence.id);
      } else {
        showToast('Failed to save sequence steps', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save steps', 'error');
    } finally {
      setSavingSteps(false);
    }
  };

  // Trigger manual background worker
  const handleTriggerWorker = async () => {
    try {
      showToast('Processing active sequence cycle...');
      const res = await cmsService.triggerSequenceProcessing();
      if (res.success) {
        const stats = res.stats || {};
        showToast(`Cycle complete: ${stats.sent || 0} sent, ${stats.completed || 0} completed, ${stats.stopped || 0} stopped.`);
        if (selectedSequence) {
          loadSequenceDetails(selectedSequence.id);
        }
        fetchSequences();
      }
    } catch (e: any) {
      showToast('Failed to run sequence worker', 'error');
    }
  };

  // Stop single lead in sequence
  const handleStopLead = async (leadId: string, companyName: string) => {
    if (!selectedSequence) return;
    if (!window.confirm(`Stop automated sequence for ${companyName}? No further steps will be sent to this lead.`)) return;

    try {
      const res = await cmsService.stopLeadInSequence(selectedSequence.id, leadId, 'Manual Stop');
      showToast(res.message);
      loadSequenceDetails(selectedSequence.id);
    } catch (err: any) {
      showToast('Failed to stop lead sequence', 'error');
    }
  };

  // Test Email
  const handleOpenTestModal = (stepNum: number) => {
    setTestStepNumber(stepNum);
    setTestFeedback(null);
    setIsTestModalOpen(true);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSequence || !testRecipientEmail.includes('@')) return;

    try {
      setSendingTest(true);
      setTestFeedback(null);
      const res = await cmsService.sendSequenceTestEmail(
        selectedSequence.id,
        testStepNumber,
        testRecipientEmail.trim(),
        sampleLeadId || undefined
      );
      setTestFeedback(res);
      if (res.success) {
        showToast(`Test email for Step #${testStepNumber} sent to ${testRecipientEmail}`);
      }
    } catch (err: any) {
      setTestFeedback({ success: false, message: err?.message || 'Failed to dispatch test email' });
    } finally {
      setSendingTest(false);
    }
  };

  // Enroll Leads Modal
  const handleOpenEnrollModal = () => {
    setSelectedLeadIdsToEnroll([]);
    setEnrollSearch('');
    setIsEnrollModalOpen(true);
  };

  const handleExecuteEnrollment = async () => {
    if (!selectedSequence || selectedLeadIdsToEnroll.length === 0) return;

    try {
      setIsEnrolling(true);
      const res = await cmsService.enrollLeadsInSequence(selectedSequence.id, selectedLeadIdsToEnroll);
      showToast(res.message);
      setIsEnrollModalOpen(false);
      setSelectedLeadIdsToEnroll([]);
      await loadSequenceDetails(selectedSequence.id);
      await fetchSequences();
    } catch (err: any) {
      showToast(err?.message || 'Failed to enroll leads', 'error');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Interpolated Preview Generator
  const getInterpolatedHtml = (rawHtml: string, rawSubject: string) => {
    const sampleLead = crmLeads.find(l => l.id === sampleLeadId) || {
      company_name: 'Udaan Manufacturing Ltd',
      industry: 'Automotive & Industrial Parts',
      location: 'Pithampur Industrial Zone, MP',
      contact_person: 'Rajesh Sharma',
      email: 'rajesh.sharma@udaanmfg.example.com',
      phone: '+91 98260 12345',
      powerbi_use_case: 'Plant Production MIS & Scrap Costing Dashboard'
    };

    let subject = rawSubject || '';
    let html = rawHtml || '';

    const replacements: Record<string, string> = {
      '{{company_name}}': sampleLead.company_name || 'Your Company',
      '{{contact_person}}': sampleLead.contact_person || 'Decision Maker',
      '{{industry}}': sampleLead.industry || 'Manufacturing',
      '{{location}}': sampleLead.location || 'India',
      '{{powerbi_use_case}}': sampleLead.powerbi_use_case || 'Operational MIS Dashboard',
      '{{phone}}': sampleLead.phone || ''
    };

    Object.entries(replacements).forEach(([k, v]) => {
      const reg = new RegExp(k, 'gi');
      subject = subject.replace(reg, v);
      html = html.replace(reg, v);
    });

    return { subject, html, sampleLead };
  };

  // Filtered Sequences List
  const filteredSequences = useMemo(() => {
    return sequences.filter(seq => {
      const matchesSearch = seq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (seq.description && seq.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || seq.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sequences, searchQuery, statusFilter]);

  // Filtered Leads in Sequence
  const filteredSequenceLeads = useMemo(() => {
    return sequenceLeads.filter(sl => {
      if (leadTabFilter === 'All') return true;
      if (leadTabFilter === 'Active') return sl.status === 'Active' || sl.status === 'Pending';
      if (leadTabFilter === 'Completed') return sl.status === 'Completed';
      if (leadTabFilter === 'Stopped') return sl.status === 'Stopped';
      return true;
    });
  }, [sequenceLeads, leadTabFilter]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    const total = sequences.length;
    const active = sequences.filter(s => s.status === 'Active').length;
    const paused = sequences.filter(s => s.status === 'Paused').length;
    const totalLeadsEnrolled = sequences.reduce((sum, s) => sum + (s.total_leads || 0), 0);
    const totalSent = sequences.reduce((sum, s) => sum + (s.emails_sent || 0), 0);
    const totalFailed = sequences.reduce((sum, s) => sum + (s.emails_failed || 0), 0);
    return { total, active, paused, totalLeadsEnrolled, totalSent, totalFailed };
  }, [sequences]);

  // Eligible leads for enrollment (exclude already enrolled and Do Not Contact / Bounced)
  const eligibleLeadsForEnrollment = useMemo(() => {
    if (!selectedSequence) return [];
    const enrolledIds = new Set(sequenceLeads.map(sl => sl.lead_id));
    return crmLeads.filter(l => {
      if (enrolledIds.has(l.id)) return false;
      if (l.status === 'Do Not Contact' || l.status === 'Bounced') return false;
      if (enrollSearch) {
        const q = enrollSearch.toLowerCase();
        return (
          l.company_name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.contact_person && l.contact_person.toLowerCase().includes(q)) ||
          (l.industry && l.industry.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [crmLeads, sequenceLeads, selectedSequence, enrollSearch]);

  return (
    <div className="space-y-6">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-fade-in ${
            toastMessage.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          )}
          <span className="text-xs font-bold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Automated Lead Sequences
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-step enterprise email sequences with delayed scheduling, personalization & automatic reply-stopping
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTriggerWorker}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Immediately trigger sequence queue evaluation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Run Sequence Cycle</span>
          </button>

          {onNavigateToLeads && (
            <button
              type="button"
              onClick={onNavigateToLeads}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>CRM Lead Table</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Sequence</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Sequences</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">{overallStats.total}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Active Sequences</span>
            <Play className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{overallStats.active}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Paused</span>
            <Pause className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">{overallStats.paused}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Enrolled Leads</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{overallStats.totalLeadsEnrolled}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Emails Sent</span>
            <Send className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400">{overallStats.totalSent}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Failed</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-xl font-black text-red-600 dark:text-red-400">{overallStats.totalFailed}</p>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {!selectedSequence ? (
        /* SEQUENCES LIST VIEW */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sequences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {(['All', 'Active', 'Paused', 'Draft', 'Completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
              <p className="text-xs font-semibold">Loading sequences from Supabase...</p>
            </div>
          ) : filteredSequences.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-4">
              <Workflow className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">No Email Sequences Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Create your first multi-step automated email outreach sequence or customize the default sequence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Sequence</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSequences.map((seq) => (
                <div
                  key={seq.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          seq.status === 'Active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : seq.status === 'Paused'
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {seq.status}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleSequenceStatus(seq)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                          title={seq.status === 'Active' ? 'Pause Sequence' : 'Resume Sequence'}
                        >
                          {seq.status === 'Active' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                        </button>
                        <button
                          onClick={() => handleDeleteSequence(seq.id, seq.name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500"
                          title="Delete Sequence"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-purple-600 transition-colors">
                        {seq.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {seq.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Step Pipeline Pills Preview */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">Steps:</span>
                      {(seq.steps || []).map((step, idx) => (
                        <span
                          key={step.id || idx}
                          className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800/60"
                        >
                          S{step.step_number} ({step.delay_days}d)
                        </span>
                      ))}
                      {(!seq.steps || seq.steps.length === 0) && (
                        <span className="text-[10px] text-slate-400 italic">No steps configured</span>
                      )}
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Enrolled</span>
                        <span className="font-black text-xs text-slate-800 dark:text-slate-200">{seq.total_leads || 0}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Active</span>
                        <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{seq.active_leads || 0}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Sent</span>
                        <span className="font-black text-xs text-purple-600 dark:text-purple-400">{seq.emails_sent || 0}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectSequence(seq.id)}
                    className="w-full mt-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Configure Pipeline & Leads</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SEQUENCE DETAIL & PIPELINE EDITOR VIEW */
        <div className="space-y-6 animate-fade-in">
          {/* Top Banner Navigation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSequence(null);
                    setActiveSequenceId(null);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedSequence.name}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        selectedSequence.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {selectedSequence.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{selectedSequence.description || 'Enterprise Automated Outreach Sequence'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSequenceStatus(selectedSequence)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    selectedSequence.status === 'Active'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {selectedSequence.status === 'Active' ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Sequence</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Sequence</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenEnrollModal}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Enroll Leads from CRM</span>
                </button>
              </div>
            </div>

            {/* Sequence Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pt-2">
              <button
                onClick={() => setActiveTab('steps')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'steps'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Sequence Steps ({sequenceSteps.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('leads')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'leads'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Enrolled Leads ({sequenceLeads.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: SEQUENCE STEPS PIPELINE */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Step Pipeline Configuration (Sent sequentially based on scheduled delays)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSteps}
                    disabled={savingSteps}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                  >
                    {savingSteps ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Pipeline</span>
                  </button>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                {sequenceSteps.map((step, idx) => {
                  const isEditing = editingStepIndex === idx;
                  const isPreviewing = previewStepIndex === idx;

                  return (
                    <div
                      key={step.id || idx}
                      className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition-all ${
                        isEditing
                          ? 'border-purple-500 ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Step Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center font-black text-xs">
                            #{step.step_number}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {step.subject || `Step #${step.step_number}`}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                                {idx === 0 ? 'Immediate (0d)' : `+${step.delay_days} days delay`}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 line-clamp-1">
                              {step.preheader || 'No preheader text'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Reorder buttons */}
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, 'down')}
                            disabled={idx === sequenceSteps.length - 1}
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {/* Test email button */}
                          <button
                            type="button"
                            onClick={() => handleOpenTestModal(step.step_number)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Test</span>
                          </button>

                          {/* Preview button */}
                          <button
                            type="button"
                            onClick={() => setPreviewStepIndex(isPreviewing ? null : idx)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                              isPreviewing
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isPreviewing ? 'Hide Preview' : 'Preview'}</span>
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => setEditingStepIndex(isEditing ? null : idx)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                              isEditing
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Edit className="w-3 h-3" />
                            <span>{isEditing ? 'Collapse' : 'Edit'}</span>
                          </button>

                          {/* Delete button */}
                          {sequenceSteps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStep(idx)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500"
                              title="Delete Step"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* EDIT STEP FORM */}
                      {isEditing && (
                        <div className="pt-4 space-y-4 animate-fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">
                                Delay Days (After Previous Step)
                              </label>
                              <input
                                type="number"
                                min={idx === 0 ? 0 : 1}
                                value={step.delay_days}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  const updated = [...sequenceSteps];
                                  updated[idx].delay_days = val;
                                  setSequenceSteps(updated);
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                              />
                            </div>

                            <div className="sm:col-span-2 space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">
                                Email Subject Line
                              </label>
                              <input
                                type="text"
                                value={step.subject}
                                onChange={(e) => {
                                  const updated = [...sequenceSteps];
                                  updated[idx].subject = e.target.value;
                                  setSequenceSteps(updated);
                                }}
                                placeholder="e.g. Power BI Analytics for {{company_name}}"
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Preheader Text (Snippet shown in inbox)
                            </label>
                            <input
                              type="text"
                              value={step.preheader || ''}
                              onChange={(e) => {
                                const updated = [...sequenceSteps];
                                updated[idx].preheader = e.target.value;
                                setSequenceSteps(updated);
                              }}
                              placeholder="e.g. Quick check-in regarding Power BI initiatives"
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                            />
                          </div>

                          {/* Variable Helper Chips */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              Insert Lead Personalization Tags:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {TEMPLATE_TAGS.map((t) => (
                                <button
                                  key={t.tag}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...sequenceSteps];
                                    updated[idx].html_content = (updated[idx].html_content || '') + ` ${t.tag} `;
                                    setSequenceSteps(updated);
                                  }}
                                  className="px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold border border-purple-200 dark:border-purple-800"
                                  title={t.desc}
                                >
                                  + {t.tag}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Email Body Editor */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                              Email HTML Content
                            </label>
                            <textarea
                              rows={8}
                              value={step.html_content}
                              onChange={(e) => {
                                const updated = [...sequenceSteps];
                                updated[idx].html_content = e.target.value;
                                setSequenceSteps(updated);
                              }}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono leading-relaxed"
                            />
                          </div>
                        </div>
                      )}

                      {/* LIVE PREVIEW BOX */}
                      {isPreviewing && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                Simulated with Lead:
                              </span>
                              <select
                                value={sampleLeadId}
                                onChange={(e) => setSampleLeadId(e.target.value)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                              >
                                {crmLeads.slice(0, 20).map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.company_name} ({l.contact_person || 'No Contact'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setPreviewDevice('desktop')}
                                className={`p-1 rounded-md text-xs ${
                                  previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400'
                                }`}
                              >
                                <Monitor className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewDevice('mobile')}
                                className={`p-1 rounded-md text-xs ${
                                  previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400'
                                }`}
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Email Preview Frame */}
                          {(() => {
                            const { subject, html } = getInterpolatedHtml(step.html_content, step.subject);
                            return (
                              <div
                                className={`mx-auto border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white shadow-lg ${
                                  previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
                                }`}
                              >
                                <div className="p-3 bg-slate-100 border-b text-slate-800 text-xs space-y-1">
                                  <p className="font-bold">Subject: {subject}</p>
                                  <p className="text-[10px] text-slate-500">
                                    Preheader: {step.preheader || '—'}
                                  </p>
                                </div>
                                <div
                                  className="p-5 text-slate-800 text-xs leading-relaxed space-y-3"
                                  dangerouslySetInnerHTML={{ __html: html }}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ENROLLED LEADS TABLE */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Targeted Leads Enrolled in this Sequence
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(['All', 'Active', 'Completed', 'Stopped'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLeadTabFilter(filter)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        leadTabFilter === filter
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleOpenEnrollModal}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-purple-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Enroll More Leads</span>
                  </button>
                </div>
              </div>

              {/* Leads Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                {filteredSequenceLeads.length === 0 ? (
                  <div className="py-16 text-center p-6 space-y-3">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="text-xs text-slate-500 font-semibold">No leads currently enrolled under this filter.</p>
                    <button
                      type="button"
                      onClick={handleOpenEnrollModal}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Enroll Leads Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Company & Contact</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Current Progress</th>
                          <th className="py-3 px-4">Next Send Scheduled</th>
                          <th className="py-3 px-4">Last Sent</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredSequenceLeads.map((sl) => {
                          const lead = sl.lead || {};
                          return (
                            <tr key={sl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {lead.company_name || '—'}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {lead.contact_person || '—'} &bull; <span className="font-mono text-[10px]">{lead.email}</span>
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                                    sl.status === 'Active' || sl.status === 'Pending'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                      : sl.status === 'Completed'
                                      ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                                      : 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                                  }`}
                                >
                                  {sl.status}
                                </span>
                                {sl.stop_reason && (
                                  <span className="block text-[9px] text-slate-400 mt-0.5">
                                    Reason: {sl.stop_reason}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                  <span>Step {sl.current_step || 0}</span>
                                  <span className="text-slate-400">/ {sequenceSteps.length}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {sl.next_send_at ? (
                                  <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(sl.next_send_at).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                {sl.last_sent_at ? (
                                  <span className="font-mono text-[11px] text-slate-500">
                                    {new Date(sl.last_sent_at).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Not sent yet</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                {sl.status === 'Active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleStopLead(sl.lead_id, lead.company_name || 'this lead')}
                                    className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 text-[11px] font-bold inline-flex items-center gap-1"
                                    title="Stop sequence outreach for this lead"
                                  >
                                    <Ban className="w-3 h-3" />
                                    <span>Stop</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE NEW SEQUENCE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Create Automated Sequence
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSequence} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Sequence Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSeqName}
                  onChange={(e) => setNewSeqName(e.target.value)}
                  placeholder="e.g. Manufacturing MIS Outreach — 14 Day"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Description / Objective
                </label>
                <textarea
                  rows={3}
                  value={newSeqDesc}
                  onChange={(e) => setNewSeqDesc(e.target.value)}
                  placeholder="e.g. Automated multi-step outreach for manufacturing plant heads & directors"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-800 dark:text-purple-300">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Automatic Safety Protocols Included</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Sequences will automatically halt sending if a lead replies, books a demo, or is flagged as Do Not Contact.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Sequence</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TEST EMAIL DISPATCH */}
      {isTestModalOpen && selectedSequence && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Send Sequence Test Email
                </h3>
              </div>
              <button onClick={() => setIsTestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Target Sequence Step
                </label>
                <select
                  value={testStepNumber}
                  onChange={(e) => setTestStepNumber(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  {sequenceSteps.map((st) => (
                    <option key={st.step_number} value={st.step_number}>
                      Step #{st.step_number}: {st.subject} ({st.delay_days}d delay)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Test Recipient Address *
                </label>
                <input
                  type="email"
                  required
                  value={testRecipientEmail}
                  onChange={(e) => setTestRecipientEmail(e.target.value)}
                  placeholder="shivambaghel79@gmail.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Simulate Variable Replacement With Lead:
                </label>
                <select
                  value={sampleLeadId}
                  onChange={(e) => setSampleLeadId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  {crmLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} — {l.contact_person || 'No Contact'} ({l.industry || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {testFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    testFeedback.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/50 border border-red-300 text-red-700 dark:text-red-300'
                  }`}
                >
                  {testFeedback.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  <span>{testFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Test Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENROLL LEADS FROM CRM */}
      {isEnrollModalOpen && selectedSequence && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Enroll Leads into "{selectedSequence.name}"</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select explicitly checked leads from CRM. Leads already enrolled are filtered out.
                </p>
              </div>
              <button onClick={() => setIsEnrollModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter / Search Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter available CRM leads..."
                  value={enrollSearch}
                  onChange={(e) => setEnrollSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLeadIdsToEnroll.length === eligibleLeadsForEnrollment.length) {
                      setSelectedLeadIdsToEnroll([]);
                    } else {
                      setSelectedLeadIdsToEnroll(eligibleLeadsForEnrollment.map(l => l.id));
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
                >
                  {selectedLeadIdsToEnroll.length === eligibleLeadsForEnrollment.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs font-bold text-purple-600">
                  {selectedLeadIdsToEnroll.length} selected
                </span>
              </div>
            </div>

            {/* List of Available Leads */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {eligibleLeadsForEnrollment.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No eligible unenrolled leads found matching your criteria.
                </div>
              ) : (
                eligibleLeadsForEnrollment.map((lead) => {
                  const isChecked = selectedLeadIdsToEnroll.includes(lead.id);
                  return (
                    <label
                      key={lead.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                        isChecked ? 'bg-purple-50 dark:bg-purple-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIdsToEnroll([...selectedLeadIdsToEnroll, lead.id]);
                          } else {
                            setSelectedLeadIdsToEnroll(selectedLeadIdsToEnroll.filter(id => id !== lead.id));
                          }
                        }}
                        className="rounded text-purple-600 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {lead.company_name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {lead.industry || 'General'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {lead.contact_person || '—'} &bull; <span className="font-mono text-[10px]">{lead.email}</span>
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                {selectedLeadIdsToEnroll.length} lead(s) ready to enroll in Step 1 (Immediate)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteEnrollment}
                  disabled={selectedLeadIdsToEnroll.length === 0 || isEnrolling}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isEnrolling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Enroll {selectedLeadIdsToEnroll.length} Leads</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
