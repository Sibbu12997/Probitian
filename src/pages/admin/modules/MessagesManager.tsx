import React, { useState, useEffect } from 'react';
import { Mail, Download, Trash2, CheckCircle2, Eye, MessageSquare, Clock, X, Search, Filter, Phone, GraduationCap, Send, Reply, Archive, RefreshCw, AlertCircle } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { ContactMessage } from '../../../types';

export const MessagesManager: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [replyMode, setReplyMode] = useState<boolean>(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  
  // Filters and Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'read' | 'replied' | 'archived'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Feedback
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await cmsService.getMessages();
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (msg: ContactMessage, startInReply = false) => {
    setActiveMessage(msg);
    setAdminNotes(msg.admin_notes || '');
    setReplySubject(`Re: ${msg.subject || 'Your Inquiry to ProBItian'}`);
    setReplyText('');
    setReplyMode(startInReply);

    // Auto mark 'new' messages as 'read'
    if (msg.status === 'new') {
      await cmsService.updateMessageStatus(msg.id, 'read');
      loadMessages();
    }
  };

  const handleStatusChange = async (id: string, newStatus: ContactMessage['status']) => {
    await cmsService.updateMessageStatus(id, newStatus);
    if (activeMessage && activeMessage.id === id) {
      setActiveMessage({ ...activeMessage, status: newStatus });
    }
    setInfo(`Message status updated to "${newStatus}".`);
    loadMessages();
    setTimeout(() => setInfo(null), 3000);
  };

  const handleSaveNotes = async () => {
    if (!activeMessage) return;
    await cmsService.updateMessageStatus(activeMessage.id, activeMessage.status, adminNotes);
    setActiveMessage({ ...activeMessage, admin_notes: adminNotes });
    setInfo('Admin notes updated successfully.');
    loadMessages();
    setTimeout(() => setInfo(null), 3000);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMessage || !replyText.trim()) return;

    setSendingReply(true);
    setError(null);

    try {
      const res = await cmsService.sendReplyMessage(activeMessage.id, replyText.trim(), replySubject.trim());
      if (res.success) {
        setInfo(res.message || 'Reply dispatched and status updated to Replied!');
        setReplyMode(false);
        setReplyText('');
        loadMessages();
        
        // Refresh active message with reply details
        setActiveMessage({
          ...activeMessage,
          status: 'replied',
          reply_message: replyText.trim(),
          replied_at: new Date().toISOString(),
          reply_status: 'sent',
          email_sent_status: `Reply sent to ${activeMessage.email}`
        });

        setTimeout(() => setInfo(null), 4000);
      } else {
        setError(res.message || 'Failed to send reply.');
      }
    } catch (err: any) {
      console.error('Error sending reply:', err);
      setError(err?.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this message inquiry?')) {
      await cmsService.deleteMessage(id);
      if (activeMessage?.id === id) setActiveMessage(null);
      setInfo('Message deleted.');
      loadMessages();
      setTimeout(() => setInfo(null), 3000);
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Course Interested', 'Subject', 'Message', 'Status', 'Reply Content', 'Replied At', 'Submitted Date'];
    const rows = messages.map(m => [
      m.id,
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${(m.email || '').replace(/"/g, '""')}"`,
      `"${(m.phone || '').replace(/"/g, '""')}"`,
      `"${(m.course_interested || 'None').replace(/"/g, '""')}"`,
      `"${(m.subject || '').replace(/"/g, '""')}"`,
      `"${(m.message || '').replace(/"/g, '""')}"`,
      m.status,
      `"${(m.reply_message || '').replace(/"/g, '""')}"`,
      m.replied_at || '',
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

  // Filter & Search Logic
  const filteredMessages = messages.filter(m => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesCourse = courseFilter === 'all' || (m.course_interested || 'None') === courseFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.email && m.email.toLowerCase().includes(query)) ||
      (m.phone && m.phone.toLowerCase().includes(query)) ||
      (m.subject && m.subject.toLowerCase().includes(query)) ||
      (m.course_interested && m.course_interested.toLowerCase().includes(query)) ||
      (m.message && m.message.toLowerCase().includes(query));

    return matchesStatus && matchesCourse && matchesQuery;
  });

  const courseOptionsList = ['Power BI', 'SQL', 'Excel', 'Microsoft Fabric', 'Power Query', 'Other'];

  const stats = {
    total: messages.length,
    new: messages.filter(m => m.status === 'new').length,
    replied: messages.filter(m => m.status === 'replied').length,
    archived: messages.filter(m => m.status === 'archived').length
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>Contact Messages & Inquiries</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage inquiries, view contact details, filter courses, and compose direct replies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadMessages}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({messages.length})</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Received</span>
          <span className="text-base font-black text-slate-900 dark:text-white">{stats.total}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm flex items-center justify-between">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">New Inquiries</span>
          <span className="text-base font-black text-amber-600 dark:text-amber-400">{stats.new}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Replied Messages</span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{stats.replied}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Archived</span>
          <span className="text-base font-black text-slate-700 dark:text-slate-300">{stats.archived}</span>
        </div>
      </div>

      {/* Alert Banners */}
      {info && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{info}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Control Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Bar */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by sender name, email, phone, course, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Course Interested Filter Dropdown */}
          <div className="md:col-span-6 relative">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-purple-500" /> Course:
              </span>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="all">All Courses / Inquiry Types</option>
                {courseOptionsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {(['all', 'new', 'read', 'replied', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === f
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f} {f === 'all' ? `(${messages.length})` : `(${messages.filter(m => m.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Table Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Contact Submissions Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 max-w-sm mx-auto">
              No message entries matched your search query or selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Sender Info</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Course Interested</th>
                  <th className="py-3.5 px-4">Subject & Message Snippet</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredMessages.map((msg) => (
                  <tr
                    key={msg.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      msg.status === 'new' ? 'bg-amber-500/5 font-semibold' : ''
                    }`}
                  >
                    {/* Sender Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{msg.name}</span>
                        {msg.status === 'new' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="New Inquiry" />
                        )}
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{msg.email}</div>
                    </td>

                    {/* Phone Number */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {msg.phone ? (
                        <a
                          href={`tel:${msg.phone}`}
                          className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 font-mono text-[11px]"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{msg.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">N/A</span>
                      )}
                    </td>

                    {/* Course Interested */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {msg.course_interested ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                          {msg.course_interested}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">General Inquiry</span>
                      )}
                    </td>

                    {/* Subject & Message Snippet */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-purple-700 dark:text-purple-300 truncate">
                        {msg.subject || 'No Subject Specified'}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 truncate text-[11px]">
                        {msg.message}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={msg.status}
                        onChange={(e) => handleStatusChange(msg.id, e.target.value as ContactMessage['status'])}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border cursor-pointer focus:outline-none ${
                          msg.status === 'new'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-500/40'
                            : msg.status === 'read'
                            ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-400/20 dark:text-blue-300 dark:border-blue-500/40'
                            : msg.status === 'replied'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/20 dark:text-emerald-300 dark:border-emerald-500/40'
                            : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        <option value="new">NEW</option>
                        <option value="read">READ</option>
                        <option value="replied">REPLIED</option>
                        <option value="archived">ARCHIVED</option>
                      </select>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(msg, false)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:text-purple-600 dark:hover:text-purple-300 transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDetail(msg, true)}
                          className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2"
                          title="Reply to Message"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Reply</span>
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer"
                          title="Delete Message"
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
        )}
      </div>

      {/* Message View & Reply Modal */}
      {activeMessage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Contact Message Details
                </h3>
              </div>
              <button
                onClick={() => setActiveMessage(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender Detail Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Sender Name</span>
                <strong className="text-slate-900 dark:text-white text-sm">{activeMessage.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Email Address</span>
                <a
                  href={`mailto:${activeMessage.email}`}
                  className="text-purple-600 dark:text-purple-400 font-mono hover:underline font-bold"
                >
                  {activeMessage.email}
                </a>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Phone Number</span>
                {activeMessage.phone ? (
                  <a
                    href={`tel:${activeMessage.phone}`}
                    className="text-slate-800 dark:text-slate-200 font-mono font-bold hover:text-purple-600"
                  >
                    {activeMessage.phone}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">Not Provided</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-semibold">Course Interested In</span>
                {activeMessage.course_interested ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-extrabold text-[11px]">
                    {activeMessage.course_interested}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">General Inquiry</span>
                )}
              </div>
            </div>

            {/* Subject & Submission Date */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Subject:</span>
                <span className="text-slate-400 text-[11px] font-mono">
                  {new Date(activeMessage.created_at).toLocaleString()}
                </span>
              </div>
              <h4 className="text-sm font-black text-purple-700 dark:text-purple-300">
                {activeMessage.subject || 'Inquiry Message'}
              </h4>
            </div>

            {/* Message Body Box */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {activeMessage.message}
            </div>

            {/* Reply History if already replied */}
            {activeMessage.reply_message && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Previous Reply Record</span>
                  </span>
                  {activeMessage.replied_at && (
                    <span className="text-[10px] font-mono font-normal">
                      {new Date(activeMessage.replied_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed italic bg-white/60 dark:bg-slate-950/60 p-3 rounded-lg border border-emerald-500/20">
                  {activeMessage.reply_message}
                </p>
                {activeMessage.email_sent_status && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Status: {activeMessage.email_sent_status}
                  </p>
                )}
              </div>
            )}

            {/* Interactive Reply Composer */}
            {replyMode ? (
              <form onSubmit={handleSendReply} className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-purple-600" />
                    <span>Compose Direct Email Reply to {activeMessage.name}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setReplyMode(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Cancel Reply
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Reply Subject</label>
                  <input
                    type="text"
                    required
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Reply Message Content *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder={`Dear ${activeMessage.name},\n\nThank you for reaching out to ProBItian regarding ${activeMessage.course_interested || 'your inquiry'}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReplyMode(false)}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReply}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingReply ? 'Sending Reply...' : 'Send Direct Reply'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Admin Notes Log</label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Type administrative notes or internal reminders..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReplyMode(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Reply className="w-4 h-4" />
                <span>{activeMessage.reply_message ? 'Send Another Reply' : 'Reply to User'}</span>
              </button>

              <div className="flex items-center gap-2">
                {!replyMode && (
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 text-xs cursor-pointer"
                  >
                    Save Notes
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleStatusChange(activeMessage.id, 'archived')}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

