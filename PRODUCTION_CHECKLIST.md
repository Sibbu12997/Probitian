# ProBitian Production Readiness & Governance Checklist

This checklist must be verified prior to every production release and deployment.

---

## 1. Security & Authentication
- [x] Admin session token omitted from all login JSON response bodies.
- [x] `HttpOnly`, `Secure`, `SameSite` cookies configured for session transport.
- [x] Dedicated `SESSION_SECRET` configured in production environment.
- [x] Server-authoritative RBAC (`USER`, `EDITOR`, `ADMIN`) enforced on every protected route.
- [x] Passwords, passkeys, and API secrets are never logged in plaintext.
- [x] Admin audit trail records all sensitive administrative operations with automatic metadata sanitization.

## 2. Database & Migrations
- [x] All database schema changes versioned sequentially in `/supabase/migrations/`.
- [x] Row Level Security (RLS) enabled on all public tables with strict least privilege.
- [x] Sensitive tables (`leads`, `campaigns`, `audit_logs`, `content_revisions`) strictly restricted to `service_role`.
- [x] Media storage bucket (`probitian-media`) allows public read while rejecting direct unauthorized client uploads.

## 3. SEO, Observability & Health
- [x] Dynamic server-side SEO prerendering active for all canonical SPA routes.
- [x] `robots.txt` and `sitemap.xml` dynamically generated and accessible.
- [x] Admin paths (`/admin`, `/api/*`) flagged with `noindex, nofollow` headers.
- [x] `/api/health` returns status, uptime, version, and database connectivity.
- [x] Error handling masks internal database stack traces from public API callers.

## 4. UI/UX, Accessibility & Brand
- [x] Semantic HTML headings and WCAG 2.2 AA compliant contrast.
- [x] Responsive layout tested across mobile, tablet, laptop, and desktop viewports.
- [x] Canonical branding assets served securely from verified storage/public paths.

## 5. Release & Disaster Recovery
- [x] Semantic Versioning synchronized across `package.json`, `metadata.json`, and backend constants.
- [x] `CHANGELOG.md` updated with release highlights.
- [x] Backup export verified via Admin Backup Manager.
