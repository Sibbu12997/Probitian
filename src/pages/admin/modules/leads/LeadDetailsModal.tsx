import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  Workflow,
  Send,
  Edit3
} from 'lucide-react';
import {
  Lead,
  STATUS_COLORS,
  PRIORITY_COLORS,
  DetailedLead,
  LeadSequenceEnrollmentItem
} from './types';
import { cmsService } from '../../../../services/cmsService';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: (lead: Lead) => void;
  onSequenceStopped?: () => void;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onEdit,
  onSequenceStopped
}) => {
  const [detailedLead, setDetailedLead] = useState<DetailedLead | null>(null);
  const [enrolledSequences, setEnrolledSequences] = useState<LeadSequenceEnrollmentItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead) {
      setDetailedLead(null);
      setEnrolledSequences([]);
      return;
    }

    let isMounted = true;
    const fetchFullDetails = async () => {
      setLoadingDetails(true);
      try {
        const fullLead = await cmsService.getLeadById(lead.id);
        if (isMounted) {
          setDetailedLead((fullLead as DetailedLead) || lead);
        }
      } catch {
        if (isMounted) {
          setDetailedLead(lead);
        }
      }

      try {
        const seqs = await cmsService.getLeadSequencesForLead(lead.id);
        if (isMounted) {
          setEnrolledSequences(seqs || []);
        }
      } catch {
        if (isMounted) {
          setEnrolledSequences([]);
        }
      } finally {
        if (isMounted) {
          setLoadingDetails(false);
        }
      }
    };

    fetchFullDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const currentLead = detailedLead || lead;
  const statusStyling = STATUS_COLORS[currentLead.status] || STATUS_COLORS['Not Contacted'];
  const priorityStyling = PRIORITY_COLORS[currentLead.lead_priority] || PRIORITY_COLORS['Medium'];

  const handleStopSequence = async (sequenceId: string) => {
    if (window.confirm('Are you sure you want to stop this automated sequence for this lead?')) {
      const res = await cmsService.stopLeadInSequence(sequenceId, lead.id, 'Manually stopped in lead details');
      if (res.success) {
        setEnrolledSequences(prev => prev.filter(s => s.sequence_id !== sequenceId));
        if (onSequenceStopped) onSequenceStopped();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {currentLead.company_name}
                </h3>
                {currentLead.linkedin && (
                  <a
                    href={currentLead.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Created {new Date(currentLead.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusStyling.bg} ${statusStyling.text} ${statusStyling.border}`}
            >
              Status: {currentLead.status}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${priorityStyling.bg} ${priorityStyling.text} ${priorityStyling.border}`}
            >
              {currentLead.lead_priority} Priority
            </span>
            {currentLead.industry && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {currentLead.industry}
              </span>
            )}
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Email</p>
                <a
                  href={`mailto:${currentLead.email}`}
                  className="font-medium text-purple-600 hover:underline"
                >
                  {currentLead.email}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Phone</p>
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {currentLead.phone || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Contact Person</p>
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {currentLead.contact_person || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Location</p>
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {currentLead.location || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Next Follow-up</p>
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {currentLead.follow_up_date || 'None scheduled'}
                </p>
              </div>
            </div>
          </div>

          {/* Use Case & Requirement */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Power BI & Business Intelligence Requirement</span>
            </h4>
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {currentLead.powerbi_use_case || (
                <span className="italic text-slate-400">No use case notes documented yet.</span>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          {currentLead.notes && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Internal Sales & Relationship Notes
              </h4>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {currentLead.notes}
              </div>
            </div>
          )}

          {/* Automated Email Sequences Enrolled */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5 text-indigo-500" />
              <span>Active Automated Sequences</span>
            </h4>
            {loadingDetails ? (
              <p className="text-xs text-slate-400">Loading sequence status...</p>
            ) : enrolledSequences.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Not currently enrolled in any automated outreach sequences.
              </p>
            ) : (
              <div className="space-y-2">
                {enrolledSequences.map((seq, idx) => (
                  <div
                    key={seq.id || idx}
                    className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-indigo-950 dark:text-indigo-200">
                        {seq.lead_sequences?.name || 'Automated Outreach Sequence'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Step: {seq.current_step || 1} • Status:{' '}
                        <span className="font-semibold capitalize text-indigo-600 dark:text-indigo-400">
                          {seq.status}
                        </span>
                        {seq.next_send_at && ` • Next: ${new Date(seq.next_send_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {seq.status === 'active' && seq.sequence_id && (
                      <button
                        onClick={() => handleStopSequence(seq.sequence_id)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[10px] font-bold"
                      >
                        Stop Sequence
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Outreach History */}
          {currentLead.outreach_history && currentLead.outreach_history.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>Campaign Outreach History</span>
              </h4>
              <div className="space-y-2">
                {currentLead.outreach_history.map((hist, i) => (
                  <div
                    key={hist.id || i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {hist.lead_campaigns?.name || hist.subject || 'Outreach Campaign'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {hist.sent_at
                          ? new Date(hist.sent_at).toLocaleString()
                          : new Date(hist.created_at || '').toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        hist.status === 'sent' || hist.status === 'opened' || hist.status === 'clicked'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : hist.status === 'replied'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {hist.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800 p-4 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              onClose();
              onEdit(currentLead);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
