# Production schema and migration-ledger audit

Audit date: 2026-10-12  
Supabase project: `dlaehchzzkjsrarktfsf`  
Scope: read-only inspection of the live Supabase migration ledger and PostgreSQL catalog before repository migration consolidation.

## Live catalog snapshot

- 23 public base tables
- 243 public columns
- 54 public indexes
- 74 public RLS policies
- RLS enabled on all 23 public base tables
- One non-internal auth trigger: `on_auth_user_created_profile` on `auth.users`, invoking `public.handle_auth_user_profile()`
- Five application functions in `public` / `private` were inspected, including rate limiting, session revocation pruning, profile sync and the admin/editor helper.
- Table-level and explicit column-level grants were inspected.

The rate-limit and session-revocation maintenance functions are executable by `service_role` and the database owner, not `anon` or `authenticated`.

## Confirmed differences between historical SQL and live production

1. **Profile role default:** live `public.profiles.role` default was `'admin'`; the new clean-install baseline intentionally uses `'user'` for least privilege.
2. **Feedback rating type:** live `public.feedback.rating` is PostgreSQL `integer`; historical migration 0017 declared `SMALLINT`. The consolidated baseline follows the live integer type.
3. **Auth profile trigger/function:** production uses `on_auth_user_created_profile` and `handle_auth_user_profile()`; historical migration 0017 defines `on_auth_user_created` and `handle_new_user()`. The baseline follows the current production trigger/function instead of replacing it with the older implementation.
4. **Migration ledger mapping:** production has nine recorded entries. Some old repository filenames did not match ledger names, and two applied migration source files were absent from the former directory listing.

## Consolidation decision

The active repository migration directory now contains one canonical baseline: `supabase/migrations/0001_probitian_baseline.sql`. The previous individual migration files were removed from the active directory and remain recoverable from Git history. Their inventory is recorded in `supabase/legacy-migrations.md`.

This is a **repository organization change**, not a production migration. It does not remove production database objects, rewrite the live Supabase migration ledger, or make the baseline safe to apply to an existing project.

## Required operational boundaries

- Never run `0001_probitian_baseline.sql` against the existing production database.
- Never reset, fake, or bulk-mark the production migration ledger to match the consolidated filename.
- Use the baseline only for a new/empty Supabase project after applying it to a disposable test project and validating the resulting schema and behavior.
- Existing production schema changes must use reviewed forward-only migrations, with a backup and explicit approval before DDL.
- CMS content tables are intentionally empty; no content was seeded as part of consolidation.
- A successful catalog snapshot or schema creation is not proof that every application flow has passed end-to-end tests.

## Validation still required

The baseline was assembled from the live catalog and includes table definitions, non-constraint indexes, RLS policies, application function definitions and observed execute grants, table/column grants, the auth profile trigger, and the project-owned `ensure_rls` event trigger. It does not recreate Supabase-managed internal event triggers or seed data. It must be applied and tested on a disposable Supabase project before being treated as a verified new-project bootstrap.

The production migration ledger remains historical evidence and is not expected to become a one-entry ledger merely because the repository now has one baseline file.
