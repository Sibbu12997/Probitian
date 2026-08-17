import { describe, it, expect } from 'vitest';
import { validateUrl } from '../lib/urlValidator';

describe('Central URL Validator', () => {
  it('allows valid HTTPS and HTTP URLs', () => {
    const resHttps = validateUrl('https://probitian.ai.studio/');
    expect(resHttps.valid).toBe(true);
    expect(resHttps.normalized).toBe('https://probitian.ai.studio/');

    const resHttp = validateUrl('http://example.com/demo');
    expect(resHttp.valid).toBe(true);
  });

  it('allows valid relative paths and anchor fragments', () => {
    const resRel = validateUrl('/projects/my-project');
    expect(resRel.valid).toBe(true);
    expect(resRel.normalized).toBe('/projects/my-project');

    const resHash = validateUrl('#contact');
    expect(resHash.valid).toBe(true);
    expect(resHash.normalized).toBe('#contact');
  });

  it('blocks dangerous protocol schemes', () => {
    expect(validateUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateUrl('JAVASCRIPT:alert(1)').valid).toBe(false);
    expect(validateUrl('  javascript:void(0)').valid).toBe(false);
    expect(validateUrl('data:text/html,<script>alert(1)</script>').valid).toBe(false);
    expect(validateUrl('vbscript:msgbox(1)').valid).toBe(false);
    expect(validateUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateUrl('blob:http://example.com/uuid').valid).toBe(false);
  });

  it('blocks protocol-relative URLs starting with //', () => {
    expect(validateUrl('//evil.com/phishing').valid).toBe(false);
  });

  it('blocks control characters and null bytes', () => {
    expect(validateUrl('https://example.com\x00/test').valid).toBe(false);
    expect(validateUrl('https://example.com\x07/test').valid).toBe(false);
  });

  it('handles allowMailto properly', () => {
    const withoutMailto = validateUrl('mailto:user@example.com', { allowMailto: false });
    expect(withoutMailto.valid).toBe(false);

    const withMailto = validateUrl('mailto:user@example.com', { allowMailto: true });
    expect(withMailto.valid).toBe(true);
    expect(withMailto.normalized).toBe('mailto:user@example.com');
  });

  it('handles allowEmpty properly', () => {
    expect(validateUrl('', { allowEmpty: false }).valid).toBe(false);
    expect(validateUrl('', { allowEmpty: true }).valid).toBe(true);
  });
});
