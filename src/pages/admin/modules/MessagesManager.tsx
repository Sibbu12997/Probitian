import React, { useState, useEffect } from 'react';
import { Mail, Download, Trash2, CheckCircle2, Eye, MessageSquare, Clock, X } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { ContactMessage } from '../../../types';

export const MessagesManager: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'replied'>('all');
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const data = await cmsService.getMessages();
    setMessages(data);
  };

  const handleOpenDetail = async (msg: ContactMessage) => {
    setActiveMessage(msg);
    setAdminNotes(msg.admin_notes || '');
    if (msg.status === 'new') {
      await cmsService.updateMessageStatus(msg.id, 'read');
      loadMessages();
    }
  };

  const handleSaveNotes = async () => {
    if (!activeMessage) return;
    await cmsService.updateMessageStatus(activeMessage.id, activeMessage.status, adminNotes);
    setInfo('Admin notes updated.');
    loadMessages();
    setTimeout(() => setInfo(null), 3000);
  };

  const handleMarkReplied = async () => {
    if (!activeMessage) return;
    await cmsService.updateMessageStatus(activeMessage.id, 'replied', adminNotes);
    setActiveMessage({ ...activeMessage, status: 'replied', admin_notes: adminNotes });
    setInfo('Status marked as Replied!');
    loadMessages();
    setTimeout(() => setInfo(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete message entry?')) {
      await cmsService.deleteMessage(id);
      if (activeMessage?.id === id) setActiveMessage(null);
      loadMessages();
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Name', 'Email', 'Subject', 'Message', 'Status', 'Created Date'];
    const rows = messages.map(m => [
      m.id,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.email.replace(/"/g, '""')}"`,
      `"${(m.subject || '').replace(/"/g, '""')}"`,
      `"${m.message.replace(/"/g, '""')}"`,
      m.status,
      m.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ProBItian_Contact_Messages_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = messages.filter(m => filter === 'all' || m.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Contact Messages Manager</h2>
          <p className="text-xs text-slate-400">View user inquiries submitted via the contact form.</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {info && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{info}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        {(['all', 'new', 'read', 'replied'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
              filter === f ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Messages Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3 px-3">Sender</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Message Snippet</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((msg) => (
                <tr key={msg.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-white">
                    <div>{msg.name}</div>
                    <div className="text-[11px] font-normal text-slate-400">{msg.email}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-purple-300">{msg.subject || 'Inquiry'}</td>
                  <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{msg.message}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      msg.status === 'new' ? 'bg-amber-400/20 text-amber-400' :
                      msg.status === 'read' ? 'bg-blue-400/20 text-blue-400' : 'bg-emerald-400/20 text-emerald-400'
                    }`}>
                      {msg.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{new Date(msg.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenDetail(msg)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Modal */}
      {activeMessage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Inquiry Details</h3>
              <button onClick={() => setActiveMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Sender:</span>{' '}
                <strong className="text-white">{activeMessage.name}</strong> ({activeMessage.email})
              </div>
              <div>
                <span className="text-slate-400">Subject:</span>{' '}
                <strong className="text-purple-300">{activeMessage.subject}</strong>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-wrap">
                {activeMessage.message}
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">Admin Notes & Internal Status Log</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Type administrative notes or email reply record..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <a
                href={`mailto:${activeMessage.email}?subject=Re: ${encodeURIComponent(activeMessage.subject || '')}`}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>Open Mail Client</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 text-xs cursor-pointer"
                >
                  Save Notes
                </button>
                <button
                  type="button"
                  onClick={handleMarkReplied}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 cursor-pointer"
                >
                  Mark Replied
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
