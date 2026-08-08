/**
 * SVG Sanitizer & Security Validator
 * Protects against XSS attacks, malicious scripts, and invalid markup
 * while preserving aspect ratios, colors, typography, and vector structures.
 */

export interface SvgValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedSvg?: string;
  dataUri?: string;
}

export function sanitizeSvgContent(rawSvgText: string): SvgValidationResult {
  if (!rawSvgText || typeof rawSvgText !== 'string') {
    return { isValid: false, error: 'Empty or non-string SVG content.' };
  }

  const trimmed = rawSvgText.trim();

  // Basic structure check
  if (!trimmed.includes('<svg') || !trimmed.includes('</svg>')) {
    return { isValid: false, error: 'Invalid SVG structure: Missing <svg> root element.' };
  }

  try {
    let sanitizedText = trimmed;

    // 1. Strip script tags completely
    sanitizedText = sanitizedText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Strip dangerous tags (iframe, object, embed, foreignObject, applet, meta, link, form)
    const dangerousTags = ['iframe', 'object', 'embed', 'foreignObject', 'applet', 'meta', 'link', 'form', 'base'];
    for (const tag of dangerousTags) {
      const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
      sanitizedText = sanitizedText.replace(regex, '');
      // Also self-closing variants
      const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
      sanitizedText = sanitizedText.replace(selfClosingRegex, '');
    }

    // 3. Strip inline event handlers (onload, onerror, onclick, etc.)
    sanitizedText = sanitizedText.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // 4. Strip dangerous protocols in attributes (javascript:, data:text/html)
    sanitizedText = sanitizedText.replace(/(href|src|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"');
    sanitizedText = sanitizedText.replace(/(href|src|xlink:href)\s*=\s*(?:"data:text\/html[^"]*"|'data:text\/html[^']*')/gi, '$1="#"');

    // 5. DOMParser check if running in browser
    if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedText, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');

      if (parserError) {
        return {
          isValid: false,
          error: `Corrupted SVG markup: ${parserError.textContent?.slice(0, 120) || 'XML syntax error'}`
        };
      }

      const svgElem = doc.querySelector('svg');
      if (!svgElem) {
        return { isValid: false, error: 'XML parsing succeeded, but no valid <svg> element was found.' };
      }

      // Check for remaining script elements or dangerous attributes
      const scripts = doc.querySelectorAll('script, iframe, object, embed');
      if (scripts.length > 0) {
        return { isValid: false, error: 'Security rejection: SVG contains executable script elements.' };
      }

      // Ensure viewBox or width/height exist to preserve aspect ratio
      if (!svgElem.hasAttribute('viewBox') && (!svgElem.hasAttribute('width') || !svgElem.hasAttribute('height'))) {
        // Set fallback viewBox if missing to protect aspect ratio
        svgElem.setAttribute('viewBox', '0 0 500 500');
      }

      sanitizedText = new XMLSerializer().serializeToString(svgElem);
    }

    // Create safe UTF-8 Data URI
    const encoded = encodeURIComponent(sanitizedText).replace(/'/g, '%27').replace(/"/g, '%22');
    const dataUri = `data:image/svg+xml;utf8,${encoded}`;

    return {
      isValid: true,
      sanitizedSvg: sanitizedText,
      dataUri
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `SVG Sanitization Failed: ${err?.message || 'Unknown error'}`
    };
  }
}

/**
 * Validates a Data URI or URL representing an SVG asset
 */
export function validateSvgDataUri(dataUriOrUrl: string): SvgValidationResult {
  if (!dataUriOrUrl) {
    return { isValid: false, error: 'Empty URL / Data URI provided.' };
  }

  // If it's a standard path or URL (e.g. /logo.svg or https://...)
  if (dataUriOrUrl.startsWith('/') || dataUriOrUrl.startsWith('http://') || dataUriOrUrl.startsWith('https://')) {
    return { isValid: true, dataUri: dataUriOrUrl, sanitizedSvg: '' };
  }

  // If Data URI
  if (dataUriOrUrl.startsWith('data:image/svg+xml')) {
    let rawContent = '';
    if (dataUriOrUrl.includes(';base64,')) {
      const base64Str = dataUriOrUrl.split(';base64,')[1];
      try {
        rawContent = typeof window !== 'undefined' ? atob(base64Str) : Buffer.from(base64Str, 'base64').toString('utf-8');
      } catch (e) {
        return { isValid: false, error: 'Invalid Base64 Data URI encoding.' };
      }
    } else {
      const commaIdx = dataUriOrUrl.indexOf(',');
      if (commaIdx !== -1) {
        rawContent = decodeURIComponent(dataUriOrUrl.slice(commaIdx + 1));
      }
    }

    if (rawContent) {
      return sanitizeSvgContent(rawContent);
    }
  }

  return { isValid: false, error: 'Unrecognized image URL format. Must be a relative path, HTTP URL, or SVG Data URI.' };
}
