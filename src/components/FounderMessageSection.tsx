import React, { useState, useEffect } from 'react';
import { 
  Quote, 
  CheckCircle2, 
  Target, 
  Award, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Lightbulb, 
  Compass, 
  Cpu, 
  Database,
  Rocket,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Briefcase,
  Linkedin,
  Youtube,
  Mail
} from 'lucide-react';
import { XIcon } from './icons/XIcon';
import { cmsService } from '../services/cmsService';
import { FounderMessageConfig } from '../types';
import { DEFAULT_FOUNDER_MESSAGE } from '../data/defaultFounderData';
import { trackSocialClick, trackContactClick } from '../lib/analytics';

const AVAILABLE_ICONS: { [key: string]: React.ElementType } = {
  Target,
  Award,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Lightbulb,
  Compass,
  Cpu,
  Database,
  Rocket,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Briefcase
};

interface FounderMessageSectionProps {
  contactEmail?: string;
  initialConfig?: FounderMessageConfig;
}

export const FounderMessageSection: React.FC<FounderMessageSectionProps> = ({ 
  contactEmail = 'probitianofficial@gmail.com',
  initialConfig
}) => {
  const [config, setConfig] = useState<FounderMessageConfig>(initialConfig || DEFAULT_FOUNDER_MESSAGE);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!initialConfig) {
      cmsService.getFounderMessage().then((data) => {
        if (data) {
          setConfig(data);
        }
      }).catch((err) => {
        console.warn('Failed to load founder message config:', err);
      });
    }
  }, [initialConfig]);

  // If explicitly disabled in CMS, do not render
  if (config.enabled === false) {
    return null;
  }

  const initials = config.name
    ? config.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SS';

  // Highlight brand word in heading if present (e.g. ProBItian)
  const renderHeading = () => {
    const heading = config.heading || 'Why We Built ProBItian';
    const highlight = config.heading_highlight || 'ProBItian';

    if (highlight && heading.includes(highlight)) {
      const parts = heading.split(highlight);
      return (
        <>
          {parts[0]}
          <span className="text-gradient">Pro<span className="text-amber-500 font-black">BI</span>tian</span>
          {parts.slice(1).join(highlight)}
        </>
      );
    }
    return heading;
  };

  const activeSocialLinks = (config.social_links || []).filter(link => link.enabled && link.url);

  // Flatten paragraph strings in case multiple paragraphs are stored with newlines in one string
  const paragraphs: string[] = (config.message_paragraphs || [])
    .flatMap(p => (typeof p === 'string' ? p.split(/\n\s*\n/) : []))
    .map(p => p.trim())
    .filter(Boolean);

  const cleanSignature = config.signature_text 
    ? config.signature_text.replace(/^[—–-]\s*/, '').trim() 
    : '';

  // Extract signature name and role cleanly
  let signatureName = config.name || 'Shivam Singh';
  let signatureRole = config.role || '';

  if (cleanSignature) {
    if (cleanSignature.includes('\n')) {
      const lines = cleanSignature.split('\n').map(l => l.trim()).filter(Boolean);
      signatureName = lines[0];
      if (lines.length > 1) signatureRole = lines.slice(1).join(' ');
    } else if (config.role && cleanSignature.includes(config.role)) {
      signatureName = cleanSignature.replace(config.role, '').trim() || config.name;
      signatureRole = config.role;
    } else {
      signatureName = cleanSignature;
    }
  }

  return (
    <section 
      aria-labelledby="founder-message-heading"
      className="space-y-8 sm:space-y-12 transition-all duration-300"
    >
      {/* Top Main Editorial Composition: Founder Identity Card (Left) + Story & Message (Right) */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start">
        
        {/* Left Column: Founder Portrait & Identity Card */}
        <div className="w-full max-w-sm lg:w-[320px] xl:w-[340px] shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col items-center text-center space-y-4">
            
            {/* Portrait Photograph */}
            <div className="relative w-48 h-56 sm:w-56 sm:h-64 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shrink-0">
              {config.avatar_url && !imageError ? (
                <img
                  src={config.avatar_url}
                  alt={config.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white text-4xl font-black">
                  <span className="tracking-wider">{initials}</span>
                </div>
              )}

              {config.show_verified_badge && (
                <div 
                  className="absolute bottom-2.5 right-2.5 p-1.5 rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white dark:ring-slate-900 flex items-center justify-center" 
                  title="Verified Instructor & Founder"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* Founder Identity Meta */}
            <div className="space-y-1 w-full">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {config.name}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">
                {config.role}
              </p>
              {config.bio_subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-1">
                  {config.bio_subtitle}
                </p>
              )}
            </div>

            {/* Verified Social Channels */}
            {activeSocialLinks.length > 0 && (
              <div className="flex items-center justify-center gap-2.5 pt-1 w-full">
                {activeSocialLinks.map((link) => {
                  if (link.platform === 'linkedin') {
                    return (
                      <a
                        key="linkedin"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackSocialClick('linkedin', link.url)}
                        className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#0077b5] dark:hover:text-blue-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        aria-label={`${config.name} on LinkedIn`}
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    );
                  }
                  if (link.platform === 'email') {
                    const mailTarget = link.url.startsWith('mailto:') ? link.url : `mailto:${link.url || contactEmail}`;
                    return (
                      <a
                        key="email"
                        href={mailTarget}
                        onClick={() => trackContactClick('founder_message_email')}
                        className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        aria-label={`Email ${config.name}`}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    );
                  }
                  if (link.platform === 'x') {
                    return (
                      <a
                        key="x"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackSocialClick('x', link.url)}
                        className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        aria-label={`${config.name} on X`}
                      >
                        <XIcon className="w-4 h-4" />
                      </a>
                    );
                  }
                  if (link.platform === 'youtube') {
                    return (
                      <a
                        key="youtube"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackSocialClick('youtube', link.url)}
                        className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        aria-label={`${config.name} on YouTube`}
                      >
                        <Youtube className="w-4 h-4" />
                      </a>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Editorial Note & Message */}
        <div className="flex-1 space-y-6 lg:pt-1">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
              <Quote className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>{config.badge_text || "FOUNDER'S NOTE"}</span>
            </div>
            <h2 id="founder-message-heading" className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {renderHeading()}
            </h2>
          </div>

          {/* Narrative Paragraphs — Clean, spacious, highly readable body typography */}
          <div className="space-y-4 sm:space-y-5 text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {paragraphs.map((paragraph, idx) => (
              <p key={idx}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Right-Aligned Founder Signature */}
          <div className="pt-4 sm:pt-6 flex justify-end">
            <div className="text-right space-y-0.5">
              <div className="flex items-center justify-end gap-2">
                <span className="text-purple-600 dark:text-purple-400 font-bold text-lg leading-none">—</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {signatureName}
                </span>
              </div>
              {signatureRole && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {signatureRole}
                </p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row: Guiding Commitments / Pillars (3 Separate Cards Spanning Horizontally) */}
      {config.highlights && config.highlights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-8 sm:mt-12">
          {config.highlights.map((highlight) => {
            const IconComp = AVAILABLE_ICONS[highlight.icon] || Target;
            const cleanDesc = highlight.description ? highlight.description.replace(/\n+/g, ' ').trim() : '';
            return (
              <div 
                key={highlight.id || highlight.title}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex items-start gap-4 shadow-2xs hover:border-purple-500/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <IconComp className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {highlight.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cleanDesc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

