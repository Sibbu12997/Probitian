# Production schema and migration-ledger audit

Audit date: 2026-10-12  
Supabase project: `dlaehchzzkjsrarktfsf`  
Scope: read-only inspection of the live Supabase migration ledger and PostgreSQL catalog, compared with `supabase/migrations/` on `main`.

## Summary

The live database currently exposes 23 public base tables, 243 public columns, 54 public indexes, and 74 public RLS policies. All 23 public base tables have RLS enabled. The live database has an auth trigger named `auth.on_auth_user_created_profile` which calls `public.handle_auth_user_profile()`. The live function ACLs for `increment_rate_limit` and `prune_expired_session_revocations` restrict execution to `service_role` (and the database owner), not `anon` or `authenticated`.

This audit found **migration history/source drift** and at least one **column-default drift**. It does not authorize applying schema changes to production.

## Live ledger ↔ repository mapping

| Live ledger version | Live ledger name | Repository file / status | Notes |
|---|---|---|---|
| `20261007044036` | `0017_reconcile_production_schema` | `0017_reconcile_production_schema.sql` | Filename suffix matches, but the live profile trigger/function differ from this file's `handle_new_user()` / `on_auth_user_created` definitions. |
| `20261007051339` | `0018_public_cms_visibility_hardening` | **No file with this name found** | Do not assume `0018_security_privilege_reconciliation.sql` is equivalent; its contents are different and cover function ACLs, feedback consent, and content policies. |
| `20261008044849` | `0019_reconcile_migration_18_drift` | **No file with this name found** | Exact source for the applied migration was not recoverable from the current migration directory listing. |
| `20261008085420` | `0020_harden_settings_rls` | `0019_harden_settings_rls.sql` | The source filename has a one-step numbering mismatch relative to the live ledger name. Its settings allowlist policy corresponds to the current intended behavior. |
| `20261009164408` | `restrict_storage_object_policies` | `0021_restrict_storage_object_policies.sql` | Suffix differs by the repository's numeric prefix; inspect SQL before assuming exact byte-for-byte identity. |
| `20261012050720` | `add_video_publication_controls` | `20261012050720_add_video_publication_controls.sql` | Filename/version aligns. |
| `20261012050802` | `harden_public_insert_and_feedback_access` | `20261012050802_harden_public_insert_and_feedback_access.sql` | Filename/version aligns. |
| `20261012062531` | `consolidate_permissive_rls_policies` | `20261012062531_consolidate_permissive_rls_policies.sql` | Filename/version aligns. |
| `20261012063805` | `drop_redundant_admin_revocation_index` | `20261012063805_drop_redundant_admin_revocation_index.sql` | Filename/version aligns. |

The directory has no `0020_*.sql` file. Do **not** rename or delete historical migration files as a quick fix: migration filenames and the Supabase ledger are historical records, and a rename does not recreate missing applied SQL or repair the ledger. Preserve history and add new forward-only migrations for any confirmed live schema changes.

## Confirmed schema drift / follow-up

1. **Profile role default:** live `public.profiles.role` defaults to `'admin'`; repository migration `0017_reconcile_production_schema.sql` declares `DEFAULT 'user'`. The live auth trigger explicitly sets a validated role, but the database default remains a privilege-sensitive mismatch. Review and correct via a forward-only migration after confirming intended behavior.
2. **Feedback rating type:** live `public.feedback.rating` is PostgreSQL `integer` (`int4`); repository migration `0017_reconcile_production_schema.sql` declares `SMALLINT` (`int2`). The existing range check constrains values to 1–5. Decide whether to align the live type or document the live type as canonical; do not cast production data without an explicit migration.
3. **Auth profile trigger/function:** live trigger is `on_auth_user_created_profile` and invokes `public.handle_auth_user_profile()`. Migration 0017 instead creates `on_auth_user_created` and `public.handle_new_user()`. The live function validates app metadata role values; do not replace it with the older function without a behavior/security review.
4. **Missing applied migration source:** the live ledger records `0018_public_cms_visibility_hardening` and `0019_reconcile_migration_18_drift`, but those exact source files are absent from the current directory listing. Recover them from Git history/backups if possible. If unrecoverable, document that fact and use catalog-derived snapshots plus reviewed forward-only migrations; do not invent their original SQL.

## Catalog checks performed

- Public tables: 23; columns: 243; indexes: 54; RLS policies: 74.
- No public base table was found with RLS disabled.
- Public functions inspected include `handle_auth_user_profile()`, `increment_rate_limit(text,bigint,integer)`, `prune_expired_session_revocations(bigint)`, and `rls_auto_enable()`.
- Non-internal trigger inspection found the auth-user profile trigger described above; no non-internal triggers were found in `public`.
- Current live function ACLs show `increment_rate_limit` and `prune_expired_session_revocations` executable by `service_role` and the owner, not `anon` or `authenticated`.

## Safety boundary

This PR is documentation only. No production DDL, migration history, RLS policy, grant, row, or storage object was changed. A complete automated, machine-diffable comparison of every baseline migration against the live schema remains a separate task because historical source migrations are missing or differently named; the concrete discrepancies above are confirmed from live catalog output and current repository SQL.
