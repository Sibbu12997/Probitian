# Legacy migration history

The former individually numbered SQL files have been removed from the active `supabase/migrations/` directory as part of repository consolidation. Their full contents remain available in Git history before the consolidation commit.

## Previous active-directory inventory

- `0001_initial_schema.sql`
- `0002_add_message_fields.sql`
- `0003_add_campaign_tables.sql`
- `0004_grant_table_permissions.sql`
- `0005_upgrade_media_storage.sql`
- `0006_fix_newsletter_permissions.sql`
- `0007_harden_security_and_least_privilege.sql`
- `0008_add_linkedin_social_link.sql`
- `0009_add_lead_outreach_tables.sql`
- `0010_grant_crm_table_permissions.sql`
- `0011_harden_crm_and_sensitive_rls.sql`
- `0012_add_x_social_link.sql`
- `0013_atomic_rate_limiting.sql`
- `0014_governance_and_audit_logs.sql`
- `0015_distributed_admin_session_revocation.sql`
- `0016_add_feedback_table.sql`
- `0017_reconcile_production_schema.sql`
- `0018_security_privilege_reconciliation.sql`
- `0019_harden_settings_rls.sql`
- `0021_restrict_storage_object_policies.sql`
- `20261012050720_add_video_publication_controls.sql`
- `20261012050802_harden_public_insert_and_feedback_access.sql`
- `20261012062531_consolidate_permissive_rls_policies.sql`
- `20261012063805_drop_redundant_admin_revocation_index.sql`

## Production warning

The existing production Supabase project has its own nine-entry migration ledger, including timestamped versions that do not map one-to-one to the former filenames. Removing files from Git does not delete production objects or rewrite that ledger. **Do not reset or rewrite production migration history, and do not run the consolidated baseline against production.**

The consolidated baseline is for creating a new, empty Supabase project only. Existing production changes must use reviewed forward-only migrations and be validated against the live schema first. This file is an inventory, not executable SQL.
