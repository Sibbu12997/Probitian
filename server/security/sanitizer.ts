import DOMPurify from 'isomorphic-dompurify';

export function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') return '';

  let sanitizedText = svgContent.trim();

  // 1. Strip XML DOCTYPE and ENTITY declarations to prevent XXE / entity expansion
  sanitizedText = sanitizedText.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  sanitizedText = sanitizedText.replace(/<!ENTITY[\s\S]*?>/gi, '');
  sanitizedText = sanitizedText.replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, '');

  // 2. Strict DOMPurify SVG profile sanitization
  const sanitized = DOMPurify.sanitize(sanitizedText, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use', 'defs', 'clipPath', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'mask', 'filter', 'feGaussianBlur', 'feMerge', 'feMergeNode'],
    ADD_ATTR: ['id', 'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'transform', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'opacity', 'offset', 'stop-color', 'stop-opacity', 'xlink:href', 'href'],
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'foreignObject', 'applet', 'meta',
      'link', 'form', 'base', 'frame', 'frameset', 'input', 'textarea',
      'button', 'select', 'option', 'canvas', 'video', 'audio', 'source'
    ],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style', 'formaction', 'action'],
    ALLOW_DATA_ATTR: false
  });

  let result = typeof sanitized === 'string' ? sanitized : '';

  // 3. Post-sanitization cleanup of dangerous URL schemes and residual on* handlers
  result = result.replace(/(href|src|xlink:href)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '$1="#"');
  result = result.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  return result;
}

export const sanitizeSvgString = sanitizeSvg;

export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function validateFileSignature(
  buffer: Buffer,
  mimeType: string = '',
  extension: string = ''
): { valid: boolean; detectedMime?: string; error?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'File is empty or too small to verify signature.' };
  }

  // 1. Block executable and script signatures
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, error: 'Executable binary files (PE/DOS MZ) are strictly prohibited.' };
  }

  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { valid: false, error: 'Executable binary files (ELF) are strictly prohibited.' };
  }

  if (buffer.length >= 4 && buffer[0] === 0xca && buffer[1] === 0xfe && buffer[2] === 0xba && buffer[3] === 0xbe) {
    return { valid: false, error: 'Compiled binary class files are strictly prohibited.' };
  }

  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return { valid: false, error: 'Shell scripts are strictly prohibited.' };
  }

  const textSample = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf-8').toLowerCase();
  if (textSample.includes('<?php') || textSample.includes('<?=')) {
    return { valid: false, error: 'PHP script files are strictly prohibited.' };
  }

  if (textSample.includes('<script') || textSample.includes('<html') || textSample.includes('<!doctype html')) {
    if (mimeType !== 'image/svg+xml' && extension.toLowerCase() !== '.svg') {
      return { valid: false, error: 'HTML/Script documents masquerading as media are prohibited.' };
    }
  }

  const magicHex = buffer.subarray(0, 8).toString('hex').toLowerCase();
  let detectedMime: string | undefined;

  // 2. Detect genuine media signatures
  // PNG: \x89PNG\r\n\x1a\n
  if (magicHex.startsWith('89504e470d0a1a0a')) {
    detectedMime = 'image/png';
  }
  // JPEG / JPG: \xFF\xD8\xFF
  else if (magicHex.startsWith('ffd8ff')) {
    detectedMime = 'image/jpeg';
  }
  // GIF: GIF87a or GIF89a
  else if (magicHex.startsWith('474946383761') || magicHex.startsWith('474946383961')) {
    detectedMime = 'image/gif';
  }
  // WebP: RIFF....WEBP
  else if (magicHex.startsWith('52494646') && buffer.length >= 12) {
    const riffType = buffer.subarray(8, 12).toString('ascii');
    if (riffType === 'WEBP') {
      detectedMime = 'image/webp';
    }
  }
  // PDF: %PDF-
  else if (magicHex.startsWith('25504446')) {
    detectedMime = 'application/pdf';
  }
  // MP4: ....ftyp
  else if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    detectedMime = 'video/mp4';
  }
  // SVG
  else if (extension.toLowerCase() === '.svg' || mimeType === 'image/svg+xml' || textSample.includes('<svg')) {
    const fullText = buffer.toString('utf-8');
    const lower = fullText.toLowerCase();

    if (lower.includes('<svg') && (lower.includes('</svg>') || lower.includes('/>') || lower.includes('>'))) {
      if (lower.includes('<!entity')) {
        return { valid: false, error: 'SVG contains disallowed XML entity declarations (XXE).' };
      }
      detectedMime = 'image/svg+xml';
    } else {
      return { valid: false, error: 'File claims to be SVG but lacks valid SVG XML structure.' };
    }
  }

  // 3. Strict verification: if no valid signature was matched, reject the file
  if (!detectedMime) {
    return { valid: false, error: 'Unsupported file format or invalid file binary signature.' };
  }

  // 4. Validate claimed MIME against detected MIME if specified
  const normClaimedMime = mimeType ? mimeType.toLowerCase().trim() : '';
  if (normClaimedMime && normClaimedMime !== detectedMime) {
    // Normalization for jpeg / jpg
    const isJpegMatch = (normClaimedMime === 'image/jpg' || normClaimedMime === 'image/pjpeg') && detectedMime === 'image/jpeg';
    if (!isJpegMatch) {
      return {
        valid: false,
        error: `MIME type mismatch: Claimed "${normClaimedMime}" does not match detected binary signature "${detectedMime}".`
      };
    }
  }

  return { valid: true, detectedMime };
}

