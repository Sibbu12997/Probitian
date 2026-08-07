import React, { useState, useEffect } from 'react';
import { Download, Trash2, Users, CheckCircle2 } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { NewsletterSubscriber } from '../../../types';

export const SubscribersManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    const data = await cmsService.getNewsletterSubscribers();
    setSubscribers(data);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Remove subscriber email?')) {
      await cmsService.deleteSubscriber(id);
      setInfo('Subscriber removed.');
      loadSubscribers();
      setTimeout(() => setInfo(null), 3000);
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Email', 'Status', 'Subscribed Date'];
    const rows = subscribers.map(s => [s.id, `"${s.email}"`, s.status, s.created_at]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ProBItian_Newsletter_Subscribers_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Newsletter Subscribers Manager</h2>
          <p className="text-xs text-slate-400">Total email subscribers registered on ProBItian.</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Subscriber CSV</span>
        </button>
      </div>

      {info && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{info}</span>
        </div>
      )}

      {/* Subscribers Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3 px-3">Subscriber Email</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Subscribed Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white font-mono">{sub.email}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-400/20 text-emerald-400">
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-400">{new Date(sub.created_at).toLocaleDateString()}</td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
