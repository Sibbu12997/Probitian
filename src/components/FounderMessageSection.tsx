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
  Linkedin,
  Youtube,
  Mail,
  ExternalLink
} from 'lucide-react';
import { XIcon } from './icons/XIcon';
import { cmsService } from '../services/cmsService';
import { FounderMessageConfig } from '../types';
import { DEFAULT_FOUNDER_MESSAGE } from '../data/defaultFounderData';
import { trackSocialClick, trackContactClick } from '../lib/analytics';

const AVAILABLE_ICONS: { [key: string]: React.ElementType } = {
  Target,
  Award,
  CheckCircle2,
  Sparkles,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Compass,
  Cpu,
  Database
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

  return (
    <section 
      aria-labelledby="founder-message-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-all duration-300"
    >
      <div className="p-6 sm:p-10 lg:p-12 space-y-8 lg:space-y-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Founder Portrait & Identity */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
            <div className="relative">
              {config.avatar_url && !imageError ? (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-md ring-1 ring-slate-900/10 dark:ring-white/10 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={config.avatar_url}
                    alt={config.name}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 shadow-md flex items-center justify-center text-white text-3xl font-black">
                  <span className="tracking-wider">{initials}</span>
                </div>
              )}

              {config.show_verified_badge && (
                <div 
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white dark:ring-slate-900" 
                  title="Verified Instructor & Founder"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {config.name}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
                {config.role}
              </p>
              {config.bio_subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal pt-0.5">
                  {config.bio_subtitle}
                </p>
              )}
            </div>

            {/* Verified Social Channels */}
            {activeSocialLinks.length > 0 && (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                {activeSocialLinks.map((link) => {
                  if (link.platform === 'linkedin') {
                    return (
                      <a
                        key="linkedin"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackSocialClick('linkedin', link.url)}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#0077b5] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                        aria-label={`${config.name} on LinkedIn`}
                      >
                        <Linkedin className="w-4 h-4" />
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
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                        aria-label={`${config.name} on YouTube`}
                      >
                        <Youtube className="w-4 h-4" />
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
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                        aria-label={`${config.name} on X`}
                      >
                        <XIcon className="w-4 h-4" />
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
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                        aria-label={`Email ${config.name}`}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          {/* Right Column: Editorial Note & Message */}
          <div className="flex-1 space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                <Quote className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>{config.badge_text || "Founder's Note"}</span>
              </div>
              <h2 id="founder-message-heading" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {renderHeading()}
              </h2>
            </div>

            {/* Narrative Paragraphs — Clean, highly readable body typography */}
            <div className="space-y-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {paragraphs.map((paragraph, idx) => (
                <p key={idx}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Founder Signature */}
            {cleanSignature && (
              <div className="pt-3">
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-serif italic">
                  — {cleanSignature}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Core Guiding Commitments / Pillars (Secondary visual weight, spanning bottom) */}
        {config.highlights && config.highlights.length > 0 && (
          <div className="pt-6 sm:pt-8 border-t border-slate-100 dark:border-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {config.highlights.map((highlight) => {
                const IconComp = AVAILABLE_ICONS[highlight.icon] || Target;
                return (
                  <div 
                    key={highlight.id || highlight.title}
                    className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 transition-colors hover:border-purple-500/30"
                  >
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      <div className="p-1 rounded-lg bg-purple-100/80 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span>{highlight.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                      {highlight.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
