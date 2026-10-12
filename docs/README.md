# ProBitian Documentation

This directory contains the maintained technical and operational documentation for the current codebase. Start with [Current Architecture](ARCHITECTURE.md), then use the topic-specific references below.

## Source of truth

- Application implementation: `src/` and `server/`
- Package scripts and dependencies: `package.json` and lockfile
- Database change history: `supabase/migrations/`
- Automated checks: `tests/` and `.github/workflows/`
- Production database and policies: live Supabase state, verified separately from repository files

Documentation is explanatory; code, migration files, and the live environment must be checked when they disagree. Do not infer that a migration ran in production solely because a SQL file exists in Git.

## Current reference documents

| Document | Use |
|---|---|
| [Architecture](ARCHITECTURE.md) | Current application layout, security boundaries and directory map |
| [Database architecture](DATABASE_ARCHITECTURE.md) | Data model and database responsibilities |
| [Database migrations](DATABASE_MIGRATIONS.md) | Migration history, drift notes and safe migration workflow |
| [Security](SECURITY.md) | Authentication, authorization, RLS and application security |
| [Deployment workflow](DEPLOYMENT_WORKFLOW.md) | Build, release and post-deployment verification |
| [Production release checklist](PRODUCTION_RELEASE_CHECKLIST.md) | Release readiness checks; verify all checked items again before relying on them |
| [Analytics](ANALYTICS.md) | Analytics implementation and configuration |
| [Email configuration](EMAIL_CONFIGURATION.md) | Email provider configuration |
| [Email campaigns](EMAIL_CAMPAIGN_WORKFLOW.md) | Campaign workflow |
| [Lead outreach and sequences](LEAD_OUTREACH_AND_SEQUENCES_WORKFLOW.md) | CRM outreach and sequence workflow |
| [Media library](MEDIA_LIBRARY.md) | Media lifecycle and reference handling |
| [Newsletter](NEWSLETTER_WORKFLOW.md) | Subscription workflow |
| [SEO architecture](SEO_ARCHITECTURE.md) | Metadata, routing, sitemap and SEO implementation |
| [Troubleshooting](TROUBLESHOOTING.md) | Diagnostic steps for known issues |
| [Website user guide](PROBITIAN_USER_GUIDE.md) | Public learner-facing feature guide |
| [Admin Control Center guide](PROBITIAN_ADMIN_CONTROL_CENTER_USER_GUIDE.md) | Admin portal usage |

## Documentation maintenance rules

1. Update the source document under `docs/`; do not maintain duplicate copies under `public/docs/`.
2. Avoid hard-coding volatile metrics, test counts, storage object counts or claims that an audit is permanently passed.
3. Label point-in-time audit evidence with its date and scope.
4. Keep credentials, tokens, passkeys and secret values out of documentation.
5. For schema changes, add a new forward-only migration and update [Database migrations](DATABASE_MIGRATIONS.md).
6. Validate documentation links and relevant application scripts after structural changes.

## Removed generated artifacts

PDF guides and duplicated Markdown exports formerly under `public/docs/` have been removed. The source guides in `docs/` remain the maintained copies.