# ProBitian — Security & Isolation Specification

Official Security Architecture & Data Protection Specification for ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  

---

## 1. Core Security Principles

ProBitian adheres to enterprise security standards to protect administrative controls, user data, media assets, and backend operations:

1. **Strict Secret Isolation**: All privileged keys (`SUPABASE_SECRET_KEY`, `GMAIL_APP_PASSWORD`, `ADMIN_PASSKEY`, `GEMINI_API_KEY`, `GA4_PRIVATE_KEY`) reside exclusively in the server environment and are never exposed in client JS bundles, API responses, or localStorage.
2. **Server-Mediated Database Access**: Client-side direct postgREST access is restricted via Supabase Row Level Security (RLS). All privileged CMS mutations pass through authenticated Express backend handlers using server-side service role privileges.
3. **No Production Fallback Risk**: Production queries communicate directly with Supabase PostgreSQL. There are no silent fallbacks to local JSON or mock data in production.
4. **No Destructive Startup Operations**: Server startup scripts (`server.ts`) never execute `TRUNCATE`, `DROP TABLE`, or automated database resets.

---

## 2. Authentication & Admin Session Security

- **HttpOnly Session Cookies**: Administrative authentication issues an encrypted, time-bound `admin_session` cookie marked `HttpOnly`, `SameSite=Lax`, and `Secure` (in HTTPS environments), preventing XSS token exfiltration.
- **Passkey Verification**: Protected endpoint `POST /api/admin/verify-passkey` verifies the administrator passkey against `ADMIN_PASSKEY`.
- **Supabase Auth Bridge**: Administrator authentication through Supabase Auth is validated server-side (`POST /api/admin/supabase-login`) and upgraded to a verified admin session only after verifying admin permissions.
- **Header & Bearer Compatibility**: Requests from trusted origins support standard `Authorization: Bearer <token>` and `x-admin-token` headers alongside HttpOnly cookies.
- **Session Revocation**: Logout endpoint `POST /api/admin/logout` immediately clears cookies and invalidates session tokens in the server cache.

---

## 3. Database Security & Row Level Security (RLS)

- **RLS Enforcement**: Row Level Security is enabled across all production tables (`projects`, `blogs`, `courses`, `videos`, `newsletter`, `messages`, `media`, `categories`, `pages`, `settings`, `email_campaigns`, `email_campaign_recipients`).
- **Anon Key Restrictions**: Direct client queries using public keys can only read published content and insert contact messages/newsletter signups according to strict policy rules. Direct table alterations return `HTTP 403 Permission Denied`.
- **Service Role Isolation**: Server endpoints execute mutations via `SUPABASE_SECRET_KEY` (service role) safely on the Express backend after performing authorization checks.

---

## 4. Origin Allowlist, CORS & CSRF Defense

- **Explicit Origin Allowlist**: Requests are checked against an explicit allowlist containing official production hostnames, AI Studio preview domains, local dev hosts, and configured `APP_URL` / `CORS_ALLOWED_ORIGINS`.
- **No Wildcard Credentials**: Wildcard `Access-Control-Allow-Origin: *` is strictly prohibited in conjunction with credentials.
- **CSRF & State-Changing Request Defense**: State-modifying requests (`POST`, `PATCH`, `PUT`, `DELETE`) targeting administrative routes `/api/admin/*` and `/api/cms/*` validate `Origin` and `Referer` headers, blocking untrusted cross-origin request forgeries.

---

## 5. Rate Limiting & Abuse Prevention

Granular rate limiters protect sensitive endpoints against brute-force attacks and volumetric spam:

- **Passkey Auth Limiter**: Limits rapid passkey attempts per IP.
- **Supabase Bridge Limiter**: Prevents repeated authentication bridge calls.
- **Contact Form Limiter**: Restricts contact message submissions.
- **Newsletter Subscription & Unsubscribe Limiters**: Throttles subscriber registrations and unsubscription requests.
- **Media Upload Limiter**: Caps file upload frequency per IP.
- **Email Test & Broadcast Limiters**: Guards test email dispatches and mass campaign dispatches.

---

## 6. IDOR Protection & Parameter Sanitization

- **Strict Identifier Validation**: All parameterized route handlers validate IDs with `isValidId` regex and UUID format checks, blocking illegal characters, path traversals (`../`), and null bytes (`\0`).
- **Unauthorized Manipulation Blocking**: Unauthenticated and unauthorized users receive `401 Unauthorized` or `400 Bad Request` and cannot read, modify, or delete records.

---

## 7. Media Upload & SVG Sanitization

- **File Validation**: File size capped at 15MB. MIME types and extensions validated against strict allowlists.
- **SVG Sanitization**: All uploaded SVG graphics pass through server-side sanitization removing script tags, event handlers (`onload`, `onerror`), and external entities.
- **Storage Deletion Sanitization**: Media deletion paths are sanitized to prevent directory traversal outside the `probitian-media` bucket.

---

## 8. HTML Sanitization & XSS Prevention

- **Preview & Markdown Sanitization**: Rich text, HTML previews, and markdown content strip executable tags (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<meta>`, `<link>`) and neutralize dangerous URI protocols (`javascript:`, `vbscript:`, `data:`).

---

## 9. HTTP Security Headers & Error Redaction

- **Security Headers Enforced**:
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production HTTPS)
  - `Content-Security-Policy`: Configured to support AI Studio preview frames and secure asset loading.
- **Error Redaction**: Production error handlers return safe generic messages (`{ error: "..." }`) and never expose stack traces, database credentials, internal server paths, or environment variables.

---

*Documentation maintained by Shivam Singh — ProBitian.*
