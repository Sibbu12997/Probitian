# ProBitian Documentation

Use this index for maintained technical, developer, operator and user documentation. Keep these docs aligned with code and deployment configuration.

## Start here

- [Current Architecture](ARCHITECTURE.md) — frontend, API, trust boundaries and runtime.
- [Connection and Environment Setup](CONNECTION_SETUP.md) — local setup, Supabase, secrets, analytics, email and social URLs.
- [Database Migration Guide](DATABASE_MIGRATIONS.md) — consolidated fresh-install baseline and production safety.
- [Database Architecture](DATABASE_ARCHITECTURE.md) — entities, relationships and access boundaries.
- [Security](SECURITY.md) — authentication, CSRF/CORS, RLS, grants and operational controls.
- [Troubleshooting](TROUBLESHOOTING.md)
- [Production Release Checklist](PRODUCTION_RELEASE_CHECKLIST.md)

## Operations and integrations

- [Analytics](ANALYTICS.md)
- [Email Configuration](EMAIL_CONFIGURATION.md)
- [Email Campaign Workflow](EMAIL_CAMPAIGN_WORKFLOW.md)
- [Lead Outreach and Sequences](LEAD_OUTREACH_AND_SEQUENCES_WORKFLOW.md)
- [Media Library](MEDIA_LIBRARY.md)
- [Newsletter Workflow](NEWSLETTER_WORKFLOW.md)
- [SEO Architecture](SEO_ARCHITECTURE.md)
- [SEO User Acceptance Testing](SEO_UAT.md)
- [Deployment Workflow](DEPLOYMENT_WORKFLOW.md)

## Product guides

- [ProBitian User Guide](PROBITIAN_USER_GUIDE.md)
- [Admin Control Center User Guide](PROBITIAN_ADMIN_CONTROL_CENTER_USER_GUIDE.md)

## Production audit records

- [Production Schema and Migration Ledger Audit](production-schema-ledger-audit.md)
- [Production Readiness: Secrets and Schema](production-readiness-secrets-and-schema.md)
- [RLS and Unused Index Review](rls-and-unused-index-review-2026-10-12.md)

## Canonical ownership

- Application behavior: `src/`, `server.ts`, `server/`
- Scripts and dependencies: `package.json` and lockfile
- Configuration names: `.env.example`
- Fresh-install SQL baseline: `supabase/migrations/0001_probitian_baseline.sql`
- Historical migration inventory: `supabase/legacy-migrations.md`
- Public social destinations: live Admin Control Center settings and `public.social_links`

Avoid competing schema snapshots or stale generated copies of maintained documentation.
