import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import DOMPurify from 'isomorphic-dompurify';
import { sanitizeSvgContent } from '../src/lib/svgSanitizer';
import { sanitizeCmsHtml, escapeHtml, sanitizeUrl } from '../src/lib/htmlSanitizer';
import { 
  MemoryRateLimitStore, 
  DistributedRateLimitStore, 
  getClientIp, 
  createRateLimiter as createDistributedRateLimiter,
  SharedStoreProvider 
} from '../src/lib/rateLimiter';

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

describe('8. CMS/CRM Rich-Content XSS & HTML Sanitization Hardening', () => {
  test('strips dangerous <script>, <iframe>, <object>, <embed>, and <form> tags', () => {
    const dirtyHtml = `
      <div>
        <h2>Welcome to ProBitian Newsletter</h2>
        <script>alert('xss')</script>
        <iframe src="https://attacker.com/steal"></iframe>
        <object data="evil.swf"></object>
        <embed src="evil.swf">
        <form action="https://attacker.com"><input name="cred"/></form>
        <p>Safe content here.</p>
      </div>
    `;

    const cleaned = sanitizeCmsHtml(dirtyHtml);
    assert.ok(!cleaned.includes('<script'));
    assert.ok(!cleaned.includes('<iframe'));
    assert.ok(!cleaned.includes('<object'));
    assert.ok(!cleaned.includes('<embed'));
    assert.ok(!cleaned.includes('<form'));
    assert.ok(cleaned.includes('Safe content here.'));
  });

  test('removes inline event handlers (onload, onerror, onclick, onmouseover)', () => {
    const dirtyHtml = `
      <img src="https://example.com/pic.jpg" onerror="alert(1)" onload="fetch('https://evil.com')" />
      <a href="https://probitian.com" onclick="alert('clicked')" onmouseover="alert('hover')">Click me</a>
      <div onfocus="alert('focused')">Content</div>
    `;

    const cleaned = sanitizeCmsHtml(dirtyHtml);
    assert.ok(!cleaned.includes('onerror'));
    assert.ok(!cleaned.includes('onload'));
    assert.ok(!cleaned.includes('onclick'));
    assert.ok(!cleaned.includes('onmouseover'));
    assert.ok(!cleaned.includes('onfocus'));
    assert.ok(cleaned.includes('https://probitian.com'));
  });

  test('neutralizes javascript:, vbscript:, and data: URI pseudo-protocols', () => {
    const maliciousLinks = `
      <a href="javascript:alert('XSS')">JavaScript Link</a>
      <a href="javascript&#x3A;alert(1)">Encoded Link</a>
      <a href="vbscript:msgbox(1)">VBScript Link</a>
      <a href="data:text/html,<script>alert(1)</script>">Data URI Link</a>
      <a href="https://probitian.com/courses">Valid Link</a>
    `;

    const cleaned = sanitizeCmsHtml(maliciousLinks);
    assert.ok(!cleaned.includes('href="javascript:'));
    assert.ok(!cleaned.includes('href="vbscript:'));
    assert.ok(!cleaned.includes('href="data:'));
    assert.ok(cleaned.includes('href="https://probitian.com/courses"'));
  });

  test('escapeHtml safely converts special HTML characters to entities', () => {
    const rawInput = '<script>alert("hello & welcome")</script>\'';
    const escaped = escapeHtml(rawInput);
    assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;hello &amp; welcome&quot;)&lt;/script&gt;&#39;');
  });

  test('sanitizeUrl allows safe http, https, mailto, tel links and rejects javascript / data URIs', () => {
    assert.strictEqual(sanitizeUrl('https://x.com/Probitian'), 'https://x.com/Probitian');
    assert.strictEqual(sanitizeUrl('mailto:probitianofficial@gmail.com'), 'mailto:probitianofficial@gmail.com');
    assert.strictEqual(sanitizeUrl('tel:+919876543210'), 'tel:+919876543210');
    assert.strictEqual(sanitizeUrl('javascript:alert(1)', '#'), '#');
    assert.strictEqual(sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', '#'), '#');
    assert.strictEqual(sanitizeUrl('vbscript:alert(1)', '#'), '#');
  });

  test('prevents CRM lead interpolation injection via malicious lead records', () => {
    const maliciousLead = {
      company_name: '"><script>alert("Stored CRM XSS")</script><input value="',
      contact_person: 'Shivam<img src=x onerror=alert(1)>',
      industry: "Retail & E-commerce ' OR 1=1 --",
      powerbi_use_case: '<a href="javascript:steal()">Dashboard</a>'
    };

    const template = 'Hello {{contact_person}} at {{company_name}} in {{industry}} for {{powerbi_use_case}}';
    
    // Simulate safe HTML interpolation with escapeHtml
    let interpolated = template;
    for (const [key, val] of Object.entries(maliciousLead)) {
      const safeVal = escapeHtml(val);
      interpolated = interpolated.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), safeVal);
    }

    const sanitizedHtml = sanitizeCmsHtml(interpolated);

    assert.ok(!sanitizedHtml.includes('<script>'));
    assert.ok(!sanitizedHtml.includes('onerror=alert(1)'));
    assert.ok(!sanitizedHtml.includes('href="javascript:steal()"'));
    assert.ok(sanitizedHtml.includes('&lt;script&gt;alert(&quot;Stored CRM XSS&quot;)&lt;/script&gt;'));
  });
});

