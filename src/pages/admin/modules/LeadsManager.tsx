import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Upload,
  Download,
  Send,
  Workflow,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Lead, LeadsManagerProps } from './leads/types';
import { useLeads } from './leads/useLeads';
import { LeadMetricsCards } from './leads/LeadMetricsCards';
import { LeadFilters } from './leads/LeadFilters';
import { LeadTable } from './leads/LeadTable';
import { LeadFormModal } from './leads/LeadFormModal';
import { LeadDetailsModal } from './leads/LeadDetailsModal';
import { LeadCsvImportModal } from './leads/LeadCsvImportModal';
import { LeadSequenceEnrollModal } from './leads/LeadSequenceEnrollModal';

export const LeadsManager: React.FC<LeadsManagerProps> = ({
  onNavigateToOutreach,
  onLaunchCampaign,
  onNavigateToSequences
}) => {
  const launchOutreachHandler = onNavigateToOutreach || onLaunchCampaign;

  // Custom hook for complete Leads state & CRUD
  const {
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
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,
    filteredLeads,
    metrics,
    todayStr,
    feedback,
    handleQuickStatusChange,
    handleSaveLead,
    handleDeleteLead,
    handleBatchDelete,
    handleExportCsv,
    handleExecuteImport,
    handleEnrollSelectedInSequence
  } = useLeads();

  // Local Modal Visibility States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // Modal Triggers
  const handleOpenCreate = () => {
    setEditingLead(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormModalOpen(true);
  };

  const handleOpenView = (lead: Lead) => {
    setViewingLead(lead);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            <span>Business Leads & Outreach CRM</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage prospective client accounts, Power BI requirements, outreach sequences, and lead stages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Launch Outreach Campaign */}
          {launchOutreachHandler && (
            <button
              onClick={() => launchOutreachHandler(selectedIds.size > 0 ? Array.from(selectedIds) : undefined)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              title="Launch targeted email outreach to leads"
            >
              <Send className="w-3.5 h-3.5 text-amber-300" />
              <span>Launch Campaign {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
            </button>
          )}

          {/* Sequence Builder Navigation */}
          {onNavigateToSequences && (
            <button
              onClick={onNavigateToSequences}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Manage automated email drip sequences"
            >
              <Workflow className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Sequences</span>
            </button>
          )}

          {/* Import CSV */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            <span>Import CSV</span>
          </button>

          {/* Add Single Lead */}
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Export filtered leads to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Metrics Summary */}
      <LeadMetricsCards metrics={metrics} />

      {/* Search, Status/Priority Filters, and Batch Actions */}
      <LeadFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearchSubmit={handleSearchSubmit}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        followUpFilter={followUpFilter}
        setFollowUpFilter={setFollowUpFilter}
        onResetFilters={resetFilters}
        loading={loading}
        totalLeadsCount={leads.length}
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onOpenSequenceEnrollModal={() => setIsEnrollModalOpen(true)}
        onBatchDelete={handleBatchDelete}
        launchOutreachHandler={launchOutreachHandler}
      />

      {/* Main Leads Table */}
      <LeadTable
        leads={filteredLeads}
        loading={loading}
        selectedIds={selectedIds}
        toggleSelectAll={toggleSelectAll}
        toggleSelectOne={toggleSelectOne}
        onQuickStatusChange={handleQuickStatusChange}
        onViewLead={handleOpenView}
        onEditLead={handleOpenEdit}
        onDeleteLead={handleDeleteLead}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenCreateModal={handleOpenCreate}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        todayStr={todayStr}
      />

      {/* Modal: Add or Edit Lead Profile */}
      <LeadFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveLead}
        editingLead={editingLead}
      />

      {/* Modal: Detailed Lead Profile & Activity Drawer */}
      <LeadDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        lead={viewingLead}
        onEdit={(lead) => {
          setIsDetailsModalOpen(false);
          handleOpenEdit(lead);
        }}
      />

      {/* Modal: CSV File Import & Parser */}
      <LeadCsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onExecuteImport={handleExecuteImport}
      />

      {/* Modal: Automated Multi-Step Email Sequence Enrollment */}
      <LeadSequenceEnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        selectedCount={selectedIds.size}
        onEnroll={handleEnrollSelectedInSequence}
        onNavigateToSequences={onNavigateToSequences}
      />
    </div>
  );
};
export default LeadsManager;
