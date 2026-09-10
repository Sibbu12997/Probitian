import React, { useState } from 'react';
import { Star, Send, CheckCircle2, AlertCircle, Loader2, Sparkles, HeartHandshake } from 'lucide-react';
import { cmsService } from '../services/cmsService';
import { SubmitFeedbackPayload } from '../types';

interface FeedbackFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  isModal?: boolean;
}

const SERVICE_OPTIONS = [
  'Power BI & DAX',
  'SQL & Relational Modeling',
  'Microsoft Fabric & Lakehouse',
  'Excel & Power Query',
  'Portfolio & Capstone Projects',
  'YouTube Video Tutorials',
  'Career Guidance & Mentorship',
  'Other / General Feedback'
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSuccess,
  onCancel,
  className = '',
  isModal = false
}) => {
  const [formData, setFormData] = useState<SubmitFeedbackPayload>({
    name: '',
    email: '',
    role: '',
    company: '',
    rating: 5,
    feedback: '',
    service: '',
    consent_public: false
  });

  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStarClick = (score: number) => {
    setFormData(prev => ({ ...prev, rating: score }));
  };

  const handleStarKeyDown = (e: React.KeyboardEvent, score: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleStarClick(score);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Front-end validation
    const cleanName = formData.name.trim();
    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanEmail = formData.email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }

    const cleanFeedback = formData.feedback.trim();
    if (cleanFeedback.length < 5) {
      setErrorMessage('Please provide feedback of at least 5 characters.');
      return;
    }

    if (cleanFeedback.length > 2000) {
      setErrorMessage('Feedback cannot exceed 2000 characters.');
      return;
    }

    if (!formData.consent_public) {
      setErrorMessage('Please confirm your consent to display feedback publicly.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await cmsService.submitFeedback({
        name: cleanName,
        email: cleanEmail,
        role: formData.role?.trim() || undefined,
        company: formData.company?.trim() || undefined,
        rating: formData.rating,
        feedback: cleanFeedback,
        service: formData.service?.trim() || undefined,
        consent_public: true
      });

      if (res.success) {
        setSubmitted(true);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Unable to submit feedback. Please try again later.');
      }
    } catch (err: any) {
      console.error('Feedback submission failure:', err);
      setErrorMessage('A network or server error occurred. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      email: '',
      role: '',
      company: '',
      rating: 5,
      feedback: '',
      service: '',
      consent_public: false
    });
    setErrorMessage(null);
  };

  if (submitted) {
    return (
      <div className={`p-6 sm:p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-5 shadow-sm ${className}`}>
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            Thank You for Your Feedback!
          </h3>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed max-w-md mx-auto">
            Thank you for sharing your feedback. Your response has been submitted for review.
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
            Once approved by our editorial team, your testimonial will appear in the "What People Say" showcase.
          </p>
        </div>

        <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-sm"
          >
            Submit Another Feedback
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeRating = hoverRating !== null ? hoverRating : formData.rating;

  const ratingDescriptions: Record<number, string> = {
    1: 'Needs Improvement',
    2: 'Fair Experience',
    3: 'Good & Helpful',
    4: 'Very Good & High Value',
    5: 'Exceptional / Outstanding'
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${className}`} noValidate>
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2.5 animate-fadeIn"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Name and Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="feedback-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="feedback-name"
            type="text"
            required
            maxLength={100}
            placeholder="e.g. Alex Sharma"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="feedback-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Email <span className="text-red-500">*</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1.5">(Never published)</span>
          </label>
          <input
            id="feedback-email"
            type="email"
            required
            maxLength={255}
            placeholder="e.g. alex@example.com"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Role and Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="feedback-role" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Role / Job Title
          </label>
          <input
            id="feedback-role"
            type="text"
            maxLength={100}
            placeholder="e.g. Senior BI Analyst"
            value={formData.role || ''}
            onChange={e => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="feedback-company" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Company / Organization
          </label>
          <input
            id="feedback-company"
            type="text"
            maxLength={100}
            placeholder="e.g. Accenture / Independent"
            value={formData.company || ''}
            onChange={e => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Service / Area & Rating */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {/* Service */}
        <div className="space-y-1.5">
          <label htmlFor="feedback-service" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Service / Area
          </label>
          <select
            id="feedback-service"
            value={formData.service || ''}
            onChange={e => setFormData({ ...formData, service: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all"
          >
            <option value="">Select an area (optional)</option>
            {SERVICE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Rating */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating out of 5 stars">
              {[1, 2, 3, 4, 5].map(star => {
                const isFilled = star <= activeRating;
                return (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={formData.rating === star}
                    aria-label={`${star} star${star > 1 ? 's' : ''} - ${ratingDescriptions[star]}`}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onKeyDown={e => handleStarKeyDown(e, star)}
                    className="p-1 text-amber-400 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded cursor-pointer transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        isFilled ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-1">
              {ratingDescriptions[activeRating]}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Text */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="feedback-text" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Feedback <span className="text-red-500">*</span>
          </label>
          <span className="text-[10px] text-slate-400">
            {formData.feedback.length} / 2000 characters
          </span>
        </div>
        <textarea
          id="feedback-text"
          required
          rows={4}
          maxLength={2000}
          placeholder="Share your experience learning with ProBitian, portfolio project outcomes, or how our guides helped your career..."
          value={formData.feedback}
          onChange={e => setFormData({ ...formData, feedback: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all placeholder:text-slate-400 resize-y min-h-[100px]"
        />
      </div>

      {/* Public Consent Checkbox */}
      <div className="pt-1">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            required
            checked={formData.consent_public}
            onChange={e => setFormData({ ...formData, consent_public: e.target.checked })}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500 dark:bg-slate-900 cursor-pointer"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            I agree that ProBitian may display my feedback publicly. <span className="text-red-500">*</span>
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={submitting || !formData.consent_public}
          className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Feedback</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
