import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { getAuthorizedAdminEmails, getSessionSecret, getUnsubscribeSecret } from '../../server';

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

  it('validates HMAC session token creation and verification with expiration', () => {
    const secret = getSessionSecret();
    const email = 'probitianofficial@gmail.com';
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const sessionPayload = `${email}:${expiresAt}`;
    const hmacSig = crypto.createHmac('sha256', secret).update(sessionPayload).digest('hex');
    const fullToken = `${sessionPayload}:${hmacSig}`;

    // Verification helper
    const verifyToken = (token: string, key: string) => {
      const parts = token.split(':');
      if (parts.length !== 3) return null;
      const [tokenEmail, tokenExpiresStr, tokenSig] = parts;
      const tokenExpires = parseInt(tokenExpiresStr, 10);
      if (isNaN(tokenExpires) || Date.now() > tokenExpires) return null;

      const expectedSig = crypto.createHmac('sha256', key).update(`${tokenEmail}:${tokenExpiresStr}`).digest('hex');
      const sigBuffer = Buffer.from(tokenSig);
      const expectedBuffer = Buffer.from(expectedSig);
      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return null;
      }
      return tokenEmail;
    };

    // Valid token
    expect(verifyToken(fullToken, secret)).toBe(email);

    // Tampered email
    const tamperedEmailToken = `hacker@evil.com:${expiresAt}:${hmacSig}`;
    expect(verifyToken(tamperedEmailToken, secret)).toBeNull();

    // Tampered expiration
    const tamperedExpToken = `${email}:${expiresAt + 10000}:${hmacSig}`;
    expect(verifyToken(tamperedExpToken, secret)).toBeNull();

    // Expired token
    const expiredPayload = `${email}:${Date.now() - 1000}`;
    const expiredSig = crypto.createHmac('sha256', secret).update(expiredPayload).digest('hex');
    const expiredToken = `${expiredPayload}:${expiredSig}`;
    expect(verifyToken(expiredToken, secret)).toBeNull();
  });

  it('validates signed unsubscribe tokens securely', () => {
    const secret = getUnsubscribeSecret();
    const testEmail = 'subscriber@example.com';
    const sig = crypto.createHmac('sha256', secret).update(testEmail.toLowerCase().trim()).digest('hex');
    const token = `${testEmail}:${sig}`;

    const verifyUnsub = (tok: string, key: string) => {
      const colonIdx = tok.lastIndexOf(':');
      if (colonIdx <= 0) return null;
      const email = tok.substring(0, colonIdx);
      const providedSig = tok.substring(colonIdx + 1);
      const expectedSig = crypto.createHmac('sha256', key).update(email.toLowerCase().trim()).digest('hex');
      if (providedSig.length !== expectedSig.length) return null;
      if (!crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))) return null;
      return email;
    };

    expect(verifyUnsub(token, secret)).toBe(testEmail);
    expect(verifyUnsub(`other@example.com:${sig}`, secret)).toBeNull();
    expect(verifyUnsub(`invalid-token-format`, secret)).toBeNull();
  });
});

