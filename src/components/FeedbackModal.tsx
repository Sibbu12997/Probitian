import React, { useEffect } from 'react';
import { X, MessageSquareQuote, Sparkles } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedbackSubmitted?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onFeedbackSubmitted
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div>
              <h2 id="feedback-modal-title" className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Share Your Experience
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Help fellow learners by sharing your ProBitian journey
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <FeedbackForm
            isModal={true}
            onCancel={onClose}
            onSuccess={() => {
              if (onFeedbackSubmitted) onFeedbackSubmitted();
            }}
          />
        </div>
      </div>
    </div>
  );
};
