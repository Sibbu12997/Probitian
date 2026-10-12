# ProBitian Database Migration Guide

> Updated: 12 October 2026. This guide describes the consolidated fresh-install baseline and the separate production migration history.

## Canonical SQL file

- `supabase/migrations/0001_probitian_baseline.sql` is the single maintained schema baseline for a **new, empty Supabase project**.
- `supabase/schema.sql` is a pointer to the canonical baseline, not a second independently maintained schema.
- `supabase/legacy-migrations.md` records the old file inventory. Historical contents remain in Git history.
- The baseline was generated from the live production catalog and includes public tables/columns/defaults/constraints, non-constraint indexes, RLS policies, function definitions/execute grants, table/column grants and the auth profile trigger. It uses a least-privilege `user` default for new profiles.

## Critical: fresh install versus existing production

**Never run the baseline against the existing production database.** It is a schema creation script, not an upgrade or reconciliation migration.

The live production migration ledger has these recorded entries:

| Version | Ledger name |
|---|---|
| `20261007044036` | `0017_reconcile_production_schema` |
| `20261007051339` | `0018_public_cms_visibility_hardening` |
| `20261008044849` | `0019_reconcile_migration_18_drift` |
| `20261008085420` | `0020_harden_settings_rls` |
| `20261009164408` | `restrict_storage_object_policies` |
| `20261012050720` | `add_video_publication_controls` |
| `20261012050802` | `harden_public_insert_and_feedback_access` |
| `20261012062531` | `consolidate_permissive_rls_policies` |
| `20261012063805` | `drop_redundant_admin_revocation_index` |

These are historical records. Removing old repository files does not reset or rewrite this ledger. Never fake, reset, or bulk-mark entries merely to align names.

## Baseline scope

- 23 public tables with columns, types, defaults and constraints
- Non-constraint indexes
- RLS state and 74 public policies
- Public/private function definitions and observed execute grants
- Table-level and explicit column-level grants
- Non-internal auth profile synchronization trigger

The baseline intentionally does not seed CMS content, upload media, or recreate Supabase-managed internal event triggers. Required Supabase-managed roles, auth/storage schemas and platform extensions must exist in the target project.

## Security-relevant differences

- Production `profiles.role` default was `admin`; the fresh-install baseline intentionally uses `user` for least privilege.
- Production `feedback.rating` uses `integer`; the baseline follows that live type.
- Production auth trigger/function is `on_auth_user_created_profile` / `handle_auth_user_profile()`; do not replace it with historical `handle_new_user()` without review.
- Some historical migration source files were missing or differently named in the previous repository layout. See [Production schema audit](production-schema-ledger-audit.md).

## Validate before use

1. Create a disposable Supabase project matching required features/extensions.
2. Apply the baseline once to that empty project with an appropriately privileged migration connection.
3. Inspect tables, types, defaults, constraints, indexes, policies, grants, functions and triggers.
4. Test auth/profile creation, public CMS reads, forms, admin writes, media upload metadata persistence and newsletter/unsubscribe flows.
5. Review behavior and access control; successful DDL execution is not proof of authorization correctness.
6. Back up and obtain explicit approval before any production DDL.

## Future changes

For existing production, create reviewed forward-only migrations for future changes and apply through the controlled deployment process. Keep the baseline stable until a tested baseline release is intentionally made. Do not add CMS content seeds unless separately approved.
