import React from 'react';
import {
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { MediaPicker } from '../../../components/admin/MediaPicker';
import { LeadCampaignsManagerProps } from './lead_campaigns/types';
import { useLeadCampaigns } from './lead_campaigns/useLeadCampaigns';
import { CampaignMetricsCards } from './lead_campaigns/CampaignMetricsCards';
import { CampaignFilters } from './lead_campaigns/CampaignFilters';
import { CampaignList } from './lead_campaigns/CampaignList';
import { CampaignEditorModal } from './lead_campaigns/CampaignEditorModal';
import { CampaignDispatchModal } from './lead_campaigns/CampaignDispatchModal';
import { CampaignDeliveryLogsModal } from './lead_campaigns/CampaignDeliveryLogsModal';

export const LeadCampaignsManager: React.FC<LeadCampaignsManagerProps> = ({ initialSelectedLeadIds = [] }) => {
  const {
    leads,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    feedback,
    setFeedback,
    loadData,
    stats,
    filteredCampaigns,
    // Editor
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
    // Test Email
    testEmailAddress,
    setTestEmailAddress,
    isSendingTest,
    testResult,
    handleSendTestEmail,
    // Broadcast
    isSendModalOpen,
    setIsSendModalOpen,
    targetCampaign,
    selectedLeadIdsForBroadcast,
    broadcastPriorityFilter,
    setBroadcastPriorityFilter,
    broadcastStatusFilter,
    setBroadcastStatusFilter,
    broadcastSearchTerm,
    setBroadcastSearchTerm,
    isSendingBulk,
    broadcastResult,
    handleOpenSendModal,
    toggleBroadcastLead,
    handleSelectAllBroadcastLeads,
    handleExecuteBroadcast,
    broadcastFilteredLeads,
    // Logs
    viewingCampaign,
    setViewingCampaign,
    loadingRecipients,
    handleViewCampaignLogs,
    // Interpolation
    sampleLead,
    getPersonalizedPreviewHtml,
    getPersonalizedSubject,
    // Media Picker
    isMediaPickerOpen,
    setIsMediaPickerOpen
  } = useLeadCampaigns(initialSelectedLeadIds);

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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <CampaignMetricsCards stats={stats} />

      {/* Campaigns Table Container */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Search & Filter */}
        <CampaignFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={loadData}
          loading={loading}
        />

        {/* Table */}
        <CampaignList
          campaigns={filteredCampaigns}
          loading={loading}
          onOpenNewCampaign={handleOpenNewCampaign}
          onOpenSendModal={handleOpenSendModal}
          onViewCampaignLogs={handleViewCampaignLogs}
          onOpenEditCampaign={handleOpenEditCampaign}
          onDeleteCampaign={handleDeleteCampaign}
        />
      </div>

      {/* FULL EMAIL EDITOR MODAL */}
      {isEditorOpen && (
        <CampaignEditorModal
          editingCampaign={editingCampaign}
          setEditingCampaign={setEditingCampaign}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
          previewLeadId={previewLeadId}
          setPreviewLeadId={setPreviewLeadId}
          leads={leads}
          sampleLead={sampleLead}
          editorRef={editorRef}
          isSaving={isSaving}
          isSendingTest={isSendingTest}
          testEmailAddress={testEmailAddress}
          setTestEmailAddress={setTestEmailAddress}
          testResult={testResult}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveCampaign}
          onSendTestEmail={handleSendTestEmail}
          onApplyTemplate={handleApplyTemplate}
          onInsertVariable={handleInsertVariable}
          onInsertHtmlSnippet={handleInsertHtmlSnippet}
          onOpenMediaPicker={() => setIsMediaPickerOpen(true)}
          getPersonalizedPreviewHtml={getPersonalizedPreviewHtml}
          getPersonalizedSubject={getPersonalizedSubject}
        />
      )}

      {/* DISPATCH / BROADCAST MODAL */}
      {isSendModalOpen && targetCampaign && (
        <CampaignDispatchModal
          targetCampaign={targetCampaign}
          selectedLeadIds={selectedLeadIdsForBroadcast}
          broadcastFilteredLeads={broadcastFilteredLeads}
          broadcastStatusFilter={broadcastStatusFilter}
          setBroadcastStatusFilter={setBroadcastStatusFilter}
          broadcastPriorityFilter={broadcastPriorityFilter}
          setBroadcastPriorityFilter={setBroadcastPriorityFilter}
          broadcastSearchTerm={broadcastSearchTerm}
          setBroadcastSearchTerm={setBroadcastSearchTerm}
          isSendingBulk={isSendingBulk}
          broadcastResult={broadcastResult}
          onClose={() => setIsSendModalOpen(false)}
          onToggleLead={toggleBroadcastLead}
          onSelectAllLeads={handleSelectAllBroadcastLeads}
          onExecuteBroadcast={handleExecuteBroadcast}
        />
      )}

      {/* CAMPAIGN DELIVERY LOGS & RECIPIENTS MODAL */}
      {viewingCampaign && (
        <CampaignDeliveryLogsModal
          viewingCampaign={viewingCampaign}
          loadingRecipients={loadingRecipients}
          onClose={() => setViewingCampaign(null)}
        />
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
