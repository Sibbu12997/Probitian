# ProBitian — Database Migration Guide

> Updated: 12 October 2026. This guide is based on the migration files currently present in the repository and production migration results known at the time of update. Verify live Supabase migration history before applying anything.

## Source of truth and safety

- `supabase/migrations/` contains forward-only SQL changes.
- `supabase/schema.sql` is a schema snapshot/reference, not proof that the live database matches it.
- Supabase production migration history and catalog state are authoritative for what has actually been applied.
- Never reset production, rerun historical migrations, or edit a migration that has already been applied.
- Do not assume numeric filenames perfectly correspond to Supabase migration names/timestamps; this repository has historical naming drift.

## Migration files currently in the repository

The repository includes the baseline migrations `0001`–`0019`, `0021_restrict_storage_object_policies.sql`, and these timestamped production changes:

| File | Purpose |
|---|---|
| `0001_initial_schema.sql` – `0017_reconcile_production_schema.sql` | Historical baseline and incremental schema/security changes; see each SQL file for exact operations |
| `0018_security_privilege_reconciliation.sql` | Security and privilege reconciliation |
| `0019_harden_settings_rls.sql` | Restricts direct public access to allowlisted settings |
| `0021_restrict_storage_object_policies.sql` | Removes broad historical policies from `storage.objects` |
| `20261012050720_add_video_publication_controls.sql` | Adds video publication state and public read policy |
| `20261012050802_harden_public_insert_and_feedback_access.sql` | Hardens feedback visibility and public insert permissions |

There is no `0020` file in the repository. Do not create or renumber a historical migration merely to close the gap.

## Production changes applied on 12 October 2026

### Video publication controls

The migration added:

- `public.videos.published boolean NOT NULL DEFAULT false`
- `public.videos.published_at timestamptz`
- Public SELECT policy constrained to `published = true`
- Partial index `idx_videos_published_created_at`

The existing admin/editor policy remains. **Important:** RLS does not filter a query made with a privileged service-role client. Public API routes must also explicitly filter `published = true`, including any local fallback path.

### Public insert and feedback access hardening

The migration:

- Revokes direct SELECT on `public.feedback` from `anon` and `authenticated`
- Restricts public `messages` inserts to the user-submitted columns `name, email, subject, message, phone, course_interested`
- Requires contact submissions to retain server-owned moderation/reply/delivery fields at their safe initial values
- Restricts public `newsletter` inserts to the `email` column and requires `status = 'active'`

Admin/editor policies and service-role access are retained. Validate the API code still uses server-side queries for operations that need private feedback or management fields.

## Standard forward-only workflow

1. Inspect current schema, RLS policies, grants, indexes and Supabase migration history.
2. Add a new migration file with a unique version/name. Never modify an applied migration.
3. Prefer safe, idempotent DDL where practical; avoid destructive changes without a reviewed data migration and explicit approval.
4. Review privilege changes carefully. RLS and SQL grants are separate controls.
5. Apply the migration in the intended environment using the approved Supabase workflow.
6. Verify the live catalog, policies, grants, indexes and application behavior.
7. Run unit tests, integration tests (only with a guarded non-production project), typecheck and production build.
8. Record what was applied, where, and how it was verified. A committed file alone is not evidence of production application.

## Production precautions

- Never place a production service-role/secret key in frontend code or documentation.
- Do not run destructive integration tests against production.
- Do not grant table-wide public INSERT when column-level grants are intended.
- When using the service-role client, explicitly apply public-content filters and select only safe fields.
- Before changing policies, inspect every dependent API route and its tests.
