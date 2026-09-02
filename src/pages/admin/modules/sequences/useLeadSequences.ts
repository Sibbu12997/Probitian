import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { cmsService } from '../../../../services/cmsService';
import { LeadSequence, SequenceStep, SequenceLead, Lead, SequenceStatus } from '../../../../types';
import { sanitizeCmsHtml, escapeHtml } from '../../../../lib/htmlSanitizer';
import {
  SequenceStats,
  SequenceFilterStatus,
  SequenceLeadTabFilter,
  SequenceActiveTab,
  PreviewDevice,
  ToastMessage
} from './types';

export const useLeadSequences = () => {
  const [sequences, setSequences] = useState<LeadSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<LeadSequence | null>(null);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);
  const [sequenceLeads, setSequenceLeads] = useState<SequenceLead[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SequenceFilterStatus>('All');
  const [leadTabFilter, setLeadTabFilter] = useState<SequenceLeadTabFilter>('All');
  const [activeTab, setActiveTab] = useState<SequenceActiveTab>('steps');

  // Step Editor State
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [previewStepIndex, setPreviewStepIndex] = useState<number | null>(null);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
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

  // CRM Leads for enrollment modal & preview sampling
  const [crmLeads, setCrmLeads] = useState<Lead[]>([]);
  const [sampleLeadId, setSampleLeadId] = useState<string>('');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedLeadIdsToEnroll, setSelectedLeadIdsToEnroll] = useState<string[]>([]);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  const loadSequenceDetails = useCallback(async (id: string) => {
    try {
      setLoadingDetails(true);
      const seq = await cmsService.getLeadSequenceById(id);
      if (seq) {
        setSelectedSequence(seq);
        setSequenceSteps(seq.steps || []);
        setSequenceLeads(seq.leads || []);
      }
    } catch {
      showToast('Failed to load sequence details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  }, [showToast]);

  const fetchSequences = useCallback(async () => {
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
  }, [activeSequenceId, loadSequenceDetails, showToast]);

  const loadCrmLeads = useCallback(async () => {
    try {
      const leads = await cmsService.getLeads();
      setCrmLeads(leads || []);
      if (leads && leads.length > 0 && !sampleLeadId) {
        setSampleLeadId(leads[0].id);
      }
    } catch (e) {
      console.warn('Failed to load CRM leads:', e);
    }
  }, [sampleLeadId]);

  useEffect(() => {
    fetchSequences();
    loadCrmLeads();
  }, [fetchSequences, loadCrmLeads]);

  const handleSelectSequence = useCallback((seqId: string) => {
    setActiveSequenceId(seqId);
    loadSequenceDetails(seqId);
    setEditingStepIndex(null);
    setPreviewStepIndex(null);
    setActiveTab('steps');
  }, [loadSequenceDetails]);

  const handleClearSelectedSequence = useCallback(() => {
    setSelectedSequence(null);
    setActiveSequenceId(null);
  }, []);

  const handleCreateSequence = useCallback(async (e: React.FormEvent) => {
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
            html_content: `<h2>Hello {{contact_person}},</h2>\n<p>I noticed <strong>{{company_name}}</strong> operates in {{industry}}.</p>\n<p>Based on your business scale in {{location}}, a dedicated Power BI dashboard tailored for <strong>{{powerbi_use_case}}</strong> can eliminate manual Excel consolidation and deliver executive clarity in real time.</p>\n<p><a href="https://probitian.ai.studio/contact" class="btn-cta">Schedule Power BI Consultation</a></p>\n<p>Best regards,<br/><strong>Shivam Baghel</strong><br/>ProBitian Analytics</p>`,
            enabled: true
          },
          {
            step_number: 2,
            delay_days: 3,
            subject: 'Following up — Power BI for {{company_name}}',
            preheader: 'Quick follow-up regarding automated analytics for {{company_name}}',
            html_content: `<h2>Hi {{contact_person}},</h2>\n<p>Following up on my previous note regarding <strong>{{company_name}}</strong>'s analytics workflow in {{location}}.</p>\n<p>We specialize in turning complex multi-source data into real-time Power BI executive dashboards for {{industry}} organizations — specifically around <strong>{{powerbi_use_case}}</strong>.</p>\n<p>Would you have 10 minutes this week for a brief walkthrough of live enterprise dashboards?</p>\n<p><a href="https://probitian.ai.studio/projects" class="btn-cta">Explore Live Portfolio</a></p>\n<p>Regards,<br/><strong>Shivam Baghel</strong><br/>ProBitian Analytics</p>`,
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
  }, [newSeqName, newSeqDesc, fetchSequences, handleSelectSequence, showToast]);

  const handleToggleSequenceStatus = useCallback(async (seq: LeadSequence) => {
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
    } catch {
      showToast('Failed to toggle sequence status', 'error');
    }
  }, [fetchSequences, showToast]);

  const handleDeleteSequence = useCallback(async (seqId: string, name: string) => {
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
    } catch {
      showToast('Failed to delete sequence', 'error');
    }
  }, [activeSequenceId, fetchSequences, showToast]);

  // Step Management
  const handleAddStep = useCallback(() => {
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
    setSequenceSteps(prev => [...prev, newStep]);
    setEditingStepIndex(sequenceSteps.length);
  }, [selectedSequence?.id, sequenceSteps.length]);

  const handleDeleteStep = useCallback((idx: number) => {
    setSequenceSteps(prev => prev.filter((_, i) => i !== idx).map((st, i) => ({
      ...st,
      step_number: i + 1
    })));
    setEditingStepIndex(prev => (prev === idx ? null : prev));
  }, []);

  const handleMoveStep = useCallback((idx: number, direction: 'up' | 'down') => {
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
  }, [sequenceSteps]);

  const handleSaveSteps = useCallback(async () => {
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
  }, [loadSequenceDetails, selectedSequence, sequenceSteps, showToast]);

  // Trigger manual background worker
  const handleTriggerWorker = useCallback(async () => {
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
    } catch {
      showToast('Failed to run sequence worker', 'error');
    }
  }, [fetchSequences, loadSequenceDetails, selectedSequence, showToast]);

  // Stop single lead in sequence
  const handleStopLead = useCallback(async (leadId: string, companyName: string) => {
    if (!selectedSequence) return;
    if (!window.confirm(`Stop automated sequence for ${companyName}? No further steps will be sent to this lead.`)) return;

    try {
      const res = await cmsService.stopLeadInSequence(selectedSequence.id, leadId, 'Manual Stop');
      showToast(res.message);
      loadSequenceDetails(selectedSequence.id);
    } catch {
      showToast('Failed to stop lead sequence', 'error');
    }
  }, [loadSequenceDetails, selectedSequence, showToast]);

  // Test Email
  const handleOpenTestModal = useCallback((stepNum: number) => {
    setTestStepNumber(stepNum);
    setTestFeedback(null);
    setIsTestModalOpen(true);
  }, []);

  const handleSendTestEmail = useCallback(async (e: React.FormEvent) => {
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
  }, [sampleLeadId, selectedSequence, showToast, testRecipientEmail, testStepNumber]);

  // Enroll Leads Modal
  const handleOpenEnrollModal = useCallback(() => {
    setSelectedLeadIdsToEnroll([]);
    setEnrollSearch('');
    setIsEnrollModalOpen(true);
  }, []);

  const handleExecuteEnrollment = useCallback(async () => {
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
  }, [fetchSequences, loadSequenceDetails, selectedLeadIdsToEnroll, selectedSequence, showToast]);

  // Interpolated Preview Generator
  const getInterpolatedHtml = useCallback((rawHtml: string, rawSubject: string) => {
    const sampleLead = crmLeads.find(l => l.id === sampleLeadId) || {
      id: 'default-sample',
      company_name: 'Udaan Manufacturing Ltd',
      industry: 'Automotive & Industrial Parts',
      location: 'Pithampur Industrial Zone, MP',
      contact_person: 'Rajesh Sharma',
      email: 'rajesh.sharma@udaanmfg.example.com',
      phone: '+91 98260 12345',
      powerbi_use_case: 'Plant Production MIS & Scrap Costing Dashboard',
      lead_priority: 'High' as const,
      status: 'Not Contacted' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
      html = html.replace(reg, escapeHtml(v));
    });

    html = sanitizeCmsHtml(html);

    return { subject, html, sampleLead };
  }, [crmLeads, sampleLeadId]);

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
  const overallStats: SequenceStats = useMemo(() => {
    const total = sequences.length;
    const active = sequences.filter(s => s.status === 'Active').length;
    const paused = sequences.filter(s => s.status === 'Paused').length;
    const totalLeadsEnrolled = sequences.reduce((sum, s) => sum + (s.total_leads || 0), 0);
    const totalSent = sequences.reduce((sum, s) => sum + (s.emails_sent || 0), 0);
    const totalFailed = sequences.reduce((sum, s) => sum + (s.emails_failed || 0), 0);
    return { total, active, paused, totalLeadsEnrolled, totalSent, totalFailed };
  }, [sequences]);

  // Eligible leads for enrollment
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

  return {
    sequences,
    loading,
    activeSequenceId,
    selectedSequence,
    sequenceSteps,
    setSequenceSteps,
    sequenceLeads,
    loadingDetails,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    leadTabFilter,
    setLeadTabFilter,
    activeTab,
    setActiveTab,
    editingStepIndex,
    setEditingStepIndex,
    previewStepIndex,
    setPreviewStepIndex,
    previewDevice,
    setPreviewDevice,
    savingSteps,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newSeqName,
    setNewSeqName,
    newSeqDesc,
    setNewSeqDesc,
    isCreating,
    isTestModalOpen,
    setIsTestModalOpen,
    testStepNumber,
    setTestStepNumber,
    testRecipientEmail,
    setTestRecipientEmail,
    sendingTest,
    testFeedback,
    crmLeads,
    sampleLeadId,
    setSampleLeadId,
    isEnrollModalOpen,
    setIsEnrollModalOpen,
    selectedLeadIdsToEnroll,
    setSelectedLeadIdsToEnroll,
    enrollSearch,
    setEnrollSearch,
    isEnrolling,
    toastMessage,
    setToastMessage,
    showToast,
    fetchSequences,
    loadSequenceDetails,
    handleSelectSequence,
    handleClearSelectedSequence,
    handleCreateSequence,
    handleToggleSequenceStatus,
    handleDeleteSequence,
    handleAddStep,
    handleDeleteStep,
    handleMoveStep,
    handleSaveSteps,
    handleTriggerWorker,
    handleStopLead,
    handleOpenTestModal,
    handleSendTestEmail,
    handleOpenEnrollModal,
    handleExecuteEnrollment,
    getInterpolatedHtml,
    filteredSequences,
    filteredSequenceLeads,
    overallStats,
    eligibleLeadsForEnrollment
  };
};
