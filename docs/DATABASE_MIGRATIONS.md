# ProBitian — Database Migrations & Schema Management Guide

Official Database Migration Specification for ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official X: [https://x.com/Probitian](https://x.com/Probitian) (@Probitian)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 1. Production Database Architecture & Source of Truth

**Supabase PostgreSQL** is the **SINGLE AUTHORITATIVE SOURCE OF TRUTH** for all production data in ProBitian:

```
Public Website / Admin Portal
            ↓
    Express Backend API
            ↓
   Supabase PostgreSQL
            ↓
  SOURCE OF TRUTH (PERSISTENT)
```

- **Local JSON (`/data/cms_settings.json`)**: Used exclusively for offline local development backups. Local JSON is **NOT** a production database or fallback.
- **`localStorage`**: Reserved strictly for client UI state (e.g., dark/light theme choice).
- **`mockData.ts`**: Provides initial seed structure for brand resets or dev environment testing. It is **NOT** used in production.

---

## 2. Migration Directory Structure & History

All database schema definitions and incremental changes are maintained as sequential SQL files inside `supabase/migrations/`:

```
supabase/
└── migrations/
    ├── 0001_initial_schema.sql                 # Baseline CMS schema & initial RLS policies
    ├── 0002_add_message_fields.sql             # Contact enquiry reply, phone, & status fields
    ├── 0003_add_campaign_tables.sql            # Email campaign & recipient tracking tables
    ├── 0004_grant_table_permissions.sql        # Table grants and permissions for service_role
    ├── 0005_upgrade_media_storage.sql           # Upgrade media metadata schema & storage bucket
    ├── 0006_fix_newsletter_permissions.sql      # Harden newsletter RLS and service_role grants
    ├── 0007_harden_security_and_least_privilege.sql # RLS hardening & least privilege security
    ├── 0008_add_linkedin_social_link.sql       # Official LinkedIn social channel configuration
    ├── 0009_add_lead_outreach_tables.sql       # B2B CRM leads, lead_campaigns, campaign_leads tables
    ├── 0010_grant_crm_table_permissions.sql    # service_role grants for leads & campaign_leads
    ├── 0011_harden_crm_and_sensitive_rls.sql   # Strict private RLS for CRM & campaign logs
    ├── 0012_add_x_social_link.sql              # Official X (@Probitian) social link configuration
    ├── 0013_atomic_rate_limiting.sql           # Atomic PostgreSQL RPC for distributed rate limiting
    ├── 0014_governance_and_audit_logs.sql       # Administrative audit logs and content revision history
    ├── 0015_distributed_admin_session_revocation.sql # Multi-instance distributed admin session revocation
    ├── 0016_add_feedback_table.sql             # Public feedback & testimonials table and RLS
    ├── 0017_reconcile_production_schema.sql     # Live production schema reconciliation (feedback, profiles, triggers)
    ├── 0018_security_privilege_reconciliation.sql # Forward-only privilege lockdown (least privilege RPCs, content RLS)
    ├── 0019_harden_settings_rls.sql            # Restrict public settings SELECT to allowlisted public keys (shield CRM & sequences)
    └── 0021_restrict_storage_object_policies.sql # Restrict storage.objects policies (drops Auth upload storage & Public storage access)
```

---

## 3. Migration File Inventory vs. Applied Production State

> 🚨 **IMPORTANT — REPOSITORY FILES VS. PRODUCTION STATE**:
> - The live production Supabase PostgreSQL instance has already been reconciled through migration **`0017`**.
> - **Migration `0018`** is the forward-only security privilege reconciliation script that restricts function execution (`increment_rate_limit`, `prune_expired_session_revocations`, `handle_auth_user_profile`, `handle_new_user`, `rls_auto_enable`) strictly to `service_role` (revoking execution from `anon` and `authenticated`), sets `consent_public DEFAULT false` on `feedback`, and reinforces content table RLS policies.
> - **Migration `0019`** is the forward-only settings RLS hardening script that locks down `public.settings` SELECT policy to an explicit allowlist of public CMS configuration keys (`general`, `seo`, `legal`, `home`, `founder_message`, `founder`, `social_links`, `navigation_items`), ensuring CRM, sequence, audit, and internal system configurations cannot be enumerated anonymously via direct Supabase Data API access.
> - **Migration `0021` (`restrict_storage_object_policies`, Supabase version `20261009164408`)**: Forward-only storage security migration that drops broad `Auth upload storage` and `Public storage access` policies on `storage.objects`. Enforces that all media uploads route through the Express backend with server-authoritative authentication, RBAC (`EDIT_CONTENT`), MIME validation, SVG sanitization, and path traversal protection. Preserves public asset delivery via CDN public object URLs while completely blocking direct anonymous or authenticated browser client upload, update, deletion, and bucket enumeration.
> - **DO NOT reset the database, truncate data, or rerun migrations `0001` through `0017`** against the live production database. All historical and production data must be preserved.
> - The presence of a `.sql` file in `supabase/migrations/` documents repository migration history; each migration must be explicitly applied and verified against the live PostgreSQL instance.

| Migration | Name | Description | Key Objects Created / Altered |
| :--- | :--- | :--- | :--- |
| `0001` | `initial_schema.sql` | Baseline CMS schema & initial RLS policies | `projects`, `blogs`, `courses`, `videos`, `categories`, `pages`, `settings`, `messages`, `newsletter`, `media` |
| `0002` | `add_message_fields.sql` | Contact enquiry reply, phone, & status fields | `messages.phone`, `messages.status`, `messages.reply_message`, `messages.replied_at` |
| `0003` | `add_campaign_tables.sql` | Email campaign & recipient tracking tables | `email_campaigns`, `email_campaign_recipients` |
| `0004` | `grant_table_permissions.sql`| Table grants & service_role permissions | Explicit `GRANT ALL` on CMS tables to `service_role` |
| `0005` | `upgrade_media_storage.sql` | Media metadata schema & storage bucket | Upgraded `media` metadata and storage configuration |
| `0006` | `fix_newsletter_permissions.sql` | Harden newsletter RLS and grants | `newsletter` RLS insert-only for public, full for `service_role` |
| `0007` | `harden_security_and_least_privilege.sql` | Security hardening & least privilege | Hardened RLS policies across all public tables |
| `0008` | `add_linkedin_social_link.sql` | Official LinkedIn social channel | Seeds LinkedIn URL in `settings` |
| `0009` | `add_lead_outreach_tables.sql`| B2B CRM leads & outreach tables | `leads`, `lead_campaigns`, `campaign_leads` |
| `0010` | `grant_crm_table_permissions.sql`| CRM table grants for backend | `GRANT ALL` on CRM tables to `service_role` |
| `0011` | `harden_crm_and_sensitive_rls.sql`| Strict private RLS for CRM data | Restricts CRM & delivery logs strictly to `service_role` |
| `0012` | `add_x_social_link.sql` | Official X (@Probitian) social link | Seeds X link in `settings` |
| `0013` | `atomic_rate_limiting.sql` | Atomic PostgreSQL RPC rate limiting | `rate_limits` table and RPC `increment_rate_limit()` |
| `0014` | `governance_and_audit_logs.sql` | Administrative audit logs & revisions | `audit_logs` and `content_revisions` tables |
| `0015` | `distributed_admin_session_revocation.sql` | Multi-instance session revocation | `admin_session_revocations` table and pruning function |
| `0016` | `add_feedback_table.sql` | Public feedback & testimonials table | `feedback` table, indexes, and initial RLS |
| `0017` | `reconcile_production_schema.sql` | Live production reconciliation | Reconciles `feedback`, `profiles`, automatic user trigger |
| `0018` | `security_privilege_reconciliation.sql` | Forward-only privilege lockdown | Revokes RPC execution from `anon`/`authenticated`; hardens content RLS |
| `0019` | `harden_settings_rls.sql` | Restrict settings public SELECT policy | Limits `public.settings` SELECT to allowlisted keys, shielding CRM & sequences |
| `0021` | `restrict_storage_object_policies.sql` | Restrict direct Storage uploads & listing | Drops broad `Auth upload storage` and `Public storage access` from `storage.objects` |

---

## 4. Standard Migration Workflow

When schema modifications are required:

1. **Create Migration SQL File**: Add a new sequential SQL script in `supabase/migrations/` (e.g., `0007_add_new_feature_table.sql`).
2. **Review SQL for Safety**:
   - Ensure non-destructive idempotency (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
   - Never write `DROP TABLE`, `TRUNCATE`, or `DELETE FROM` in automated migration files.
3. **Back Up Production Data**: Export a full JSON database snapshot from the Admin Control Center (**Backup & Restore** module) prior to applying schema changes.
4. **Apply Migration**: Execute the SQL migration script in the Supabase SQL Editor.
5. **Verify Schema**: Confirm column types, default values, foreign keys, and indexes in the Supabase Dashboard.
6. **Verify Permissions & RLS**: Ensure `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;` is executed for newly created tables (this applies strictly to backend `service_role` and keeps `anon`/`authenticated` locked down under RLS).
7. **Test Application Endpoints**: Test Express backend API routes against the updated schema.
8. **Record Migration Status**: Document the applied migration timestamp and version in deployment logs.
9. **Never Run Destructive Startup Operations**: Application startup (`server.ts`) must **NEVER** drop tables, clear data, or run destructive resets on boot.

---

## 5. Non-Negotiable Migration Guidelines

1. **FORWARD-ONLY MIGRATIONS**:
   - Never edit or alter an already-applied migration file in repository history.
   - Always create a new migration file for future modifications.
2. **SERVICE ROLE ISOLATION**:
   - Production operations execute server-side using `SUPABASE_SECRET_KEY`.
   - Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser or public repositories.

---

*Documentation maintained by Shivam Singh — ProBitian.*