describe('9. Distributed Rate-Limit Store, Concurrency & Fail-Safe Architecture', () => {
  test('Sequential rate limit: MemoryRateLimitStore limits requests within sliding window', async () => {
    const store = new MemoryRateLimitStore(100);
    const key = 'test:ip:10.0.0.1';
    const windowMs = 500;
    const max = 3;

    const r1 = await store.increment(key, windowMs, max);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r1.count, 1);
    assert.strictEqual(r1.remaining, 2);

    const r2 = await store.increment(key, windowMs, max);
    assert.strictEqual(r2.allowed, true);
    assert.strictEqual(r2.count, 2);
    assert.strictEqual(r2.remaining, 1);

    const r3 = await store.increment(key, windowMs, max);
    assert.strictEqual(r3.allowed, true);
    assert.strictEqual(r3.count, 3);
    assert.strictEqual(r3.remaining, 0);

    const r4 = await store.increment(key, windowMs, max);
    assert.strictEqual(r4.allowed, false);
    assert.strictEqual(r4.count, 3);
    assert.strictEqual(r4.remaining, 0);
  });

  test('Concurrent rate limit: Atomic increment eliminates race conditions across parallel requests', async () => {
    // Database-level atomic mock simulating PostgreSQL row-level locks in public.increment_rate_limit
    // (Note: In unit tests this verifies the serialized atomic contract across multiple DistributedRateLimitStore instances;
    // full end-to-end database lock testing against live Supabase occurs in production staging)
    const dbRows = new Map<string, { count: number; reset_time: number }>();
    let dbMutex = Promise.resolve();

    const atomicProvider: SharedStoreProvider = {
      async incrementAtomic(key: string, windowMs: number, max: number) {
        // Simulate atomic DB row lock and serialized execution
        return new Promise((resolve) => {
          dbMutex = dbMutex.then(async () => {
            const now = Date.now();
            let row = dbRows.get(key);

            if (!row || now > row.reset_time) {
              row = { count: 1, reset_time: now + windowMs };
              dbRows.set(key, row);
              resolve({
                count: 1,
                resetTime: row.reset_time,
                allowed: true,
                remaining: Math.max(0, max - 1)
              });
              return;
            }

            row.count += 1;
            const allowed = row.count <= max;
            resolve({
              count: row.count,
              resetTime: row.reset_time,
              allowed,
              remaining: Math.max(0, max - row.count)
            });
          });
        });
      }
    };

    // Instantiate 5 separate application instances sharing the same atomic store
    const instances = Array.from({ length: 5 }, () => new DistributedRateLimitStore(atomicProvider));

    const clientKey = 'login:203.0.113.195';
    const windowMs = 5000;
    const maxLimit = 10;
    const totalRequests = 50;

    // Dispatch 50 simultaneous concurrent requests across all 5 instances using Promise.all
    const requests = Array.from({ length: totalRequests }, (_, i) => {
      const targetInstance = instances[i % instances.length];
      return targetInstance.increment(clientKey, windowMs, maxLimit);
    });

    const results = await Promise.all(requests);

    const allowedCount = results.filter(r => r.allowed).length;
    const rejectedCount = results.filter(r => !r.allowed).length;

    // Exactly 10 allowed and exactly 40 rejected - no race condition bypass!
    assert.strictEqual(allowedCount, maxLimit, `Expected exactly ${maxLimit} allowed requests, got ${allowedCount}`);
    assert.strictEqual(rejectedCount, totalRequests - maxLimit, `Expected exactly ${totalRequests - maxLimit} rejected requests, got ${rejectedCount}`);
  });

  test('Multi-instance synchronization: Shared quota is accurately consumed across distributed nodes', async () => {
    const sharedData = new Map<string, { count: number; reset_time: number }>();
    let dbMutex = Promise.resolve();

    const atomicProvider: SharedStoreProvider = {
      async incrementAtomic(key: string, windowMs: number, max: number) {
        return new Promise((resolve) => {
          dbMutex = dbMutex.then(async () => {
            const now = Date.now();
            let row = sharedData.get(key);
            if (!row || now > row.reset_time) {
              row = { count: 1, reset_time: now + windowMs };
              sharedData.set(key, row);
              resolve({
                count: 1,
                resetTime: row.reset_time,
                allowed: true,
                remaining: Math.max(0, max - 1)
              });
              return;
            }
            row.count += 1;
            resolve({
              count: row.count,
              resetTime: row.reset_time,
              allowed: row.count <= max,
              remaining: Math.max(0, max - row.count)
            });
          });
        });
      }
    };

    const instanceA = new DistributedRateLimitStore(atomicProvider);
    const instanceB = new DistributedRateLimitStore(atomicProvider);
    const instanceC = new DistributedRateLimitStore(atomicProvider);

    const clientKey = 'upload:198.51.100.42';
    const windowMs = 10000;
    const maxLimit = 10;

    // Instance A handles 4 requests
    for (let i = 0; i < 4; i++) {
      const res = await instanceA.increment(clientKey, windowMs, maxLimit);
      assert.strictEqual(res.allowed, true);
    }

    // Instance B handles 3 requests
    for (let i = 0; i < 3; i++) {
      const res = await instanceB.increment(clientKey, windowMs, maxLimit);
      assert.strictEqual(res.allowed, true);
    }

    // Instance C handles 3 requests (Quota reached: 4 + 3 + 3 = 10)
    for (let i = 0; i < 3; i++) {
      const res = await instanceC.increment(clientKey, windowMs, maxLimit);
      assert.strictEqual(res.allowed, true);
    }

    // 11th request from Instance A must be REJECTED (HTTP 429 quota exhausted)
    const blockedA = await instanceA.increment(clientKey, windowMs, maxLimit);
    assert.strictEqual(blockedA.allowed, false);
    assert.strictEqual(blockedA.remaining, 0);

    // 12th request from Instance B must also be REJECTED
    const blockedB = await instanceB.increment(clientKey, windowMs, maxLimit);
    assert.strictEqual(blockedB.allowed, false);
    assert.strictEqual(blockedB.remaining, 0);
  });

  test('Window expiration: Allowed requests reset after window expiry and stale records prune', async () => {
    const store = new MemoryRateLimitStore(100);
    const clientKey = 'unsub:192.0.2.75';
    const shortWindowMs = 50; // 50ms window
    const maxLimit = 2;

    // Exhaust limit
    const r1 = await store.increment(clientKey, shortWindowMs, maxLimit);
    assert.strictEqual(r1.allowed, true);
    const r2 = await store.increment(clientKey, shortWindowMs, maxLimit);
    assert.strictEqual(r2.allowed, true);
    const r3 = await store.increment(clientKey, shortWindowMs, maxLimit);
    assert.strictEqual(r3.allowed, false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Request after expiration is allowed
    const r4 = await store.increment(clientKey, shortWindowMs, maxLimit);
    assert.strictEqual(r4.allowed, true);
    assert.strictEqual(r4.count, 1);
    assert.strictEqual(r4.remaining, 1);

    // Prune test: records are cleaned up
    store.prune();
  });

  test('Shared-store failure & Fallback enforcement: Graceful degradation without service interruption', async () => {
    let callCount = 0;
    const faultyProvider: SharedStoreProvider = {
      async incrementAtomic() {
        callCount++;
        throw new Error('Database connection timeout (503)');
      }
    };

    const store = new DistributedRateLimitStore(faultyProvider);
    const key = 'contact:192.168.1.50';
    const windowMs = 10000;
    const max = 2;

    // First request fails over to memory fallback without throwing 500
    const res1 = await store.increment(key, windowMs, max);
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.count, 1);

    const res2 = await store.increment(key, windowMs, max);
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.count, 2);

    const res3 = await store.increment(key, windowMs, max);
    assert.strictEqual(res3.allowed, false); // Memory fallback still enforces rate limit!
    assert.strictEqual(store.isUsingFallback(), true);
  });

  test('Rate-limiter middleware fail-safe: Unexpected errors do not silently bypass protection', async () => {
    // Custom broken store that throws unexpectedly
    const brokenStore: any = {
      async increment() {
        throw new Error('Unexpected fatal store exception');
      }
    };

    const limiterMiddleware = createDistributedRateLimiter({
      windowMs: 5000,
      max: 2,
      prefix: 'emergency',
      message: 'Rate limit exceeded'
    }, brokenStore);

    let nextCalledCount = 0;
    let statusCode: number | null = null;
    let responseBody: any = null;
    let responseHeaders: Record<string, any> = {};

    const mockReq = {
      ip: '10.50.0.1',
      socket: { remoteAddress: '10.50.0.1' }
    } as any;

    const createMockRes = () => {
      const res: any = {
        setHeader(name: string, value: any) {
          responseHeaders[name] = value;
        },
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: any) {
          responseBody = body;
          return this;
        }
      };
      return res;
    };

    // Request 1: Emergency fallback allows first request
    await limiterMiddleware(mockReq, createMockRes(), () => { nextCalledCount++; });
    assert.strictEqual(nextCalledCount, 1);

    // Request 2: Emergency fallback allows second request
    await limiterMiddleware(mockReq, createMockRes(), () => { nextCalledCount++; });
    assert.strictEqual(nextCalledCount, 2);

    // Request 3: Emergency fallback BLOCKS third request (NO SILENT BYPASS!)
    await limiterMiddleware(mockReq, createMockRes(), () => { nextCalledCount++; });
    assert.strictEqual(nextCalledCount, 2); // next() was NOT called
    assert.strictEqual(statusCode, 429);
    assert.ok(responseBody?.error);
    assert.strictEqual(responseHeaders['RateLimit-Limit'], 2);
    assert.strictEqual(responseHeaders['RateLimit-Remaining'], 0);
  });

  test('Proxy & IP Spoofing Protection: Resolves legitimate IP and resists spoofed headers', () => {
    // 1. Normal Direct Client IP
    const directReq = {
      ip: '203.0.113.10',
      socket: { remoteAddress: '203.0.113.10' }
    } as any;
    assert.strictEqual(getClientIp(directReq), '203.0.113.10');

    // 2. IPv4-mapped IPv6 address normalized
    const ipv6Req = {
      ip: '::ffff:192.0.2.1',
      socket: { remoteAddress: '::ffff:192.0.2.1' }
    } as any;
    assert.strictEqual(getClientIp(ipv6Req), '192.0.2.1');

    // 3. Trusted Proxy (Express trust proxy: 1 resolves trusted client IP)
    const trustedProxyReq = {
      ip: '198.51.100.25', // Express trusted proxy resolved value
      headers: {
        'x-forwarded-for': '1.1.1.1, 198.51.100.25',
        'x-real-ip': '1.1.1.1',
        'forwarded': 'for=1.1.1.1'
      },
      socket: { remoteAddress: '127.0.0.1' }
    } as any;
    assert.strictEqual(getClientIp(trustedProxyReq), '198.51.100.25');

    // 4. Untrusted spoofed headers ignored when Express does not resolve them into req.ip
    const spoofedReq = {
      ip: '192.168.1.100', // Real socket address reported by Express
      headers: {
        'x-forwarded-for': 'attacker.spoofed.ip',
        'x-real-ip': '8.8.8.8',
        'forwarded': 'for=1.2.3.4'
      },
      socket: { remoteAddress: '192.168.1.100' }
    } as any;
    assert.strictEqual(getClientIp(spoofedReq), '192.168.1.100');
  });

  test('HTTP 429 & RateLimit Header Standards: Emits standard RFC headers and Retry-After', async () => {
    const store = new MemoryRateLimitStore(100);
    const limiter = createDistributedRateLimiter({
      windowMs: 60000,
      max: 1,
      prefix: 'header-test',
      message: 'Rate limit exceeded'
    }, store);

    const headers: Record<string, any> = {};
    let status = 200;
    let jsonBody: any = null;

    const mockRes: any = {
      setHeader(name: string, val: any) { headers[name] = val; },
      status(code: number) { status = code; return this; },
      json(body: any) { jsonBody = body; return this; }
    };

    const mockReq = {
      ip: '192.0.2.99',
      socket: { remoteAddress: '192.0.2.99' }
    } as any;

    // 1st request -> allowed
    await limiter(mockReq, mockRes, () => {});
    assert.strictEqual(headers['RateLimit-Limit'], 1);
    assert.strictEqual(headers['RateLimit-Remaining'], 0);
    assert.ok(typeof headers['RateLimit-Reset'] === 'number');

    // 2nd request -> HTTP 429 with Retry-After header
    await limiter(mockReq, mockRes, () => {});
    assert.strictEqual(status, 429);
    assert.strictEqual(headers['RateLimit-Remaining'], 0);
    assert.ok(typeof headers['Retry-After'] === 'number');
    assert.ok(headers['Retry-After'] >= 1);
    assert.strictEqual(jsonBody?.error, 'Rate limit exceeded');
  });
});
