# ProBitian Pull Request

<!--
PR Title Guidance:
Please use conventional commit formatting for your PR title:
- feat: <short description> (New features or capabilities)
- fix: <short description> (Bug fixes)
- docs: <short description> (Documentation changes)
- security: <short description> (Security hardening or vulnerability mitigation)
- refactor: <short description> (Code refactoring without functional changes)
- chore: <short description> (Maintenance, dependency updates, tooling)
-->

## Summary
<!-- What does this PR change and why is it necessary? -->

## Related Issue
Closes #<!-- Issue number if applicable, e.g. Closes #42 -->

---

## Change Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Documentation
- [ ] Security
- [ ] Refactoring
- [ ] Performance
- [ ] Database / Migration
- [ ] UI / UX
- [ ] Educational Content
- [ ] Maintenance

## ProBitian Area
- [ ] Public Website
- [ ] Admin Control Center
- [ ] CMS
- [ ] Authentication
- [ ] Supabase / Database
- [ ] GA4 Analytics
- [ ] Email / Newsletter
- [ ] Campaigns
- [ ] Media Library
- [ ] Learning / Courses
- [ ] Blog
- [ ] Projects
- [ ] Videos
- [ ] Documentation
- [ ] Other

---

## What Changed?
<!-- Describe the technical implementation details and changes made across files. -->

## Architecture Impact
<!--
Explain whether this changes:
- Frontend (React / Tailwind components)
- Express backend (server.ts / API routes)
- Supabase / PostgreSQL (Schemas, table structures, RPC)
- Supabase Storage (`probitian-media` bucket)
- Authentication (Passkey, session cookie issuance)
- GA4 (Measurement protocol, event logging)
- Email infrastructure (Nodemailer, Gmail SMTP)
- Deployment (Vite build, production scripts)
- Documentation
If none, please state: "No architectural impact."
-->

## Database / Migration Impact
- [ ] No database changes
- [ ] Existing migration modified
- [ ] New migration added (`supabase/migrations/000X_*.sql`)
- [ ] RLS / policies changed
- [ ] Storage policy changed

*If database changes were made, explain the migration logic, safety guards (`IF NOT EXISTS`), and data compatibility:*

---

## Security Review
Please verify and check all that apply:
- [ ] No secrets or credentials committed (`.env`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSKEY`, `GMAIL_APP_PASSWORD`, `GEMINI_API_KEY`)
- [ ] No server-side secrets exposed to frontend client code
- [ ] Authentication was not weakened or bypassed
- [ ] Authorization / `requireAdmin` middleware was not weakened
- [ ] Row Level Security (RLS) implications reviewed on affected Supabase tables
- [ ] CORS / CSRF implications reviewed where applicable
- [ ] File upload / SVG sanitization implications reviewed where applicable
- [ ] No sensitive information included in logs, error payloads, or toasts

---

## Testing
<!--
Describe the specific manual and automated tests performed to verify this change.
Include output from the repository's validation commands:
-->

- [ ] TypeScript Validation passed (`npm run lint`)
- [ ] Production Build passed (`npm run build`)
- [ ] Local Dev verification passed (`npm run dev`)

### Test Details:
<!-- Describe any manual UI testing, API test calls, or error handling tests performed: -->

---

## UI Changes (If applicable)
- [ ] Screenshots / videos added below
- [ ] Light mode checked
- [ ] Dark mode checked
- [ ] Mobile responsive layout checked
- [ ] Desktop layout checked
- [ ] Accessibility & WCAG AA contrast checked

<!-- Add screenshots here if applicable -->

---

## Documentation
- [ ] Documentation not affected
- [ ] Documentation updated
- [ ] README updated (`README.md`)
- [ ] User guide updated (`docs/PROBITIAN_USER_GUIDE.md`)
- [ ] Admin guide updated (`docs/PROBITIAN_ADMIN_CONTROL_CENTER_USER_GUIDE.md`)
- [ ] Security documentation updated (`SECURITY.md` or `docs/SECURITY.md`)
- [ ] Architecture documentation updated (`docs/DATABASE_ARCHITECTURE.md`, `docs/ANALYTICS.md`, etc.)

---

## Regression Check
<!-- Confirm that existing functionality, public pages, admin features, and API routes remain intact. -->

---

## Final Checklist
- [ ] Code is focused and does not contain unrelated changes
- [ ] No debug code or stray `console.log` left behind
- [ ] No console logging containing sensitive tokens or credentials
- [ ] No secrets or credentials committed
- [ ] Production Supabase remains the authoritative source of truth
- [ ] Local JSON fallback has not been introduced into production paths
- [ ] Existing security controls are preserved
- [ ] TypeScript validation passes (`npm run lint`)
- [ ] Production build passes (`npm run build`)
- [ ] Documentation reflects the implementation
- [ ] PR description accurately represents the changes
