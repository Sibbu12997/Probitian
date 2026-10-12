# ProBitian — Production Release Checklist

Use this checklist for each release. Check an item only after verifying it in the target environment; this document does not certify the current production state.

## 1. Code and build

- [ ] Confirm the target commit and review its diff.
- [ ] Run `npm ci`.
- [ ] Run `npm run lint`.
- [ ] Run `npm test`; verify integration tests are configured for a non-production project only.
- [ ] Run `npm run build`.
- [ ] Review dependency audit results and resolve or explicitly accept relevant findings.
- [ ] Confirm CI and CodeQL checks passed for the commit.

## 2. Database and migrations

- [ ] Compare `supabase/migrations/` with the live Supabase migration history; repository files alone do not prove application.
- [ ] Review new SQL for data loss, grants, RLS behavior, lock impact and idempotency.
- [ ] Back up production data using the approved recovery process before a risky schema change.
- [ ] Apply only the reviewed forward-only migration to the intended environment.
- [ ] Verify affected columns, indexes, policies, grants and functions in the live database.
- [ ] Confirm public inserts have only intended column-level privileges.
- [ ] Confirm public endpoints using a privileged Supabase client explicitly filter published/public records.
- [ ] Confirm no historical migration, table reset or destructive seed ran against production.

## 3. Authentication and security

- [ ] Verify admin login, session verification, logout and session revocation.
- [ ] Verify server-side RBAC for sensitive routes; do not rely on client-side visibility.
- [ ] Confirm secrets are configured server-side and absent from client bundles and repository changes.
- [ ] Verify public contact, newsletter and feedback flows cannot set administrative/moderation fields.
- [ ] Verify direct Storage upload/list/update/delete behavior matches the intended policy; separately confirm public asset delivery.
- [ ] Review Supabase Security Advisor and dependency findings; record any accepted limitations.

## 4. Functional smoke tests

- [ ] Open the public website and check primary navigation and responsive layout.
- [ ] Verify public content only exposes records intended for publication.
- [ ] Verify admin content creation/editing and publish/unpublish behavior.
- [ ] Submit a contact message and verify it is stored with safe initial status.
- [ ] Submit a newsletter subscription and verify duplicate/invalid inputs are handled safely.
- [ ] Upload and view an approved media asset; test media reference checks before deletion.
- [ ] Verify analytics, email workflows and CRM features affected by the release.
- [ ] Verify sitemap, robots rules, canonical URLs and not-found handling.

## 5. Deployment and rollback readiness

- [ ] Confirm deployment configuration, environment variables and health checks.
- [ ] Deploy the reviewed build using the normal release pipeline.
- [ ] Re-run smoke tests against the deployed service.
- [ ] Inspect application logs and error rates.
- [ ] Confirm a documented rollback path exists for the application and database change.
- [ ] Record commit SHA, migration versions, checks run, exceptions and verification results.

## 6. Recent database controls to remember

Production migrations applied on 12 October 2026 include:

- `20261012050720_add_video_publication_controls.sql`: video publication fields and public published-only RLS policy.
- `20261012050802_harden_public_insert_and_feedback_access.sql`: feedback direct-read restriction and column-limited public inserts for messages/newsletter.

Because the Express server can use a privileged Supabase client, the public video API must independently filter `published = true`. Verify that route and its fallback path before declaring this control complete.

See [Architecture](ARCHITECTURE.md), [Database Migrations](DATABASE_MIGRATIONS.md), [Security](SECURITY.md), and [Deployment Workflow](DEPLOYMENT_WORKFLOW.md).
