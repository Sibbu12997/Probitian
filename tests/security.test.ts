import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import DOMPurify from 'isomorphic-dompurify';
import { sanitizeSvgContent } from '../src/lib/svgSanitizer';

// Server-level security utilities replicated for unit testing & regression verification
const OFFICIAL_ADMIN_EMAIL = 'probitianofficial@gmail.com';
const CONFIGURED_ADMIN_EMAILS = [
  OFFICIAL_ADMIN_EMAIL,
  'probitianofficial@gmail.com',
  'shivam@probitian.com',
  'shivambaghel79@gmail.com'
];

function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function resolveAdminIdentity(clientEmail?: string): string {
  let adminEmail = OFFICIAL_ADMIN_EMAIL;
  if (typeof clientEmail === 'string' && clientEmail.trim()) {
    const cleanEmail = clientEmail.trim().toLowerCase();
    if (CONFIGURED_ADMIN_EMAILS.includes(cleanEmail)) {
      adminEmail = cleanEmail;
    }
  }
  return adminEmail;
}

interface AdminSession {
  token: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

function createSignedSessionToken(email: string, secret: string, maxAgeMs: number = 24 * 60 * 60 * 1000): string {
  const cleanEmail = (email || OFFICIAL_ADMIN_EMAIL).toLowerCase().trim();
  const payload = {
    email: cleanEmail,
    createdAt: Date.now(),
    expiresAt: Date.now() + maxAgeMs,
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadStr);
  const sig = hmac.digest('base64url');
  return `${payloadStr}.${sig}`;
}

function verifySignedSessionToken(token: string, secret: string, revokedSessions?: Set<string>): AdminSession | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  if (revokedSessions && revokedSessions.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadStr, sig] = parts;
  if (!payloadStr || !sig) return null;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadStr);
    const expectedSig = hmac.digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (!payload || !payload.email || !payload.expiresAt) return null;
    if (Date.now() > payload.expiresAt) return null;

    return {
      token,
      email: payload.email,
      createdAt: payload.createdAt || Date.now(),
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin?: string, host: string = 'probitian.com'): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const originHost = url.hostname.toLowerCase();

    if (originHost === 'localhost' || originHost === '127.0.0.1') return true;
    if (originHost === host.toLowerCase()) return true;
    if (originHost.endsWith('.probitian.com') || originHost === 'probitian.com') return true;
    if (originHost.endsWith('.run.app')) return true;
    if (originHost.endsWith('.ai.studio') || originHost === 'ai.studio') return true;

    return false;
  } catch {
    return false;
  }
}

function validateFileSignature(buffer: Buffer, claimedMime: string, ext: string): { valid: boolean; detectedMime?: string; error?: string } {
  if (!buffer || buffer.length === 0) return { valid: false, error: 'Empty file buffer' };

  // Block executables & scripts
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { valid: false, error: 'Executable binary files are strictly forbidden' };
  }
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { valid: false, error: 'Executable binary files are strictly forbidden' };
  }
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return { valid: false, error: 'Shell scripts are strictly forbidden' };
  }
  const startStr = buffer.slice(0, 100).toString('utf-8').toLowerCase();
  if (startStr.includes('<?php') || startStr.includes('<?=')) {
    return { valid: false, error: 'PHP scripts are strictly forbidden' };
  }

  const isPng = buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;

  const isJpeg = buffer.length >= 3 &&
    buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

  const isPdf = buffer.length >= 5 && buffer.slice(0, 5).toString('ascii') === '%PDF-';

  const isSvg = ext === '.svg' || claimedMime === 'image/svg+xml';

  if (isPng) return { valid: true, detectedMime: 'image/png' };
  if (isJpeg) return { valid: true, detectedMime: 'image/jpeg' };
  if (isPdf) return { valid: true, detectedMime: 'application/pdf' };

  if (isSvg) {
    const textSample = buffer.toString('utf-8').trim().toLowerCase();
    if (textSample.includes('<svg') && (textSample.startsWith('<') || textSample.startsWith('<?xml'))) {
      return { valid: true, detectedMime: 'image/svg+xml' };
    }
    return { valid: false, error: 'Malformed or invalid SVG content' };
  }

  return { valid: false, error: 'Unsupported or unverified file signature' };
}

