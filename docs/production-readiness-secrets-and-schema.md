# Production Readiness: Secrets and Schema History

This document records deployment checks that cannot be proven by repository CI alone. Repository migration consolidation does not change production data or the Supabase migration ledger.

## Unsubscribe signing secret

- The server validates `UNSUBSCRIBE_SECRET` before listening in production.
- The value must be at least 32 UTF-8 bytes.
- CI's secret is test-only and must never be copied to production.
- Configure a unique random secret in the actual hosting provider's runtime environment and restart/redeploy the service.
- Verify configuration without exposing the value: check that the variable is configured, inspect startup logs, and test the unsubscribe-token flow. Never print the value in logs or paste it into tickets.
- If the secret is absent or weak, startup is expected to fail. Do not weaken validation to make deployment pass.

**Status:** repository validation is implemented; live hosting configuration is not verifiable from this repository. An operator with hosting access must confirm it.

## Consolidated database baseline

- The single maintained fresh-install baseline is `supabase/migrations/0001_probitian_baseline.sql`.
- The old individual migration files were removed from the active directory; their history remains in Git and the filenames are listed in `supabase/legacy-migrations.md`.
- The baseline is for a new/empty Supabase project only. It must not be run against the existing production project.
- The live production migration ledger contains nine applied entries. It remains authoritative historical metadata; do not reset or edit it to match the single repository baseline.
- The baseline uses `'user'` as the default profile role for least privilege and follows production's integer feedback rating type and current auth profile trigger/function. It includes the project-owned `ensure_rls` event trigger; Supabase-managed internal event triggers are not recreated.
- CMS content remains intentionally unseeded.

## Before any new-project bootstrap

1. Create a disposable Supabase project with the required platform-managed schemas, roles and extensions.
2. Apply the baseline once to that empty project.
3. Compare columns, types, defaults, constraints, indexes, RLS policies, grants, functions and triggers.
4. Test auth/profile creation, public reads, admin writes, forms, media metadata persistence, newsletter and unsubscribe flows.
5. Fix any bootstrap errors before using the baseline elsewhere.

## Existing production changes

Use reviewed forward-only migrations for future production changes. Do not apply the fresh-install baseline, reset migration history, fake historical entries, or assume that repository file consolidation upgrades the live database.
