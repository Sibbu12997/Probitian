import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { getAuthorizedAdminEmails } from '../../server';

describe('Admin Security & Authorization', () => {
  it('includes probitianofficial@gmail.com by default', () => {
    const emails = getAuthorizedAdminEmails();
    expect(emails).toContain('probitianofficial@gmail.com');
  });

  it('normalizes admin emails to lowercase and removes whitespace', () => {
    process.env.ADMIN_EMAILS = ' Shivam.Official@example.com , ADMIN@probitian.com ';
    const emails = getAuthorizedAdminEmails();
    expect(emails).toContain('shivam.official@example.com');
    expect(emails).toContain('admin@probitian.com');
    expect(emails).toContain('probitianofficial@gmail.com');
  });

  it('performs timing-safe cryptographic comparisons correctly', () => {
    const constantTimeCompare = (a: string, b: string): boolean => {
      if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
      const hashA = crypto.createHash('sha256').update(a).digest();
      const hashB = crypto.createHash('sha256').update(b).digest();
      return crypto.timingSafeEqual(hashA, hashB);
    };

    const secret = 'super-secret-admin-passkey-12345';
    expect(constantTimeCompare(secret, secret)).toBe(true);
    expect(constantTimeCompare(secret, 'wrong-passkey')).toBe(false);
    expect(constantTimeCompare(secret, '')).toBe(false);
    expect(constantTimeCompare('abc', 'abcd')).toBe(false);
  });
});
