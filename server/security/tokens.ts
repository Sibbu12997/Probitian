import crypto from 'crypto';

/**
 * Validate the dedicated unsubscribe signing secret.
 * Production startup must fail before listening if it is missing or weak.
 */
export function validateUnsubscribeSecretConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.UNSUBSCRIBE_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(
      'UNSUBSCRIBE_SECRET must be configured with a strong value (minimum 32 bytes) in production.'
    );
  }
}

/**
 * Uses only the dedicated server-side secret. Never falls back to SESSION_SECRET
 * or a hardcoded value. Local/test callers must explicitly configure a secret.
 */
export function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(
      'UNSUBSCRIBE_SECRET must be configured with a strong value (minimum 32 bytes).'
    );
  }
  return secret;
}

/**
 * Format remains <base64url(normalizedEmail)>.<32-character hex HMAC>,
 * preserving compatibility for tokens signed with the same secret.
 */
export function generateUnsubscribeToken(email: string): string {
  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('A valid email is required to generate an unsubscribe token.');
  }

  const normalized = email.toLowerCase().trim();
  const hmac = crypto.createHmac('sha256', getUnsubscribeSecret());
  hmac.update(`unsub:${normalized}`);

  const hash = hmac.digest('hex').substring(0, 32);
  const encodedEmail = Buffer.from(normalized, 'utf8').toString('base64url');
  return `${encodedEmail}.${hash}`;
}

/**
 * Returns the normalized email only when the token is well-formed and its
 * HMAC matches. All malformed input and configuration failures fail closed.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    if (typeof token !== 'string' || !token) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedEmail, suppliedHash] = parts;
    if (
      !encodedEmail ||
      !/^[A-Za-z0-9_-]+$/.test(encodedEmail) ||
      !/^[a-f0-9]{32}$/.test(suppliedHash)
    ) {
      return null;
    }

    const email = Buffer.from(encodedEmail, 'base64url').toString('utf8');
    if (!email || email !== email.toLowerCase().trim() || !email.includes('@')) {
      return null;
    }

    // Reject non-canonical Base64URL encodings.
    if (Buffer.from(email, 'utf8').toString('base64url') !== encodedEmail) {
      return null;
    }

    const hmac = crypto.createHmac('sha256', getUnsubscribeSecret());
    hmac.update(`unsub:${email}`);
    const expectedHash = hmac.digest('hex').substring(0, 32);

    const supplied = Buffer.from(suppliedHash, 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      return null;
    }

    return email;
  } catch {
    return null;
  }
}
