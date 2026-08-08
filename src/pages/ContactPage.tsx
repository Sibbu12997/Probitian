import React, { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle, Youtube, Instagram, Facebook, Github, MessageSquare, User, Phone, GraduationCap, FileText, AlertCircle } from 'lucide-react';
import { cmsService } from '../services/cmsService';
import { trackContactFormSubmit, trackSocialClick } from '../lib/analytics';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    course_interested: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const courseOptions = [
    'Power BI',
    'SQL',
    'Excel',
    'Microsoft Fabric',
    'Power Query',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@') || !formData.email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 7) {
      setError('Please enter a valid contact phone number.');
      return;
    }
    if (!formData.message.trim()) {
      setError('Please enter your message or inquiry details.');
      return;
    }

    setSending(true);

    try {
      const res = await cmsService.submitContactMessage(formData);
      if (res.success) {
        // Send GA4 tracking event AFTER successful Supabase insertion (NO PII)
        trackContactFormSubmit(formData.course_interested, 'contact_page');

        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          course_interested: '',
          subject: '',
          message: ''
        });
        setTimeout(() => {
          setSubmitted(false);
        }, 7000);
      } else {
        setError(res.error || 'Failed to submit message. Please try again.');
      }
    } catch (err: any) {
      console.error('Error submitting contact form:', err);
      setError(err?.message || 'An unexpected error occurred while submitting.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-12 pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
          Get in Touch
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Let's Connect & <span className="text-gradient">Collaborate</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium">
          Have questions regarding Power BI, SQL, Microsoft Fabric, corporate training, or project consultation? Send a message directly below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-7 card-radius bg-white dark:bg-slate-800/90 p-6 sm:p-8 border border-slate-200 dark:border-slate-700/80 shadow-soft space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Send a Message
          </h2>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-3 shadow-inner">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">Thank You!</h3>
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed max-w-md mx-auto">
                Your inquiry has been received and stored securely. A confirmation message has been logged for Shivam Baghel at <strong className="font-semibold text-emerald-900 dark:text-emerald-100">Probitianofficial@gmail.com</strong>. We will reply shortly!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shivam Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. shivam@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>

                {/* Course Interested In */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Course Interested In <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={formData.course_interested}
                      onChange={(e) => setFormData({ ...formData, course_interested: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                    >
                      <option value="">Select a Course...</option>
                      {courseOptions.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subject <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Power BI Dashboard Consultation / Corporate Training"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Describe your inquiry or question here..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full p-3.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="btn-radius w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-soft flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Submitting Message...' : 'Send Message'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Info & Map */}
        <div className="lg:col-span-5 space-y-6">
          {/* Direct Info Card */}
          <div className="card-radius bg-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <h3 className="text-xl font-extrabold text-white">Direct Channels</h3>

            <div className="space-y-4 text-xs text-slate-300">
              <a
                href="mailto:Probitianofficial@gmail.com"
                onClick={() => trackSocialClick('email', 'mailto:Probitianofficial@gmail.com')}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:text-amber-400 transition-colors"
              >
                <Mail className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-white">Email Address</p>
                  <p className="font-mono text-[11px]">Probitianofficial@gmail.com</p>
                </div>
              </a>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <p className="font-bold text-white">Location</p>
                  <p className="text-[11px]">Global Virtual BI Learning Hub</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Social Connections</h4>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="https://youtube.com/@probitian"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialClick('youtube', 'https://youtube.com/@probitian')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-600/20 hover:text-red-400 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Youtube className="w-4 h-4 text-red-500" /> YouTube
                </a>
                <a
                  href="https://instagram.com/probitian"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialClick('instagram', 'https://instagram.com/probitian')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-pink-600/20 hover:text-pink-400 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Instagram className="w-4 h-4 text-pink-500" /> Instagram
                </a>
                <a
                  href="https://facebook.com/probitian"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialClick('facebook', 'https://facebook.com/probitian')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Facebook className="w-4 h-4 text-blue-500" /> Facebook
                </a>
                <a
                  href="https://github.com/probitian"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialClick('github', 'https://github.com/probitian')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-purple-600/20 hover:text-purple-400 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Github className="w-4 h-4 text-purple-400" /> GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Embedded Google Map Placeholder */}
          <div className="card-radius overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 shadow-soft space-y-2">
            <div className="relative h-48 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-4 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
              <MapPin className="w-8 h-8 text-purple-500 relative z-10 animate-bounce mb-2" />
              <p className="text-xs font-extrabold text-white relative z-10">Global BI Community Hub</p>
              <p className="text-[10px] text-slate-400 relative z-10 mt-0.5">Connecting data enthusiasts worldwide</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
