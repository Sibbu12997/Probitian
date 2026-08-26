import DOMPurify from 'isomorphic-dompurify';

/**
 * SVG Sanitizer & Security Validator
 * Protects against XSS attacks, malicious scripts, XXE entities, and invalid markup
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
  if (!trimmed.toLowerCase().includes('<svg') || !trimmed.toLowerCase().includes('</svg>')) {
    return { isValid: false, error: 'Invalid SVG structure: Missing <svg> root element.' };
  }

  try {
    let sanitizedText = trimmed;

    // 1. Strip XML DOCTYPE and ENTITY declarations to prevent XXE / entity expansion
    sanitizedText = sanitizedText.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
    sanitizedText = sanitizedText.replace(/<!ENTITY[\s\S]*?>/gi, '');
    sanitizedText = sanitizedText.replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, '');

    // 2. Parser-backed DOMPurify sanitization with strict SVG profile
    sanitizedText = DOMPurify.sanitize(sanitizedText, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ['use', 'linearGradient', 'radialGradient', 'stop', 'filter', 'feGaussianBlur', 'feMerge', 'feMergeNode'],
      FORBID_TAGS: [
        'script', 'iframe', 'object', 'embed', 'foreignObject', 'applet', 'meta',
        'link', 'form', 'base', 'frame', 'frameset', 'input', 'textarea',
        'button', 'select', 'option', 'canvas', 'video', 'audio', 'source'
      ],
      FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style', 'formaction', 'action'],
      ALLOW_DATA_ATTR: false
    });

    // 3. Post-sanitization safety checks against dangerous schemes and residual active markup
    sanitizedText = sanitizedText.replace(/(href|src|xlink:href)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '$1="#"');
    sanitizedText = sanitizedText.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    if (!sanitizedText.toLowerCase().includes('<svg') || !sanitizedText.toLowerCase().includes('</svg>')) {
      return { isValid: false, error: 'SVG markup contains prohibited active content or was completely stripped.' };
    }

    // 4. DOMParser check if running in browser
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
