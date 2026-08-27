import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML Entity Escaping for dynamic CRM values, lead parameters, and text interpolation.
 * Prevents HTML tag breakout and attribute injection when inserting dynamic data into HTML.
 */
export function escapeHtml(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates whether a given URL is safe to render in href or src attributes.
 * Strictly blocks executable URI schemes like javascript:, vbscript:, and malicious data: URIs.
 */
export function isSafeUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Explicitly reject executable / dangerous schemes
  if (/^\s*(?:javascript|vbscript|data(?!\:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml))):/i.test(trimmed)) {
    return false;
  }

  // Safe relative paths & anchor hashes
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol.toLowerCase());
  } catch {
    // If not a full URL, allow clean relative paths without colons
    return !trimmed.includes(':');
  }
}

/**
 * Sanitizes a URL for safe rendering, returning fallback (default '#') if invalid or dangerous.
 */
export function sanitizeUrl(url?: string, fallback: string = '#'): string {
  if (isSafeUrl(url)) {
    return url!.trim();
  }
  return fallback;
}

// Configured DOMPurify options for ProBitian CMS & Email content
const CMS_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'hr',
    'a', 'img',
    'div', 'span', 'section', 'article',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'code', 'pre', 'sub', 'sup'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'target', 'rel',
    'class', 'className', 'style',
    'width', 'height', 'align', 'valign',
    'cellpadding', 'cellspacing', 'border', 'colspan', 'rowspan'
  ],
  FORBID_TAGS: [
    'script', 'iframe', 'object', 'embed', 'foreignObject',
    'base', 'meta', 'link', 'form', 'input', 'button',
    'textarea', 'select', 'applet', 'svg', 'math'
  ],
  FORBID_ATTR: [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onanimationstart', 'onanimationend',
    'onchange', 'onsubmit', 'onkeydown', 'onkeypress', 'onkeyup',
    'ontouchstart', 'ontouchend'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target', 'rel']
};

/**
 * Centralized HTML Sanitizer for ProBitian CMS content, previews, and email templates.
 * Enforces strict whitelist of HTML tags, attributes, and URL protocols using DOMPurify.
 */
export function sanitizeCmsHtml(rawHtml?: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '<p class="text-slate-400 italic">No content written yet.</p>';
  }

  const trimmed = rawHtml.trim();
  if (!trimmed) {
    return '<p class="text-slate-400 italic">No content written yet.</p>';
  }

  // 1. Run DOMPurify with strict ProBitian policy
  let sanitized = DOMPurify.sanitize(trimmed, CMS_PURIFY_CONFIG) as string;

  // 2. Secondary defensive sweep against dangerous protocols & attributes
  sanitized = sanitized.replace(/(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data(?!\:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)))[^"]*"|'\s*(?:javascript|vbscript|data(?!\:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)))[^']*')/gi, '$1="#"');
  sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  return sanitized;
}

/**
 * Safely interpolates dynamic CRM / Lead variables into template text.
 * When isHtml = true (default), all dynamic values are strictly HTML-escaped.
 */
export function interpolateTemplateVariables(
  template: string,
  variables: Record<string, any>,
  isHtml: boolean = true
): string {
  if (!template || typeof template !== 'string') return '';

  let result = template;
  for (const [key, rawVal] of Object.entries(variables)) {
    const val = isHtml ? escapeHtml(rawVal ?? '') : String(rawVal ?? '');
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, val);
  }

  // Clean up any remaining unpopulated template variable tags
  result = result.replace(/{{\s*[\w_]+\s*}}/g, '');

  return result;
}
