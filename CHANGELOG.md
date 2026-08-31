# Changelog

All notable changes to the ProBitian application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-08-31

### Added
- **Administrative Audit Trail**: Implemented `public.audit_logs` migration and `recordAuditLog` service in `/server/services/audit.ts` to log logins, logouts, role changes, and administrative actions with automated secret redaction.
- **Content Governance & Versioning**: Added `public.content_revisions` schema supporting `DRAFT`, `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, and `ARCHIVED` lifecycle states with rollback tracking.
- **System Observability & Health Route**: Added GET `/api/health` providing uptime, release version (`1.1.0`), database connection status, and environment mode.
- **Audit Logs API**: Added authenticated and role-guarded `GET /api/admin/audit-logs` endpoint for administrators.
- **Release Documentation**: Added `PRODUCTION_CHECKLIST.md` and release governance procedures.

### Changed
- **Token Response Hardening**: Removed raw administrative session tokens from passkey and Supabase login response bodies (`/api/admin/verify-passkey`, `/api/admin/verify-supabase-session`). Session state is now transferred exclusively via `HttpOnly`, `Secure`, `SameSite` cookies.
- **Session Signing Secret**: Prioritized dedicated `SESSION_SECRET` with clean fallback isolation and zero cross-credential leakage.
- **Admin UI Versioning**: Updated admin navigation footer to display production version `v1.1.0`.

### Security
- **Strict Cookie Enforcement**: Enforced `HttpOnly`, `Secure`, and `Path=/` attributes across all authentication sessions.
- **Least-Privilege Isolation**: Audit logs and content revisions isolated strictly to `service_role` via Row Level Security (RLS) with zero anonymous or authenticated direct access.
- **Sanitized Audit Storage**: Scrubbed passwords, tokens, cookies, and secret keys before persistence.

---

## [1.0.0] - 2026-08-25

### Added
- Initial production release of ProBitian Learning & CMS Platform.
- Full-stack Express & React 19 architecture with Supabase backend.
- High-performance Dynamic SEO prerendering and schema.org integration.
- Public courses, blog tutorials, projects showcase, and contact messaging.
- Admin portal for CRM, Newsletter management, Lead outreach, and SEO settings.
