import DOMPurify from 'isomorphic-dompurify';

export function sanitizeSvg(svgContent: string): string {
  const sanitized = DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use', 'defs', 'clipPath', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'mask'],
    ADD_ATTR: ['id', 'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'transform', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'opacity', 'offset', 'stop-color', 'stop-opacity', 'xlink:href', 'href']
  });
  return typeof sanitized === 'string' ? sanitized : '';
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
  mimeType: string,
  extension: string = ''
): { valid: boolean; detectedMime?: string; error?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'File is empty or too small to verify signature.' };
  }

  const magicHex = buffer.subarray(0, 8).toString('hex').toLowerCase();

  // PNG
  if (magicHex.startsWith('89504e470d0a1a0a')) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // JPEG / JPG
  if (magicHex.startsWith('ffd8ff')) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // GIF
  if (magicHex.startsWith('474946383761') || magicHex.startsWith('474946383961')) {
    return { valid: true, detectedMime: 'image/gif' };
  }

  // WebP (RIFF....WEBP)
  if (magicHex.startsWith('52494646') && buffer.length >= 12) {
    const format = buffer.subarray(8, 12).toString('ascii');
    if (format === 'WEBP') {
      return { valid: true, detectedMime: 'image/webp' };
    }
  }

  // PDF (%PDF)
  if (magicHex.startsWith('25504446')) {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // MP4 (....ftyp)
  if (buffer.length >= 12) {
    const ftyp = buffer.subarray(4, 8).toString('ascii');
    if (ftyp === 'ftyp') {
      return { valid: true, detectedMime: 'video/mp4' };
    }
  }

  // SVG Check
  if (extension.toLowerCase() === '.svg' || mimeType === 'image/svg+xml') {
    const headerStr = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('utf-8').trim();
    if (headerStr.includes('<svg') || (headerStr.startsWith('<?xml') && headerStr.includes('<svg'))) {
      const lower = buffer.toString('utf-8').toLowerCase();
      if (
        lower.includes('<script') ||
        lower.includes('javascript:') ||
        lower.includes('onload=') ||
        lower.includes('onerror=') ||
        lower.includes('xlink:href="javascript:')
      ) {
        return { valid: false, error: 'SVG contains disallowed executable scripts or event handlers.' };
      }
      return { valid: true, detectedMime: 'image/svg+xml' };
    }
    return { valid: false, error: 'File claims to be SVG but lacks valid SVG XML root structure.' };
  }

  return { valid: true };
}
