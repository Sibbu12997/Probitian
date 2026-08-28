# Probitian Security Architecture & Hardening Guide

## 1. Threat Model & Architecture Overview

Probitian is designed with a defense-in-depth, zero-trust security architecture ensuring data integrity, strict access control, and complete protection against unauthorized privilege escalation, cross-site attacks, and data leakage.

```
                    ┌────────────────────────┐
                    │    End-User Browser    │
                    └───────────┬────────────┘
                                │ HTTPS / WSS
                                ▼
                    ┌────────────────────────┐
                    │  Express Edge Shield   │
                    │  - Rate Limiting       │
                    │  - CORS & CSRF Defense │
                    │  - Security Headers    │
                    └───────────┬────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
       ┌──────────────────┐          ┌───────────────────┐
       │ Public Endpoints │          │  Admin Endpoints  │
       │ - Read Content   │          │  - requireAdmin   │
       │ - Insert Msg/Sub │          │  - Identity Bound │
       └─────────┬────────┘          │  - Signed Session │
                 │                   └─────────┬─────────┘
                 │                             │
                 │   ┌─────────────────────┐   │
                 └──►│ Supabase PostgreSQL ├───┘
                     │ (RLS Strict Zero-   │
                     │  Trust & Service-   │
                     │  Role Privilege)    │
                     └─────────────────────┘
```

---

## 2. Authentication & Admin Authorization Model

### Passkey Authentication & Identity Binding
- **Timing Attack Defense:** Passkeys are validated via `crypto.timingSafeEqual` against constant-time SHA-256 digests.
- **Admin Identity Binding:** Client-supplied email parameters cannot override the administrator identity. All passkey authentications are strictly bound to the configured administrator identity allowlist (`OFFICIAL_ADMIN_EMAIL`, `CONFIGURED_ADMIN_EMAILS`).
- **Cryptographic Session Tokens:** Sessions use HMAC-SHA-256 signatures over base64url payloads containing random cryptographic nonces, creation timestamps, and explicit expiry timestamps.
- **Revocation & Logout:** Logging out immediately invalidates tokens in the active session map and registers them in the `revokedSessions` blocklist.
- **Multi-Instance Support:** Stateless cryptographic signature verification enables resilient zero-downtime horizontal scaling across Cloud Run container instances.

### Supabase Admin Session Verification
- Access tokens are verified server-side with Supabase Auth (`getUser(accessToken)`).
- Authorization requires explicit administrative status: verified email in `CONFIGURED_ADMIN_EMAILS`, `profiles.role === 'admin'`, or `app_metadata.role === 'admin'`.

---

## 3. Database Security & Row Level Security (RLS)

- **Least-Privilege Schema Grants:** Public/unauthenticated clients (`anon`, `authenticated`) have zero direct privileges on private tables.
- **Strict Private Isolation:** Tables `leads`, `lead_campaigns`, `campaign_leads`, `email_campaigns`, and `email_campaign_recipients` are completely inaccessible to `anon` and `authenticated` roles.
- **Backend Exclusivity:** All management operations are mediated exclusively through the Express backend using the Supabase `service_role` key.
- **Inbound Submissions:** Contact messages and newsletter subscriptions are granted `INSERT-only` permissions; client roles cannot read or list submitted records.

---

## 4. Rate Limiting, Concurrency & Distributed DoS Protection

Rate limiters protect critical endpoints from brute force, distributed scanning, and resource exhaustion using an atomic distributed architecture backed by Supabase PostgreSQL and bounded in-memory fail-safe stores:

| Limiter | Window | Max Requests | Target Routes |
|---|---|---|---|
| `loginLimiter` | 15 min | 10 | `/api/admin/login`, `/api/admin/verify-*` |
| `contactLimiter` | 15 min | 10 | `/api/messages` |
| `newsletterLimiter` | 15 min | 10 | `/api/newsletter` |
| `unsubscribeLimiter` | 15 min | 20 | `/api/newsletter/unsubscribe` |
| `emailSendLimiter` | 15 min | 5 | Campaign bulk dispatches |
| `emailTestLimiter` | 15 min | 10 | Test email triggers |
| `uploadLimiter` | 15 min | 30 | Media file uploads |

