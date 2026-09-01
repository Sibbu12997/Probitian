import { hasOptionalConsent, subscribeToConsentChanges } from './cookieConsent';

// Google Analytics 4 (GA4) Analytics Utility for ProBitian
// Uses VITE_GA4_MEASUREMENT_ID from environment variables.
// Strictly prevents sending any personally identifiable information (PII).
// Strictly requires explicit user consent ('all') before initialization or event tracking.

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    [key: string]: any;
  }
}

const getMeasurementId = (): string => {
  return import.meta.env.VITE_GA4_MEASUREMENT_ID || 'G-G3WJXY6THP';
};

let isInitialized = false;

// Setup reactive listener for consent updates
if (typeof window !== 'undefined') {
  subscribeToConsentChanges((choice) => {
    const measurementId = getMeasurementId();
    if (choice === 'all') {
      if (measurementId && typeof window !== 'undefined') {
        window[`ga-disable-${measurementId}`] = false;
      }
      initGA();
      trackPageView(window.location.pathname + window.location.hash);
    } else if (choice === 'necessary') {
      if (measurementId && typeof window !== 'undefined') {
        window[`ga-disable-${measurementId}`] = true;
      }
    }
  });
}

/**
 * Initializes Google Analytics 4 dynamically strictly if optional consent is granted.
 */
export const initGA = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Strict Privacy Boundary: Do not initialize or inject scripts without explicit optional consent
  if (!hasOptionalConsent()) {
    return false;
  }

  const measurementId = getMeasurementId();

  if (!measurementId || measurementId.trim() === '' || measurementId.includes('G-XXXXXXXXXX')) {
    return false;
  }

  try {
    window[`ga-disable-${measurementId}`] = false;
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    // Avoid double injecting script tag
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);

      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        send_page_view: true,
        anonymize_ip: true,
      });
    }

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('[GA4] Failed to initialize GA4:', error);
    return false;
  }
};

/**
 * Strips PII fields from custom event parameters for privacy compliance.
 */
const sanitizeParams = (params?: Record<string, any>): Record<string, any> => {
  if (!params) return {};
  
  const forbiddenKeys = [
    'email', 'phone', 'mobile', 'name', 'fullname', 'full_name',
    'first_name', 'last_name', 'message', 'body', 'passkey',
    'password', 'secret', 'address', 'ip'
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenKeys.some(forbidden => lowerKey.includes(forbidden))) {
      continue; // Skip PII fields entirely
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Tracks SPA page views in GA4
 */
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (!hasOptionalConsent()) return;
  initGA();
  const measurementId = getMeasurementId();
  if (typeof window !== 'undefined' && window.gtag) {
    const title = pageTitle || document.title;
    window.gtag('config', measurementId, {
      page_path: pagePath,
      page_title: title,
      page_location: window.location.href,
    });
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: title,
    });
  }
};

/**
 * Generic event tracker
 */
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (!hasOptionalConsent()) return;
  initGA();
  if (typeof window !== 'undefined' && window.gtag) {
    const safeParams = sanitizeParams({
      page_path: window.location.pathname + window.location.hash,
      ...parameters,
    });
    window.gtag('event', eventName, safeParams);
  }
};

// Convenience helper trackers for specific user interactions

export const trackSocialClick = (platform: 'youtube' | 'instagram' | 'facebook' | 'github' | 'x' | 'twitter' | 'linkedin' | 'email' | string, targetUrl: string) => {
  trackEvent(`${platform.toLowerCase()}_click`, {
    platform,
    link_url: targetUrl,
  });
};

export const trackCourseClick = (courseTitle: string, category?: string) => {
  trackEvent('course_click', {
    course_title: courseTitle,
    course_category: category || 'General',
  });
};

export const trackProjectClick = (projectTitle: string) => {
  trackEvent('project_click', {
    project_title: projectTitle,
  });
};

export const trackBlogClick = (blogTitle: string) => {
  trackEvent('blog_click', {
    blog_title: blogTitle,
  });
};

export const trackContactClick = (source: string = 'general') => {
  trackEvent('contact_click', {
    source,
  });
};

export const trackContactFormSubmit = (selectedCourse?: string, formType: string = 'general_inquiry') => {
  trackEvent('contact_form_submit', {
    selected_course: selectedCourse || 'None',
    form_type: formType,
  });
};

export const trackNewsletterSubscribe = (source: string = 'footer') => {
  trackEvent('newsletter_subscribe', {
    source,
  });
};

export const trackCtaClick = (buttonText: string, destination: string) => {
  trackEvent('cta_click', {
    button_text: buttonText,
    destination,
  });
};

export const trackNavigationClick = (targetPage: string) => {
  trackEvent('navigation_click', {
    target_page: targetPage,
  });
};

export const trackExternalLinkClick = (url: string, label?: string) => {
  trackEvent('external_link_click', {
    link_url: url,
    link_label: label || url,
  });
};

export const trackDatasetDownloadClick = (datasetTitle: string, courseOrProject?: string) => {
  trackEvent('dataset_download_click', {
    dataset_title: datasetTitle,
    associated_title: courseOrProject || 'General',
  });
};
