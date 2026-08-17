import { describe, it, expect } from 'vitest';
import { sanitizeSvgContent, validateSvgDataUri } from '../lib/svgSanitizer';

describe('SVG Sanitizer', () => {
  it('strips <script> tags from SVG', () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
      <script>alert('xss')</script>
    </svg>`;

    const result = sanitizeSvgContent(maliciousSvg);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedSvg).not.toContain('<script>');
    expect(result.sanitizedSvg).not.toContain("alert('xss')");
  });

  it('strips inline event handlers (onload, onerror, onclick)', () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" onclick="stealCookies()">
      <circle cx="50" cy="50" r="40" onerror="alert(2)" />
    </svg>`;

    const result = sanitizeSvgContent(maliciousSvg);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedSvg).not.toContain('onload');
    expect(result.sanitizedSvg).not.toContain('onclick');
    expect(result.sanitizedSvg).not.toContain('onerror');
  });

  it('neutralizes dangerous javascript: href schemes', () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg">
      <a href="javascript:alert(1)"><text>Click me</text></a>
    </svg>`;

    const result = sanitizeSvgContent(maliciousSvg);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedSvg).not.toContain('javascript:alert(1)');
    expect(result.sanitizedSvg).toContain('href="#"');
  });

  it('rejects malformed non-SVG content', () => {
    const notSvg = '<div>Hello World</div>';
    const result = sanitizeSvgContent(notSvg);
    expect(result.isValid).toBe(false);
  });

  it('validates SVG data URIs correctly', () => {
    const validDataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg><circle cx="10" cy="10" r="5"/></svg>');
    const result = validateSvgDataUri(validDataUri);
    expect(result.isValid).toBe(true);
  });
});
