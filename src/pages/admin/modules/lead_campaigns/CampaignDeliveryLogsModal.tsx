import React from 'react';
import { X, RefreshCw } from 'lucide-react';
import { LeadCampaign, CampaignLead } from '../../../../types';

interface CampaignDeliveryLogsModalProps {
  viewingCampaign: LeadCampaign & { recipients?: CampaignLead[] };
  loadingRecipients: boolean;
  onClose: () => void;
}

export const CampaignDeliveryLogsModal: React.FC<CampaignDeliveryLogsModalProps> = ({
  viewingCampaign,
  loadingRecipients,
  onClose
}) => {
  return (
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                              : 'bg-red-100 text-red-700 dark:text-red-950/40 dark:text-red-300'
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
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