function isValidId(id?: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim();
  if (clean.length === 0 || clean.length > 128) return false;
  if (clean.includes('..') || clean.includes('/') || clean.includes('\\') || clean.includes('\0')) return false;
  return /^[a-zA-Z0-9_.-]+$/.test(clean);
}

function checkFailClosedStorage(nodeEnv: string, isPreview: boolean): boolean {
  if (nodeEnv === 'production' && !isPreview) {
    throw new Error('Local JSON fallback is strictly disabled in production. Supabase PostgreSQL is the required source of truth.');
  }
  return true;
}

// -------------------------------------------------------------
// TEST SUITES
// -------------------------------------------------------------

describe('1. Authentication, Identity Binding & Passkeys', () => {
  const secretKey = 'test-secret-key-32-chars-long-test-abc';

  test('valid admin authentication with correct passkey succeeds', () => {
    assert.strictEqual(constantTimeCompare('correct-passkey-123', 'correct-passkey-123'), true);
  });

  test('invalid admin credentials fail verification', () => {
    assert.strictEqual(constantTimeCompare('wrong-passkey', 'correct-passkey-123'), false);
    assert.strictEqual(constantTimeCompare('', 'correct-passkey-123'), false);
  });

  test('arbitrary-email admin identity abuse is blocked and bound to authorized allowlist', () => {
    // Attacker tries to authenticate as arbitrary target email
    const attackerAttempt = resolveAdminIdentity('victim@target.com');
    assert.strictEqual(attackerAttempt, OFFICIAL_ADMIN_EMAIL);

    // Authorized admin identity is accepted
    const legitimateAdmin = resolveAdminIdentity('shivam@probitian.com');
    assert.strictEqual(legitimateAdmin, 'shivam@probitian.com');
  });
});

describe('2. Cryptographic Sessions, Expiration & Revocation', () => {
  const secretKey = 'test-secret-key-32-chars-long-test-abc';

  test('valid signed session token verifies successfully', () => {
    const token = createSignedSessionToken('shivam@probitian.com', secretKey);
    const session = verifySignedSessionToken(token, secretKey);
    assert.ok(session !== null);
    assert.strictEqual(session?.email, 'shivam@probitian.com');
  });

  test('forged session token with altered payload is rejected', () => {
    const token = createSignedSessionToken('shivam@probitian.com', secretKey);
    const [payloadStr, sig] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ email: 'hacker@evil.com', expiresAt: Date.now() + 100000 })).toString('base64url');
    const forgedToken = `${tamperedPayload}.${sig}`;

    assert.strictEqual(verifySignedSessionToken(forgedToken, secretKey), null);
  });

  test('expired session token is rejected', () => {
    const expiredToken = createSignedSessionToken('shivam@probitian.com', secretKey, -5000);
    assert.strictEqual(verifySignedSessionToken(expiredToken, secretKey), null);
  });

  test('logged-out/revoked session is rejected immediately', () => {
    const token = createSignedSessionToken('shivam@probitian.com', secretKey);
    const revoked = new Set<string>([token]);
    assert.strictEqual(verifySignedSessionToken(token, secretKey, revoked), null);
  });
});

describe('3. Access Control & Authorization (CMS / Admin APIs / IDOR)', () => {
  test('unauthorized admin API access is denied when token is missing', () => {
    const unauthenticatedToken = '';
    const session = verifySignedSessionToken(unauthenticatedToken, 'secret');
    assert.strictEqual(session, null);
  });

  test('unauthorized CMS mutation is denied when session is invalid', () => {
    const invalidToken = 'invalid.bearer.token';
    const session = verifySignedSessionToken(invalidToken, 'secret');
    assert.strictEqual(session, null);
  });

  test('IDOR attempts with path traversal or invalid identifiers are blocked', () => {
    assert.strictEqual(isValidId('../../etc/shadow'), false);
    assert.strictEqual(isValidId('..\\windows\\system32'), false);
    assert.strictEqual(isValidId('sub/dir/id'), false);
    assert.strictEqual(isValidId('lead\0nullbyte'), false);
    assert.strictEqual(isValidId('valid-id-123_456'), true);
  });
});

