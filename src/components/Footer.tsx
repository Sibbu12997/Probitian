import React, { useState, useEffect } from 'react';
import { NavPage } from '../types';
import { Youtube, Instagram, Facebook, Github, Linkedin, Mail, ArrowUpRight, Send, CheckCircle2 } from 'lucide-react';
import { trackSocialClick, trackContactClick, trackCtaClick, trackNewsletterSubscribe } from '../lib/analytics';
import { cmsService } from '../services/cmsService';
import { PROBITIAN_LOGO_URL } from '../constants/branding';

interface FooterProps {
  onNavigate: (page: NavPage) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [logoUrl, setLogoUrl] = useState<string>(PROBITIAN_LOGO_URL);
  const [contactEmail, setContactEmail] = useState<string>('probitianofficial@gmail.com');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const loadSettings = async () => {
    try {
      const settings = await cmsService.getGeneralSettings();
      if (settings?.logo_url) {
        setLogoUrl(settings.logo_url);
      }
      if (settings?.contact_email) {
        setContactEmail(settings.contact_email);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadSettings();
    const handleBrandingUpdate = () => loadSettings();
    window.addEventListener('probitian_branding_updated', handleBrandingUpdate);
    return () => window.removeEventListener('probitian_branding_updated', handleBrandingUpdate);
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;

    setNewsletterSubmitting(true);
    try {
      await cmsService.subscribeNewsletter(newsletterEmail);
      trackNewsletterSubscribe('footer_form');
      setNewsletterSuccess(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSuccess(false), 5000);
    } catch (err) {
      console.error('Newsletter subscribe error:', err);
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-12 border-t border-slate-800 relative overflow-hidden">
      {/* Background Accent Mesh */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Column 1: Brand & Description */}
          <div className="lg:col-span-2 space-y-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('home');
              }}
              className="flex items-center gap-3 text-left focus:outline-none group"
              aria-label="ProBItian Home"
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 p-0.5 border border-purple-500/40 group-hover:scale-105 transition-transform overflow-hidden flex items-center justify-center shrink-0">
                <img 
                  src={logoUrl} 
                  alt="ProBItian Official Brand Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => { e.currentTarget.src = PROBITIAN_LOGO_URL; }}
                />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Pro<span className="text-amber-500 font-black">BI</span>tian
              </span>
            </a>

            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Learn Data Analytics the Practical Way. Master Power BI, SQL, Excel, AI, and Dashboard Design through industry-focused tutorials and real projects.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://youtube.com/@probitian"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('youtube', 'https://youtube.com/@probitian')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 border border-slate-700/60 transition-all"
                aria-label="ProBItian YouTube Channel"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com/probitian"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('instagram', 'https://instagram.com/probitian')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-pink-600/20 hover:text-pink-400 text-slate-300 border border-slate-700/60 transition-all"
                aria-label="ProBItian Instagram Profile"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/probitian"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('facebook', 'https://facebook.com/probitian')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 border border-slate-700/60 transition-all"
                aria-label="ProBItian Facebook Page"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/probitian"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('github', 'https://github.com/probitian')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-purple-600/20 hover:text-purple-400 text-slate-300 border border-slate-700/60 transition-all"
                aria-label="ProBItian GitHub Repositories"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/probitian/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('linkedin', 'https://www.linkedin.com/company/probitian/')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 border border-slate-700/60 transition-all"
                aria-label="ProBItian LinkedIn Company Profile"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href={`mailto:${contactEmail}`}
                onClick={() => trackContactClick('footer_email')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-300 border border-slate-700/60 transition-all"
                aria-label="Direct Email ProBItian"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>

            {/* Newsletter Subscription Box */}
            <div className="pt-4 space-y-2 max-w-sm">
              <p className="text-xs font-bold text-slate-300">Subscribe for Free DAX & SQL Guides</p>
              {newsletterSuccess ? (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Subscribed! Check your inbox soon.</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-800 rounded-xl border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={newsletterSubmitting}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <span>{newsletterSubmitting ? '...' : 'Subscribe'}</span>
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <a href="/" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="hover:text-purple-400 transition-colors">Home</a>
              </li>
              <li>
                <a href="/learn" onClick={(e) => { e.preventDefault(); onNavigate('learn'); }} className="hover:text-purple-400 transition-colors">Learn</a>
              </li>
              <li>
                <a href="/projects" onClick={(e) => { e.preventDefault(); onNavigate('projects'); }} className="hover:text-purple-400 transition-colors">Projects</a>
              </li>
              <li>
                <a href="/blog" onClick={(e) => { e.preventDefault(); onNavigate('blog'); }} className="hover:text-purple-400 transition-colors">Blog</a>
              </li>
              <li>
                <a href="/about" onClick={(e) => { e.preventDefault(); onNavigate('about'); }} className="hover:text-purple-400 transition-colors">About</a>
              </li>
              <li>
                <a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }} className="hover:text-purple-400 transition-colors">Contact</a>
              </li>
            </ul>
          </div>

          {/* Column 3: Skill Topics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-4">Skill Modules</h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <a href="/learn" onClick={(e) => { e.preventDefault(); onNavigate('learn'); }} className="hover:text-purple-400 transition-colors">Power BI Dashboards</a>
              </li>
              <li>
                <a href="/learn" onClick={(e) => { e.preventDefault(); onNavigate('learn'); }} className="hover:text-purple-400 transition-colors">SQL Database Queries</a>
              </li>
              <li>
                <a href="/learn" onClick={(e) => { e.preventDefault(); onNavigate('learn'); }} className="hover:text-purple-400 transition-colors">Excel Dynamic Arrays</a>
              </li>
              <li>
                <a href="/learn" onClick={(e) => { e.preventDefault(); onNavigate('learn'); }} className="hover:text-purple-400 transition-colors">Power Query ETL</a>
              </li>
              <li>
                <a href="/learn" onClick={(e) => { e.preventDefault(); onNavigate('learn'); }} className="hover:text-purple-400 transition-colors">DAX Measures</a>
              </li>
              <li>
                <a href="/learn" onClick={(e) => { e.preventDefault(); onNavigate('learn'); }} className="hover:text-purple-400 transition-colors">AI for Data Analysts</a>
              </li>
            </ul>
          </div>

          {/* Column 4: Direct Contact Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-4">Community & Contact</h4>
            <p className="text-xs text-slate-400 mb-3">Have questions or project inquiries? Reach out directly:</p>
            <a
              href={`mailto:${contactEmail}`}
              onClick={() => trackContactClick('footer_direct_link')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> {contactEmail}
            </a>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <a
                href="https://youtube.com/@probitian"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackSocialClick('youtube', 'https://youtube.com/@probitian');
                  trackCtaClick('Join YouTube Community', 'https://youtube.com/@probitian');
                }}
                className="btn-radius w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span>Join YouTube Community</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 ProBItian. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigate('privacy'); }} className="hover:text-purple-400 transition-colors">Privacy Policy</a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigate('terms'); }} className="hover:text-purple-400 transition-colors">Terms of Service</a>
            <a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }} className="hover:text-purple-400 transition-colors">Support</a>
            <a href="/admin" onClick={(e) => { e.preventDefault(); onNavigate('admin'); }} className="hover:text-amber-400 font-semibold transition-colors text-amber-500/80">Admin Portal</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
