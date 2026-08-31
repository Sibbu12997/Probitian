/**
 * ProBitian Cookie & Privacy Consent Manager
 * Minimal, first-party consent mechanism strictly respecting user privacy choices.
 */

export type ConsentChoice = 'necessary' | 'all';

export const COOKIE_CONSENT_KEY = 'probitian_cookie_consent';
export const COOKIE_CONSENT_VERSION_KEY = 'probitian_cookie_consent_version';
export const CURRENT_CONSENT_VERSION = '1.0.0';
export const CONSENT_UPDATED_EVENT = 'probitian_cookie_consent_updated';

/**
 * Retrieves the stored consent choice if valid for the current version.
 */
export const getCookieConsent = (): ConsentChoice | null => {
  if (typeof window === 'undefined') return null;
  try {
    const version = localStorage.getItem(COOKIE_CONSENT_VERSION_KEY);
    if (version !== CURRENT_CONSENT_VERSION) {
      return null;
    }
    const choice = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (choice === 'necessary' || choice === 'all') {
      return choice;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Returns true if the user has made an explicit consent decision.
 */
export const hasUserConsentChoice = (): boolean => {
  return getCookieConsent() !== null;
};

/**
 * Returns true strictly if the user explicitly allowed optional tracking/analytics.
 */
export const hasOptionalConsent = (): boolean => {
  return getCookieConsent() === 'all';
};

/**
 * Stores the user's consent preference and notifies listeners.
 */
export const setCookieConsent = (choice: ConsentChoice): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    localStorage.setItem(COOKIE_CONSENT_VERSION_KEY, CURRENT_CONSENT_VERSION);
    
    // Dispatch custom event for reactive UI components & analytics
    window.dispatchEvent(
      new CustomEvent(CONSENT_UPDATED_EVENT, {
        detail: { choice, version: CURRENT_CONSENT_VERSION }
      })
    );
  } catch (error) {
    console.warn('[CookieConsent] Failed to store consent preference:', error);
  }
};

/**
 * Subscribes to consent updates.
 */
export const subscribeToConsentChanges = (
  callback: (choice: ConsentChoice | null) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ choice: ConsentChoice }>;
    callback(customEvent.detail?.choice || getCookieConsent());
  };

  window.addEventListener(CONSENT_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(CONSENT_UPDATED_EVENT, handler);
  };
};
