/**
 * Central URL Validator & Security Sanitizer
 * Enforces protocol restrictions and blocks dangerous schemes (javascript:, data:, vbscript:, file:, etc.)
 */

export interface UrlValidationOptions {
  allowedProtocols?: string[];
  allowRelative?: boolean;
  allowMailto?: boolean;
  allowHashOnly?: boolean;
  allowEmpty?: boolean;
}

const DEFAULT_ALLOWED_PROTOCOLS = ['https:', 'http:'];

/**
 * Validates a given URL string against strict security rules.
 */
export function validateUrl(
  urlStr: unknown,
  options: UrlValidationOptions = {}
): { valid: boolean; normalized?: string; error?: string } {
  const {
    allowedProtocols = DEFAULT_ALLOWED_PROTOCOLS,
    allowRelative = true,
    allowMailto = false,
    allowHashOnly = true,
    allowEmpty = false,
  } = options;

  if (urlStr === undefined || urlStr === null || urlStr === '') {
    if (allowEmpty) {
      return { valid: true, normalized: '' };
    }
    return { valid: false, error: 'URL cannot be empty' };
  }

  if (typeof urlStr !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }

  const raw = urlStr.trim();
  if (raw.length === 0) {
    if (allowEmpty) {
      return { valid: true, normalized: '' };
    }
    return { valid: false, error: 'URL cannot be blank' };
  }

  // Check for control characters or null bytes
  if (/[\x00-\x1F\x7F]/.test(raw)) {
    return { valid: false, error: 'URL contains illegal control characters' };
  }

  // Block dangerous schemes immediately (case-insensitive & leading-whitespace insensitive)
  const lower = raw.toLowerCase().replace(/[\s\r\n\t]+/g, '');
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return { valid: false, error: 'Prohibited or unsafe URL protocol scheme' };
  }

  // Allow hash-only fragments like '#projects' or '#contact' if configured
  if (allowHashOnly && raw.startsWith('#')) {
    if (/^#[a-zA-Z0-9_-]*$/.test(raw)) {
      return { valid: true, normalized: raw };
    }
    return { valid: false, error: 'Invalid anchor fragment format' };
  }

  // Allow relative paths starting with '/' like '/#projects' or '/learn' if configured
  if (allowRelative && raw.startsWith('/')) {
    if (raw.startsWith('//')) {
      // Protocol-relative URLs can be exploited to bypass domain filters; treat as absolute URL or disallow unless valid host
      return { valid: false, error: 'Protocol-relative URLs starting with // are forbidden' };
    }
    return { valid: true, normalized: raw };
  }

  // Check mailto: if allowed
  if (allowMailto && lower.startsWith('mailto:')) {
    const emailPart = raw.slice(7).split('?')[0].trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailPart)) {
      return { valid: true, normalized: `mailto:${emailPart.toLowerCase()}` };
    }
    return { valid: false, error: 'Invalid mailto: email destination' };
  }

  // Parse as standard URL
  try {
    const parsed = new URL(raw);
    const protocol = parsed.protocol.toLowerCase();

    const allowed = [...allowedProtocols];
    if (allowMailto && !allowed.includes('mailto:')) {
      allowed.push('mailto:');
    }

    if (!allowed.includes(protocol)) {
      return {
        valid: false,
        error: `Protocol "${protocol}" is not allowed. Allowed protocols: ${allowed.join(', ')}`,
      };
    }

    // Require valid host for http/https
    if ((protocol === 'http:' || protocol === 'https:') && !parsed.hostname) {
      return { valid: false, error: 'URL must contain a valid hostname' };
    }

    return { valid: true, normalized: parsed.href };
  } catch (e: any) {
    return { valid: false, error: 'Malformed URL format' };
  }
}
