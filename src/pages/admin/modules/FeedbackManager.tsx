import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquareQuote,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  Sparkles,
  Building,
  User,
  Mail,
  Award,
  ChevronDown
} from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { FeedbackItem, FeedbackStatus } from '../../../types';

export const FeedbackManager: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active item for modal editing or preview
  const [editingItem, setEditingItem] = useState<FeedbackItem | null>(null);
  const [previewItem, setPreviewItem] = useState<FeedbackItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await cmsService.getAdminFeedback();
      setFeedbackList(data);
    } catch (err: any) {
      console.error('Failed to load feedback in admin:', err);
      setErrorMessage(err?.message || 'Failed to load feedback submissions.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Quick moderation actions
  const handleApprove = async (item: FeedbackItem) => {
    try {
      const res = await cmsService.updateFeedback(item.id, { status: 'approved' });
      if (res.success) {
        showSuccess(`Feedback from ${item.name} has been approved and is now live.`);
        loadFeedback();
      } else {
        setErrorMessage(res.error || 'Failed to approve feedback.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to approve feedback.');
    }
  };

  const handleReject = async (item: FeedbackItem) => {
    try {
      const res = await cmsService.updateFeedback(item.id, { status: 'rejected', featured: false });
      if (res.success) {
        showSuccess(`Feedback from ${item.name} has been rejected.`);
        loadFeedback();
      } else {
        setErrorMessage(res.error || 'Failed to reject feedback.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reject feedback.');
    }
  };

  const handleToggleFeatured = async (item: FeedbackItem) => {
    if (item.status !== 'approved') {
      setErrorMessage('Only approved feedback can be featured on the homepage.');
      return;
    }

    try {
      const nextFeatured = !item.featured;
      const res = await cmsService.updateFeedback(item.id, { featured: nextFeatured });
      if (res.success) {
        showSuccess(nextFeatured ? `Marked as featured testimonial.` : `Removed from featured testimonials.`);
        loadFeedback();
      } else {
        setErrorMessage(res.error || 'Failed to update featured state.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update featured state.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await cmsService.deleteFeedback(id);
      if (res.success) {
        showSuccess('Feedback submission deleted permanently.');
        setDeletingId(null);
        loadFeedback();
      } else {
        setErrorMessage(res.error || 'Failed to delete feedback.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete feedback.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSavingEdit(true);
    setErrorMessage(null);

    try {
      const res = await cmsService.updateFeedback(editingItem.id, {
        name: editingItem.name,
        role: editingItem.role || undefined,
        company: editingItem.company || undefined,
        service: editingItem.service || undefined,
        rating: editingItem.rating,
        feedback: editingItem.feedback,
        status: editingItem.status,
        featured: editingItem.status === 'approved' ? editingItem.featured : false
      });

      if (res.success) {
        showSuccess('Feedback updated successfully.');
        setEditingItem(null);
        loadFeedback();
      } else {
        setErrorMessage(res.error || 'Failed to update feedback.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update feedback.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Summary counts
  const stats = useMemo(() => {
    const total = feedbackList.length;
    const pending = feedbackList.filter(f => f.status === 'pending').length;
    const approved = feedbackList.filter(f => f.status === 'approved').length;
    const rejected = feedbackList.filter(f => f.status === 'rejected').length;
    const featured = feedbackList.filter(f => f.featured && f.status === 'approved').length;
    return { total, pending, approved, rejected, featured };
  }, [feedbackList]);

  // Filtered items
  const filteredList = useMemo(() => {
    return feedbackList.filter(item => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Featured filter
      if (featuredFilter === 'true' && !item.featured) return false;
      if (featuredFilter === 'false' && item.featured) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesEmail = item.email.toLowerCase().includes(q);
        const matchesRole = (item.role || '').toLowerCase().includes(q);
        const matchesCompany = (item.company || '').toLowerCase().includes(q);
        const matchesFeedback = item.feedback.toLowerCase().includes(q);
        const matchesService = (item.service || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesRole || matchesCompany || matchesFeedback || matchesService;
      }

      return true;
    });
  }, [feedbackList, statusFilter, featuredFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <MessageSquareQuote className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span>Testimonials & Feedback</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Moderate visitor feedback, approve testimonials for the public showcase, and feature success stories.
          </p>
        </div>

        <button
          type="button"
          onClick={loadFeedback}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="card-radius bg-white dark:bg-slate-800/90 p-4 border border-slate-200 dark:border-slate-700/80 shadow-soft">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>

        <div className="card-radius bg-white dark:bg-slate-800/90 p-4 border border-amber-200 dark:border-amber-900/50 shadow-soft">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pending}</p>
        </div>

        <div className="card-radius bg-white dark:bg-slate-800/90 p-4 border border-emerald-200 dark:border-emerald-900/50 shadow-soft">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved}</p>
        </div>

        <div className="card-radius bg-white dark:bg-slate-800/90 p-4 border border-purple-200 dark:border-purple-900/50 shadow-soft">
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured</span>
          </p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.featured}</p>
        </div>

        <div className="card-radius bg-white dark:bg-slate-800/90 p-4 border border-rose-200 dark:border-rose-900/50 shadow-soft col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
          <button type="button" onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card-radius bg-white dark:bg-slate-800/90 p-4 border border-slate-200 dark:border-slate-700/80 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => {
            const isActive = statusFilter === tab;
            const count = tab === 'all' ? stats.total : stats[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Featured Filter & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <select
            value={featuredFilter}
            onChange={e => setFeaturedFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          >
            <option value="all">All Feedback</option>
            <option value="true">⭐ Featured Only</option>
            <option value="false">Standard Only</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by author, text, role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {filteredList.length === 0 ? (
        <div className="card-radius bg-white dark:bg-slate-800/90 p-12 border border-slate-200 dark:border-slate-700/80 text-center space-y-3">
          <MessageSquareQuote className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No feedback matching your filter</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || featuredFilter !== 'all'
              ? 'Try adjusting your search criteria or filter tags.'
              : 'Visitors will be able to share their reviews through the public feedback form.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map(item => {
            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved';
            const isRejected = item.status === 'rejected';

            return (
              <div
                key={item.id}
                className={`card-radius bg-white dark:bg-slate-800/90 p-5 border transition-all ${
                  item.featured && isApproved
                    ? 'border-purple-300 dark:border-purple-700/80 shadow-md ring-1 ring-purple-400/20'
                    : isPending
                    ? 'border-amber-200 dark:border-amber-800/50'
                    : 'border-slate-200 dark:border-slate-700/80 shadow-soft'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Author Info & Rating */}
                  <div className="space-y-3 flex-1">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Rating Stars */}
                      <div className="flex items-center gap-0.5 text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                        {[...Array(item.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                        <span className="text-[11px] font-bold ml-1 text-amber-700 dark:text-amber-300">{item.rating}.0</span>
                      </div>

                      {/* Status Badge */}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved & Live</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                          Rejected
                        </span>
                      )}

                      {/* Featured Star Badge */}
                      {item.featured && isApproved && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700 flex items-center gap-1 shadow-xs">
                          <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-300" />
                          <span>Featured on Homepage</span>
                        </span>
                      )}

                      {/* Service Tag */}
                      {item.service && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                          {item.service}
                        </span>
                      )}

                      {/* Timestamp */}
                      <span className="text-[11px] text-slate-400 ml-auto">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Feedback Quote */}
                    <div className="bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
                        "{item.feedback}"
                      </p>
                    </div>

                    {/* Author Meta Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>{item.name}</span>
                      </div>

                      {(item.role || item.company) && (
                        <div className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {item.role && item.company
                              ? `${item.role} at ${item.company}`
                              : item.role || item.company}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px]">{item.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Moderation & Admin Actions */}
                  <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    {/* Approve button */}
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => handleApprove(item)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Approve for public display"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {/* Reject button */}
                    {!isRejected && (
                      <button
                        type="button"
                        onClick={() => handleReject(item)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Reject feedback"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {/* Feature / Unfeature button (Only active if approved) */}
                    {isApproved && (
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(item)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                          item.featured
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700 hover:bg-purple-200'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                        }`}
                        title={item.featured ? 'Remove from featured' : 'Feature on homepage'}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.featured ? 'fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400' : 'text-slate-400'}`} />
                        <span>{item.featured ? 'Featured' : 'Feature'}</span>
                      </button>
                    )}

                    {/* Secondary Actions (Preview, Edit, Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Preview Public Card"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Edit Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Feedback"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Feedback Record?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this testimonial submission? This action will be recorded in the security audit log and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-600" />
                <span>Edit Testimonial Content</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Name</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Role / Title</label>
                  <input
                    type="text"
                    value={editingItem.role || ''}
                    onChange={e => setEditingItem({ ...editingItem, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Company</label>
                  <input
                    type="text"
                    value={editingItem.company || ''}
                    onChange={e => setEditingItem({ ...editingItem, company: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Service / Topic</label>
                  <input
                    type="text"
                    value={editingItem.service || ''}
                    onChange={e => setEditingItem({ ...editingItem, service: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Rating (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={editingItem.rating}
                    onChange={e => setEditingItem({ ...editingItem, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={editingItem.status}
                    onChange={e => setEditingItem({ ...editingItem, status: e.target.value as FeedbackStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      disabled={editingItem.status !== 'approved'}
                      checked={editingItem.status === 'approved' && editingItem.featured}
                      onChange={e => setEditingItem({ ...editingItem, featured: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className={`text-xs font-bold ${editingItem.status !== 'approved' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      Featured
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Feedback Quote</label>
                <textarea
                  rows={4}
                  required
                  maxLength={2000}
                  value={editingItem.feedback}
                  onChange={e => setEditingItem({ ...editingItem, feedback: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public Card Live Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Public Card Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Testimonial Card as it appears on HomePage */}
            <div
              className={`card-radius bg-white dark:bg-slate-800/90 p-6 border transition-all flex flex-col justify-between space-y-4 ${
                previewItem.featured
                  ? 'border-purple-400 dark:border-purple-600 shadow-lg ring-1 ring-purple-500/30'
                  : 'border-slate-200 dark:border-slate-700/80 shadow-soft'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(previewItem.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  {previewItem.featured && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                      Featured
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                  "{previewItem.feedback}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                  {previewItem.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{previewItem.name}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {previewItem.role && previewItem.company
                      ? `${previewItem.role} • ${previewItem.company}`
                      : previewItem.role || previewItem.company || 'Community Member'}
                  </p>
                  {previewItem.service && (
                    <span className="inline-block mt-0.5 text-[9px] font-medium text-purple-600 dark:text-purple-400">
                      {previewItem.service}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