- **Atomic Shared-Store Operations:** Distributed rate limiting utilizes the database stored procedure `public.increment_rate_limit()` executing an atomic `INSERT ... ON CONFLICT (key) DO UPDATE` with row-level serialization. This guarantees that concurrent multi-instance requests cannot exploit race conditions (e.g. GET-then-SET timing windows) to bypass configured thresholds.
- **Fail-Safe Bounded Fallback:** If the shared database or Supabase RPC becomes unreachable, `DistributedRateLimitStore` transparently fails over to a bounded local `MemoryRateLimitStore`. Security-sensitive endpoints remain protected and are never left open to unlimited requests.
- **Middleware Failure Resilience:** Outer middleware error handlers wrap active store executions with an emergency local fallback limiter. Under catastrophic store exceptions, excess requests are rejected with HTTP 429 rather than silently failing open.
- **Proxy-Aware Client Identification:** Configured with Express `trust proxy: 1` corresponding to Cloud Run / Nginx single-hop ingress. Client IPs are normalized, stripping IPv4-mapped IPv6 prefixes (`::ffff:192.0.2.1` -> `192.0.2.1`) and ignoring spoofed client-supplied `X-Forwarded-For`, `X-Real-IP`, or `Forwarded` headers from untrusted origins.
- **Standard RFC Headers:** Responses include standard `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` headers.

---

## 5. Media & SVG Security Controls

- **Magic Byte Validation:** Uploaded binaries are inspected at the byte level to prevent MIME-type spoofing. Executables (`.exe`, `.dll`, Linux ELF, scripts, and PHP tags) are rejected regardless of file extension or declared MIME type.
- **Parser-Backed SVG Sanitization:** SVG files are sanitized using `isomorphic-dompurify` with strict SVG profiles. XML DOCTYPE and ENTITY declarations are stripped to prevent XML External Entity (XXE) expansion.
- **Active Content Elimination:** All `<script>`, `<iframe>`, `<object>`, `<foreignObject>`, `<embed>`, inline event handlers (`onload`, `onerror`, `onclick`), and dangerous protocols (`javascript:`, `vbscript:`, `data:text/html`) are completely neutralized.

---

## 6. Continuous Security Automation & CI/CD Validation

### Automated Security & CI Pipeline (`.github/workflows/ci.yml`)
The continuous integration pipeline validates code quality, type safety, regression suites, dependency integrity, and production build readiness on every push and pull request:
1. **Clean Installation:** `npm ci` (verifies synchronized dependency tree in `package-lock.json`).
2. **Typecheck & Static Analysis:** `npm run lint` (`tsc --noEmit`).
3. **Security & Regression Tests:** `npm test` (`tsx --test tests/**/*.test.ts` across all 10 security suites and 36 assertions).
4. **Vulnerability Audit:** `npm audit --audit-level=high` (verifies zero high/critical severity dependency advisories).
5. **Production Build:** `npm run build` (compiles Vite React SPA and bundles `server.ts` with `esbuild`).

### CodeQL Static Application Security Testing (`.github/workflows/codeql.yml`)
ProBitian enforces deep Static Application Security Testing (SAST) using a custom advanced GitHub Actions CodeQL workflow:
- **Languages:** `javascript-typescript`
- **Query Suites:** `+security-extended,security-and-quality` (extended security vulnerabilities, CWEs, injection risks, data flow leaks, and code quality).
- **Triggers:** Push to `main`, pull requests against `main`, and scheduled weekly security scans (`cron: '0 6 * * 1'`).
- **Configuration Architecture:** ProBitian utilizes the custom advanced CodeQL workflow exclusively. GitHub CodeQL **Default Setup** must **NOT** be simultaneously enabled in repository settings, as GitHub disallows processing advanced configuration SARIF uploads when Default Setup is active.

### Automated Dependency Maintenance (`.github/dependabot.yml`)
- Automated weekly vulnerability dependency scanning and updates for npm packages and GitHub Actions.

---

## 7. Security Vulnerability Reporting

If you discover a security vulnerability, please report it privately:
- **Email:** `probitianofficial@gmail.com` or `shivam@probitian.com`
- **Issue Tracker:** Submit using the [Security Issue Template](/.github/ISSUE_TEMPLATE/security.md)
- **Response SLA:** Initial acknowledgment within 24 hours; remediation deployment within 72 hours.
