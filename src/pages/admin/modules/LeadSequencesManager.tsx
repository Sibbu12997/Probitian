import React from 'react';
import {
  Workflow,
  Plus,
  Users,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { LeadSequencesManagerProps } from './sequences/types';
import { useLeadSequences } from './sequences/useLeadSequences';
import { SequenceMetricsCards } from './sequences/SequenceMetricsCards';
import { SequenceFilters } from './sequences/SequenceFilters';
import { SequenceList } from './sequences/SequenceList';
import { SequenceDetailHeader } from './sequences/SequenceDetailHeader';
import { SequenceStepEditor } from './sequences/SequenceStepEditor';
import { SequenceEnrolledLeadsTable } from './sequences/SequenceEnrolledLeadsTable';
import { SequenceCreateModal } from './sequences/SequenceCreateModal';
import { SequenceTestEmailModal } from './sequences/SequenceTestEmailModal';
import { SequenceEnrollModal } from './sequences/SequenceEnrollModal';

export const LeadSequencesManager: React.FC<LeadSequencesManagerProps> = ({ onNavigateToLeads }) => {
  const {
    loading,
    selectedSequence,
    sequenceSteps,
    setSequenceSteps,
    sequenceLeads,
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
  } = useLeadSequences();

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Header Bar */}
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

      {/* Metric Cards */}
      <SequenceMetricsCards stats={overallStats} />

      {/* Main Content Area */}
      {!selectedSequence ? (
        <div className="space-y-4">
          <SequenceFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          <SequenceList
            sequences={filteredSequences}
            loading={loading}
            onSelectSequence={handleSelectSequence}
            onToggleStatus={handleToggleSequenceStatus}
            onDeleteSequence={handleDeleteSequence}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <SequenceDetailHeader
            sequence={selectedSequence}
            stepCount={sequenceSteps.length}
            leadCount={sequenceLeads.length}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBack={handleClearSelectedSequence}
            onToggleStatus={handleToggleSequenceStatus}
            onOpenEnrollModal={handleOpenEnrollModal}
          />

          {activeTab === 'steps' && (
            <SequenceStepEditor
              steps={sequenceSteps}
              onStepsChange={setSequenceSteps}
              savingSteps={savingSteps}
              onSaveSteps={handleSaveSteps}
              onAddStep={handleAddStep}
              onDeleteStep={handleDeleteStep}
              onMoveStep={handleMoveStep}
              editingStepIndex={editingStepIndex}
              onToggleEditStep={(idx) => setEditingStepIndex(editingStepIndex === idx ? null : idx)}
              previewStepIndex={previewStepIndex}
              onTogglePreviewStep={(idx) => setPreviewStepIndex(previewStepIndex === idx ? null : idx)}
              previewDevice={previewDevice}
              onPreviewDeviceChange={setPreviewDevice}
              onOpenTestModal={handleOpenTestModal}
              crmLeads={crmLeads}
              sampleLeadId={sampleLeadId}
              onSampleLeadChange={setSampleLeadId}
              getInterpolatedHtml={getInterpolatedHtml}
            />
          )}

          {activeTab === 'leads' && (
            <SequenceEnrolledLeadsTable
              sequenceLeads={filteredSequenceLeads}
              totalSteps={sequenceSteps.length}
              leadTabFilter={leadTabFilter}
              onLeadTabFilterChange={setLeadTabFilter}
              onOpenEnrollModal={handleOpenEnrollModal}
              onStopLead={handleStopLead}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <SequenceCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        name={newSeqName}
        onNameChange={setNewSeqName}
        description={newSeqDesc}
        onDescriptionChange={setNewSeqDesc}
        onSubmit={handleCreateSequence}
        isCreating={isCreating}
      />

      <SequenceTestEmailModal
        isOpen={isTestModalOpen && !!selectedSequence}
        onClose={() => setIsTestModalOpen(false)}
        steps={sequenceSteps}
        testStepNumber={testStepNumber}
        onTestStepNumberChange={setTestStepNumber}
        testRecipientEmail={testRecipientEmail}
        onTestRecipientEmailChange={setTestRecipientEmail}
        sampleLeadId={sampleLeadId}
        onSampleLeadIdChange={setSampleLeadId}
        crmLeads={crmLeads}
        testFeedback={testFeedback}
        onSubmit={handleSendTestEmail}
        sendingTest={sendingTest}
      />

      <SequenceEnrollModal
        isOpen={isEnrollModalOpen && !!selectedSequence}
        onClose={() => setIsEnrollModalOpen(false)}
        sequenceName={selectedSequence?.name || ''}
        eligibleLeads={eligibleLeadsForEnrollment}
        selectedLeadIds={selectedLeadIdsToEnroll}
        onSelectedLeadIdsChange={setSelectedLeadIdsToEnroll}
        enrollSearch={enrollSearch}
        onEnrollSearchChange={setEnrollSearch}
        onExecuteEnrollment={handleExecuteEnrollment}
        isEnrolling={isEnrolling}
      />
    </div>
  );
};
