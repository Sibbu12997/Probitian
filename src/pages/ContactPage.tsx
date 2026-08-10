import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  MapPin, 
  Send, 
  CheckCircle2, 
  Youtube, 
  Instagram, 
  Facebook, 
  Github, 
  MessageSquare, 
  User, 
  Phone, 
  GraduationCap, 
  FileText, 
  AlertCircle, 
  Globe, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import { cmsService } from '../services/cmsService';
import { trackContactFormSubmit, trackSocialClick } from '../lib/analytics';
import { SocialLinkItem } from '../types';

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
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const [contactEmail, setContactEmail] = useState<string>('probitianofficial@gmail.com');
  const [hubSettings, setHubSettings] = useState<{ name: string; address: string; url: string }>({
    name: 'ProBitian Community Hub',
    address: 'M93M+688, Salaiya, Madhya Pradesh 486440, India',
    url: 'https://maps.app.goo.gl/T4426JADcNHHFPqb7'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [links, settings] = await Promise.all([
        cmsService.getSocialLinks(),
        cmsService.getGeneralSettings()
      ]);
      setSocialLinks(links.filter((l) => l.is_active));
      if (settings) {
        if (settings.contact_email) setContactEmail(settings.contact_email);
        setHubSettings({
          name: settings.community_hub_name || 'ProBitian Community Hub',
          address: settings.community_hub_address || 'M93M+688, Salaiya, Madhya Pradesh 486440, India',
          url: settings.community_hub_maps_url || 'https://maps.app.goo.gl/T4426JADcNHHFPqb7'
        });
      }
    } catch (e) {
      console.error('Failed to load contact page settings:', e);
    }
  };

  const courseOptions = [
    'Power BI',
    'SQL',
    'Excel',
    'Microsoft Fabric',
    'Power Query',
    'AI Tools for Data',
    'Career Guidance',
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
        // Send GA4 tracking event AFTER successful submission (NO PII)
        trackContactFormSubmit(formData.course_interested || 'General', 'contact_page');

        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          course_interested: '',
          subject: '',
          message: ''
        });
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

  // Helper to resolve icon for social links
  const getSocialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('youtube')) return <Youtube className="w-4 h-4 text-red-500" />;
    if (p.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-500" />;
    if (p.includes('facebook')) return <Facebook className="w-4 h-4 text-blue-500" />;
    if (p.includes('github')) return <Github className="w-4 h-4 text-purple-400" />;
    return <Globe className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="space-y-12 pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Contact Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
          Get in Touch
        </span>

        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Let's Build Something <span className="text-gradient">Great Together</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium leading-relaxed">
          Have a question, want to discuss a project, or need help choosing the right learning path? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact Form Card */}
        <div className="lg:col-span-7 card-radius bg-white dark:bg-slate-800/90 p-6 sm:p-8 border border-slate-200 dark:border-slate-700/80 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-4">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <span>Send a Message</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">* Required fields</span>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-4 shadow-inner">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-200">
                Message Sent Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed max-w-md mx-auto">
                Thanks for reaching out. We've received your enquiry and will get back to you soon. A notification has been logged for Shivam Baghel at <strong className="font-bold">{contactEmail}</strong>.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all cursor-pointer shadow-md"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subject <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Power BI Dashboard Consultation / Course Inquiry"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Describe your inquiry, question, or goals here..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full p-3.5 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="btn-radius w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Submitting Message...' : 'Send Message'}</span>
              </button>

              {/* Form Trust Message */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-1 text-center">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  We usually respond within 1–2 business days.
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                  Your information is used only to respond to your enquiry and provide requested services.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Direct Channels & Community */}
        <div className="lg:col-span-5 space-y-6">
          {/* Direct Channels Card */}
          <div className="card-radius bg-white dark:bg-slate-900 p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-soft space-y-6">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Let's Connect</h3>

            <div className="space-y-3">
              <a
                href={`mailto:${contactEmail}`}
                onClick={() => trackSocialClick('email', `mailto:${contactEmail}`)}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 hover:border-purple-400 transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Mail className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Email Address
                  </p>
                  <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{contactEmail}</p>
                </div>
              </a>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Globe className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Location / Hub</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Global Virtual BI Learning Hub</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Social Connections</h4>
              
              <div className="grid grid-cols-2 gap-2.5">
                {socialLinks.length > 0 ? (
                  socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick(link.platform, link.url)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-all"
                    >
                      {getSocialIcon(link.platform)}
                      <span className="capitalize">{link.platform}</span>
                    </a>
                  ))
                ) : (
                  <>
                    <a
                      href="https://youtube.com/@probitian"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick('youtube', 'https://youtube.com/@probitian')}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-all"
                    >
                      <Youtube className="w-4 h-4 text-red-500" /> YouTube
                    </a>
                    <a
                      href="https://instagram.com/probitian"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick('instagram', 'https://instagram.com/probitian')}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-pink-950/30 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-all"
                    >
                      <Instagram className="w-4 h-4 text-pink-500" /> Instagram
                    </a>
                    <a
                      href="https://facebook.com/probitian"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick('facebook', 'https://facebook.com/probitian')}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-all"
                    >
                      <Facebook className="w-4 h-4 text-blue-500" /> Facebook
                    </a>
                    <a
                      href="https://github.com/probitian"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick('github', 'https://github.com/probitian')}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-all"
                    >
                      <Github className="w-4 h-4 text-purple-400" /> GitHub
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ProBitian Community Hub Card */}
          <div className="card-radius overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-soft space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 border border-purple-500/20">
                <MapPin className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {hubSettings.name || 'ProBitian Community Hub'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connecting data enthusiasts and professionals worldwide.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{hubSettings.address || 'M93M+688, Salaiya, Madhya Pradesh 486440, India'}</span>
              </div>
            </div>

            <a
              href={hubSettings.url || 'https://maps.app.goo.gl/T4426JADcNHHFPqb7'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSocialClick('google_maps', hubSettings.url)}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>View on Google Maps →</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
