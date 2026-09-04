import React from 'react';
import {
  Send,
  Mail,
  Plus,
  RefreshCw,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react';
import { LeadCampaign } from '../../../../types';

interface CampaignListProps {
  campaigns: LeadCampaign[];
  loading: boolean;
  onOpenNewCampaign: () => void;
  onOpenSendModal: (camp: LeadCampaign) => void;
  onViewCampaignLogs: (camp: LeadCampaign) => void;
  onOpenEditCampaign: (camp: LeadCampaign) => void;
  onDeleteCampaign: (camp: LeadCampaign) => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  loading,
  onOpenNewCampaign,
  onOpenSendModal,
  onViewCampaignLogs,
  onOpenEditCampaign,
  onDeleteCampaign
}) => {
  return (
    <div className="overflow-x-auto">
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
          <p className="text-xs">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Mail className="w-10 h-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Outreach Campaigns Yet</p>
          <p className="text-xs text-slate-500 max-w-sm">
            Create a high-impact personalized email template using dynamic lead tags like {'{{company_name}}'}.
          </p>
          <button
            onClick={onOpenNewCampaign}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm mt-2 cursor-pointer"
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
            {campaigns.map((camp) => (
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
                      onClick={() => onOpenSendModal(camp)}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                      title="Send to Selected Leads"
                    >
                      <Send className="w-3 h-3 text-amber-300" />
                      <span>Dispatch</span>
                    </button>

                    <button
                      onClick={() => onViewCampaignLogs(camp)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="View Delivery Logs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onOpenEditCampaign(camp)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                      title="Edit Campaign"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteCampaign(camp)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
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
  );
};
