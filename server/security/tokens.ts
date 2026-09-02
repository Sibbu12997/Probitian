import crypto from 'crypto';

function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.SESSION_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }
  return 'probitian-unsub-token-key-2026';
}

export function generateUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase().trim();
  const hmac = crypto.createHmac('sha256', getUnsubscribeSecret());
  hmac.update(`unsub:${normalized}`);
  const hash = hmac.digest('hex').substring(0, 32);
  const encodedEmail = Buffer.from(normalized).toString('base64url');
  return `${encodedEmail}.${hash}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedEmail, hash] = parts;
    const email = Buffer.from(encodedEmail, 'base64url').toString('utf-8');
    const expected = generateUnsubscribeToken(email);
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return email;
    }
  } catch (e) {
    return null;
  }
  return null;
}
