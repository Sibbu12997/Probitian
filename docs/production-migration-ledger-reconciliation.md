# Production Migration Ledger Reconciliation

**Purpose:** prevent accidental replay of historical migrations against the production Supabase project.

## Confirmed production intent

The production ledger snapshot recorded in the 12 October 2026 audit contains nine entries, including the two later entries shown below. Re-check the live ledger before relying on this snapshot; this file is historical evidence, not a live connection.

The following CMS tables are intentionally empty in production as confirmed by the project owner: `projects`, `blogs`, `courses`, `videos`, and `categories`. Do not seed or restore content into these tables as part of schema/security maintenance.

## Migration-history drift

Production migration metadata and repository filenames do not currently form a one-to-one sequence. The production history observed during the October 2026 audit included:

| Production version | Production name | Repository counterpart / note |
|---|---|---|
| `20261007044036` | `0017_reconcile_production_schema` | `0017_reconcile_production_schema.sql` |
| `20261007051339` | `0018_public_cms_visibility_hardening` | No same-named repository file; do not assume it equals repository `0018_security_privilege_reconciliation.sql` |
| `20261008044849` | `0019_reconcile_migration_18_drift` | No same-named repository file |
| `20261008085420` | `0020_harden_settings_rls` | Related repository file is named `0019_harden_settings_rls.sql`; verify SQL and resulting schema before mapping |
| `20261009164408` | `restrict_storage_object_policies` | Related repository file is `0021_restrict_storage_object_policies.sql` |
| `20261012050720` | `add_video_publication_controls` | `20261012050720_add_video_publication_controls.sql` |
| `20261012050802` | `harden_public_insert_and_feedback_access` | `20261012050802_harden_public_insert_and_feedback_access.sql` |
| `20261012062531` | `consolidate_permissive_rls_policies` | `20261012062531_consolidate_permissive_rls_policies.sql` |
| `20261012063805` | `drop_redundant_admin_revocation_index` | `20261012063805_drop_redundant_admin_revocation_index.sql` |

This table records observed names; it does **not** certify that differently named historical migrations are semantically identical.

## Safe reconciliation procedure

1. Back up/export the production migration history and current schema before changing migration metadata.
2. Compare each production migration's actual SQL/effects with the repository SQL and inspect the current schema, RLS policies, grants, indexes, and functions.
3. Record a reviewed mapping for every historical production version. Where a production migration has no equivalent repository file, preserve its exact SQL in a clearly named historical archive or document why it is intentionally absent.
4. Do not rename, delete, reorder, or replay already-applied production migrations merely to make numbering look sequential.
5. Use new, timestamped, forward-only migrations for actual schema/policy corrections. Validate them against a disposable database first and review the diff before applying to production.
6. After reconciliation, compare the production migration list with the documented mapping and verify the resulting schema. Keep production data untouched.

## Remaining audit work

- Review the Supabase Performance Advisor's multiple-permissive-policy findings table by table. Consolidate policies only when the effective access semantics are proven equivalent; policy consolidation can unintentionally change authorization.
- Review unused-index findings against real query/workload evidence before dropping anything.
- Keep the intentional authentication setting and the intentional empty CMS tables out of recurring action lists unless the owner changes that decision.

## Privacy logging correction

Newsletter subscription logs should record the event, not the subscriber's email address. Never log full email addresses, unsubscribe tokens, or signed unsubscribe URLs. This applies to both subscription receipt and welcome-email logging.