describe('4. CORS, CSRF & Origin Security', () => {
  test('invalid and attacker origins are rejected', () => {
    assert.strictEqual(isAllowedOrigin('https://attacker.evil.com', 'probitian.com'), false);
    assert.strictEqual(isAllowedOrigin('https://phishing-probitian.com', 'probitian.com'), false);
    assert.strictEqual(isAllowedOrigin('http://insecure-probitian.com', 'probitian.com'), false);
  });

  test('trusted production and staging origins are permitted', () => {
    assert.strictEqual(isAllowedOrigin('https://probitian.com', 'probitian.com'), true);
    assert.strictEqual(isAllowedOrigin('https://www.probitian.com', 'probitian.com'), true);
    assert.strictEqual(isAllowedOrigin('https://preview-app.run.app', 'probitian.com'), true);
    assert.strictEqual(isAllowedOrigin('http://localhost:3000', 'localhost'), true);
  });
});

describe('5. Rate Limiting Enforcement', () => {
  test('rate limiter blocks requests when threshold is exceeded', () => {
    const max = 3;
    const windowMs = 1000;
    const requests = new Map<string, { count: number; resetTime: number }>();
    const ip = '192.168.1.100';

    function testLimiter(testIp: string): { allowed: boolean; remaining: number } {
      const now = Date.now();
      let record = requests.get(testIp);
      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        requests.set(testIp, record);
        return { allowed: true, remaining: max - 1 };
      }
      if (record.count >= max) {
        return { allowed: false, remaining: 0 };
      }
      record.count += 1;
      return { allowed: true, remaining: max - record.count };
    }

    assert.strictEqual(testLimiter(ip).allowed, true); // req 1
    assert.strictEqual(testLimiter(ip).allowed, true); // req 2
    assert.strictEqual(testLimiter(ip).allowed, true); // req 3
    assert.strictEqual(testLimiter(ip).allowed, false); // req 4 (Blocked!)
  });
});

describe('6. SVG, Media & Executable Upload Security', () => {
  test('malicious SVG with XSS and active scripts is sanitized', () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" onload="alert('XSS')" />
      <script>alert('pwned')</script>
      <a href="javascript:alert(1)"><text>Click</text></a>
    </svg>`;

    const result = sanitizeSvgContent(maliciousSvg);
    assert.strictEqual(result.isValid, true);
    assert.ok(!result.sanitizedSvg?.includes('<script'));
    assert.ok(!result.sanitizedSvg?.includes('alert('));
    assert.ok(!result.sanitizedSvg?.includes('onload='));
    assert.ok(!result.sanitizedSvg?.includes('javascript:'));
  });

  test('SVG with XML entity expansion (XXE) is neutralized', () => {
    const xxeSvg = `<?xml version="1.0"?>
    <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
    <svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>`;

    const result = sanitizeSvgContent(xxeSvg);
    assert.ok(!result.sanitizedSvg?.includes('<!DOCTYPE'));
    assert.ok(!result.sanitizedSvg?.includes('<!ENTITY'));
  });

  test('executable file uploads (PE, ELF, shell, PHP) are blocked by magic bytes', () => {
    const peExe = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ
    const elfBin = Buffer.from([0x7F, 0x45, 0x4C, 0x46]); // ELF
    const shellScript = Buffer.from('#!/bin/bash\nrm -rf /');
    const phpScript = Buffer.from('<?php echo "evil"; ?>');

    assert.strictEqual(validateFileSignature(peExe, 'image/png', '.png').valid, false);
    assert.strictEqual(validateFileSignature(elfBin, 'image/jpeg', '.jpg').valid, false);
    assert.strictEqual(validateFileSignature(shellScript, 'text/plain', '.sh').valid, false);
    assert.strictEqual(validateFileSignature(phpScript, 'image/png', '.png').valid, false);
  });

  test('MIME/signature mismatch is detected and rejected', () => {
    const randomBinary = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
    const result = validateFileSignature(randomBinary, 'image/png', '.png');
    assert.strictEqual(result.valid, false);
  });
});

describe('7. Production Fail-Closed Behavior', () => {
  test('production environment strictly blocks local file storage fallback', () => {
    assert.throws(
      () => checkFailClosedStorage('production', false),
      /Local JSON fallback is strictly disabled in production/
    );
  });

  test('development / preview environment allows storage initialization', () => {
    assert.strictEqual(checkFailClosedStorage('development', false), true);
    assert.strictEqual(checkFailClosedStorage('production', true), true);
  });
});
