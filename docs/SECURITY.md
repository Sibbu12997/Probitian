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

## 4. Rate Limiting & DoS Protection

Rate limiters protect critical endpoints from brute force and resource exhaustion:

| Limiter | Window | Max Requests | Target Routes |
|---|---|---|---|
| `apiLimiter` | 15 min | 300 | General API endpoints |
| `loginLimiter` | 15 min | 5 | `/api/admin/verify-*` |
| `contactLimiter` | 15 min | 10 | `/api/messages` |
| `newsletterLimiter` | 15 min | 10 | `/api/newsletter` |
| `emailSendLimiter` | 15 min | 10 | Campaign bulk dispatches |
| `emailTestLimiter` | 15 min | 20 | Test email triggers |
| `uploadLimiter` | 15 min | 30 | Media file uploads |

- **Bounded Memory:** Rate limiters maintain internal maps capped at 10,000 entries with automatic expired entry pruning to prevent memory exhaustion under distributed scanning.
- **Standard Headers:** Responses include standard `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` headers.

---

## 5. Media & SVG Security Controls

- **Magic Byte Validation:** Uploaded binaries are inspected at the byte level to prevent MIME-type spoofing. Executables (`.exe`, `.dll`, Linux ELF, scripts, and PHP tags) are rejected regardless of file extension or declared MIME type.
- **Parser-Backed SVG Sanitization:** SVG files are sanitized using `isomorphic-dompurify` with strict SVG profiles. XML DOCTYPE and ENTITY declarations are stripped to prevent XML External Entity (XXE) expansion.
- **Active Content Elimination:** All `<script>`, `<iframe>`, `<object>`, `<foreignObject>`, `<embed>`, inline event handlers (`onload`, `onerror`, `onclick`), and dangerous protocols (`javascript:`, `vbscript:`, `data:text/html`) are completely neutralized.

---

## 6. Continuous Security Automation

- **GitHub Actions CodeQL:** Automated static application security testing (SAST) runs on every push, pull request, and weekly schedule (`.github/workflows/codeql.yml`).
- **Dependabot:** Automated weekly vulnerability dependency scanning and updates for npm packages and GitHub Actions (`.github/dependabot.yml`).
- **CI Pipeline:** Automated linting, build verification, `npm audit` check, and security regression test suite execution (`.github/workflows/ci.yml`).

---

## 7. Security Vulnerability Reporting

If you discover a security vulnerability, please report it privately:
- **Email:** `probitianofficial@gmail.com` or `shivam@probitian.com`
- **Issue Tracker:** Submit using the [Security Issue Template](/.github/ISSUE_TEMPLATE/security.md)
- **Response SLA:** Initial acknowledgment within 24 hours; remediation deployment within 72 hours.
