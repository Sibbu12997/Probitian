# Production Readiness: Secrets and Schema History

This document records deployment checks that cannot be proven by repository CI alone. It does not change production data or the Supabase migration ledger.

## Unsubscribe signing secret

- The server validates `UNSUBSCRIBE_SECRET` before listening in production.
- The value must be at least 32 UTF-8 bytes.
- CI's `UNSUBSCRIBE_SECRET` is explicitly test-only and must never be copied to production.
- Before deploying, configure a unique random secret in the actual hosting provider's runtime environment and restart/redeploy the service.
- Verify configuration without exposing the secret value: check that the provider reports the variable as configured, then check startup logs and test the unsubscribe-token flow. Never print the value in logs or paste it into tickets.
- If the secret is absent/weak, startup is expected to fail. Do not weaken the validation to make deployment pass.

**Status:** repository validation is implemented; live hosting configuration is not verifiable from this repository. An operator with hosting access must confirm it.

## Supabase migration history reconciliation

The production migration ledger currently records these nine applied migrations (version → ledger name):

| Version | Recorded name |
| --- | --- |
| `20261007044036` | `0017_reconcile_production_schema` |
| `20261007051339` | `0018_public_cms_visibility_hardening` |
| `20261008044849` | `0019_reconcile_migration_18_drift` |
| `20261008085420` | `0020_harden_settings_rls` |
| `20261009164408` | `restrict_storage_object_policies` |
| `20261012050720` | `add_video_publication_controls` |
| `20261012050802` | `harden_public_insert_and_feedback_access` |
| `20261012062531` | `consolidate_permissive_rls_policies` |
| `20261012063805` | `drop_redundant_admin_revocation_index` |

The repository also contains numbered SQL files whose names do not map one-to-one to these timestamped ledger versions (for example, `0019_harden_settings_rls.sql` represents the settings-hardening change recorded in production as `0020_harden_settings_rls`; `0021_restrict_storage_object_policies.sql` is the storage-policy change recorded without the numeric prefix).

### Safe reconciliation rules

1. Treat the live Supabase migration ledger and live schema as the production record. Do not rerun applied DDL just to make filenames match.
2. Do not rewrite `0001_initial_schema.sql` as if it were a current snapshot. It is a historical baseline and includes old defaults that differ from production.
3. For every ledger entry, maintain an explicit mapping to its repository SQL file and verify the file's statements against the intended production change.
4. For schema parity, compare columns, types, nullability, defaults, indexes, constraints, RLS state/policies, grants, and relevant functions/triggers—not only table names.
5. Any missing historical migration source must be recovered from version control/deployment artifacts or documented as unrecoverable. Do not create fake historical migration entries or mark unverified changes as applied.
6. Once the mapping is reviewed, add a forward-only reconciliation migration only for a demonstrated schema difference. Test it on a disposable database before applying it to production.

**Status:** the production ledger is captured above, but complete schema parity is not claimed by this document. The mapping and full structural diff still require review.
