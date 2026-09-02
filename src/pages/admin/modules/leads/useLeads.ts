import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, LeadStatus, LeadMetrics, FeedbackMessage, CsvImportResult } from './types';
import { cmsService } from '../../../../services/cmsService';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [followUpFilter, setFollowUpFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  const loadLeads = useCallback(async () => {
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
    } catch {
      showFeedback('error', 'Failed to load business leads.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, priorityFilter, followUpFilter, showFeedback]);

  useEffect(() => {
    loadLeads();
  }, [statusFilter, priorityFilter, followUpFilter]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  }, [loadLeads]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setFollowUpFilter('all');
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered leads calculation for search
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const s = searchTerm.toLowerCase();
    return leads.filter(lead => (
      (lead.company_name && lead.company_name.toLowerCase().includes(s)) ||
      (lead.contact_person && lead.contact_person.toLowerCase().includes(s)) ||
      (lead.email && lead.email.toLowerCase().includes(s)) ||
      (lead.industry && lead.industry.toLowerCase().includes(s)) ||
      (lead.powerbi_use_case && lead.powerbi_use_case.toLowerCase().includes(s)) ||
      (lead.location && lead.location.toLowerCase().includes(s))
    ));
  }, [leads, searchTerm]);

  // Metrics calculation
  const metrics: LeadMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const contactedCount = leads.filter(l => l.status !== 'Not Contacted').length;
    const highPriorityCount = leads.filter(l => l.lead_priority === 'High').length;
    const convertedCount = leads.filter(l => l.status === 'Converted').length;
    const followUpDueCount = leads.filter(
      l => l.follow_up_date && l.follow_up_date <= todayStr && l.status !== 'Converted' && l.status !== 'Not Interested'
    ).length;

    return {
      totalLeads,
      contactedCount,
      highPriorityCount,
      convertedCount,
      followUpDueCount
    };
  }, [leads, todayStr]);

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  }, [selectedIds.size, filteredLeads]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Quick Status change directly in table
  const handleQuickStatusChange = useCallback(async (leadId: string, newStatus: LeadStatus) => {
    const prevLeads = [...leads];
    setLeads(current => current.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    const success = await cmsService.updateLeadStatus(leadId, { status: newStatus });
    if (!success) {
      setLeads(prevLeads);
      showFeedback('error', 'Failed to update lead status.');
    } else {
      showFeedback('success', `Lead status updated to "${newStatus}".`);
    }
  }, [leads, showFeedback]);

  // Save Lead Form (Create or Update)
  const handleSaveLead = useCallback(async (leadData: Partial<Lead>): Promise<boolean> => {
    if (!leadData.company_name?.trim() || !leadData.email?.trim()) {
      showFeedback('error', 'Company Name and Email are required.');
      return false;
    }

    try {
      const res = await cmsService.saveLead(leadData);
      if (res.success && res.lead) {
        showFeedback('success', leadData.id ? 'Lead updated successfully.' : 'New lead created.');
        await loadLeads();
        return true;
      } else {
        showFeedback('error', res.error || 'Failed to save lead.');
        return false;
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Error saving lead.');
      return false;
    }
  }, [loadLeads, showFeedback]);

  // Delete Single Lead
  const handleDeleteLead = useCallback(async (lead: Lead) => {
    if (window.confirm(`Are you sure you want to delete lead "${lead.company_name}" (${lead.email})?`)) {
      const ok = await cmsService.deleteLead(lead.id);
      if (ok) {
        showFeedback('success', `Lead "${lead.company_name}" removed.`);
        await loadLeads();
      } else {
        showFeedback('error', 'Failed to delete lead.');
      }
    }
  }, [loadLeads, showFeedback]);

  // Batch Delete Selected Leads
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected leads?`)) {
      const ok = await cmsService.batchDeleteLeads(Array.from(selectedIds));
      if (ok) {
        showFeedback('success', `Successfully deleted ${selectedIds.size} leads.`);
        setSelectedIds(new Set());
        await loadLeads();
      } else {
        showFeedback('error', 'Failed to delete selected leads.');
      }
    }
  }, [selectedIds, loadLeads, showFeedback]);

  // CSV Export
  const handleExportCsv = useCallback(() => {
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
  }, [filteredLeads, showFeedback]);

  // Execute CSV Import
  const handleExecuteImport = useCallback(async (
    parsedCsvRows: any[],
    options: { skipDuplicates: boolean; updateDuplicates: boolean }
  ): Promise<CsvImportResult | null> => {
    if (parsedCsvRows.length === 0) {
      showFeedback('error', 'No valid rows found in CSV.');
      return null;
    }

    try {
      const res = await cmsService.importLeads(parsedCsvRows, {
        skipDuplicates: options.skipDuplicates,
        updateDuplicates: options.updateDuplicates
      });

      if (res.success) {
        showFeedback(
          'success',
          `Import complete! ${res.importedCount} new leads imported, ${res.updatedCount || 0} updated, ${res.skippedCount || 0} skipped.`
        );
        await loadLeads();
      } else {
        showFeedback('error', res.error || 'Import failed.');
      }
      return res;
    } catch (e: any) {
      showFeedback('error', e?.message || 'Failed to import CSV.');
      return null;
    }
  }, [loadLeads, showFeedback]);

  // Sequence enrollment for selected leads
  const handleEnrollSelectedInSequence = useCallback(async (sequenceId: string): Promise<boolean> => {
    if (!sequenceId || selectedIds.size === 0) return false;
    try {
      const res = await cmsService.enrollLeadsInSequence(sequenceId, Array.from(selectedIds));
      if (res.success) {
        showFeedback('success', res.message || `Enrolled ${res.enrolledCount} leads into sequence.`);
        setSelectedIds(new Set());
        return true;
      } else {
        showFeedback('error', res.message || 'Failed to enroll leads in sequence.');
        return false;
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to enroll leads in sequence');
      return false;
    }
  }, [selectedIds, showFeedback]);

  return {
    leads,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    followUpFilter,
    setFollowUpFilter,
    resetFilters,
    handleSearchSubmit,
    selectedIds,
    setSelectedIds,
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,
    filteredLeads,
    metrics,
    todayStr,
    feedback,
    setFeedback,
    showFeedback,
    loadLeads,
    handleQuickStatusChange,
    handleSaveLead,
    handleDeleteLead,
    handleBatchDelete,
    handleExportCsv,
    handleExecuteImport,
    handleEnrollSelectedInSequence
  };
}
