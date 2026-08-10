# ProBitian Database Migration & Schema Management Guide

## 1. Production Database Architecture & Source of Truth

**Supabase PostgreSQL** is the **SINGLE AUTHORITATIVE SOURCE OF TRUTH** for all production CMS data across ProBitian:

```
Public Website / Admin Portal
            ↓
    Express Backend API
            ↓
   Supabase PostgreSQL
            ↓
  SOURCE OF TRUTH (PERSISTENT)
```

- **Local JSON (`/data/cms_settings.json`)**: Used exclusively as an offline development fallback or emergency read-only cache. Local JSON must **NEVER** overwrite newer Supabase records.
- **`localStorage`**: Reserved strictly for client UI preferences (e.g. dark/light theme, collapsed sidebar state).
- **`mockData.ts`**: Provides initial fallback seed data for local development when Supabase is completely unconfigured.

---

## 2. Migration Directory Structure

All database schema definitions and incremental changes are maintained strictly as sequential SQL files inside:

```
supabase/
└── migrations/
    ├── 0001_initial_schema.sql       # Initial baseline schema & RLS policies
    ├── 0002_add_message_fields.sql   # Contact enquiry reply & phone fields
    ├── 0003_add_campaign_tables.sql  # Email newsletter campaign & recipient tables
    ├── 0004_grant_table_permissions.sql # Table grants and permissions for Supabase API roles
    └── 0005_upgrade_media_storage.sql # Upgrade media storage bucket & metadata table schema
```

---

## 3. Migration Naming Convention

Every schema change file MUST follow this naming convention:

`<FOUR_DIGIT_SEQUENCE>_<DESCRIPTIVE_SNAKE_CASE_NAME>.sql`

### Examples:
- `0001_initial_schema.sql`
- `0002_add_message_fields.sql`
- `0003_add_campaign_tables.sql`
- `0004_add_course_prerequisites.sql`

---

## 4. CRITICAL NON-NEGOTIABLE MIGRATION RULES

> 🚨 **GOLDEN RULE**: **NEVER edit an already-applied production migration. Always create a NEW migration file for any future change.**

1. **FORWARD-ONLY MIGRATIONS**:
   - Never alter or replace `0001_initial_schema.sql` or `0002_add_message_fields.sql` after they have been deployed.
   - If a table needs a new column or modified type, create `0004_<change_description>.sql`.

2. **SAFE NON-DESTRUCTIVE SQL**:
   - Always use idempotent SQL constructs:
     - `ADD COLUMN IF NOT EXISTS`
     - `CREATE TABLE IF NOT EXISTS`
     - `CREATE INDEX IF NOT EXISTS`
   - **DO NOT** issue `DROP TABLE`, `TRUNCATE`, or `DELETE FROM` without explicit administrative confirmation.

3. **SERVER SECRET ISOLATION**:
   - Production migrations and server-side database writes use `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
   - Never expose server keys in client bundles, `localStorage`, or API logs.

---

## 5. Schema Change Development Workflow

Follow this step-by-step workflow for all future database schema modifications:

1. **Identify Data Model Needs**: Determine if the change requires a database column, table, index, or RLS policy modification.
2. **Create a New Migration File**: Add a new file in `supabase/migrations/` with the next sequence number (e.g., `0004_...sql`).
3. **Write Safe SQL**:
   ```sql
   ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS prerequisite_ids UUID[] DEFAULT '{}';
   ```
4. **Test Migration Locally**: Apply the SQL script to a local or staging Supabase project SQL Editor.
5. **Update TypeScript Interfaces**: Update `/src/types.ts` and Express server models to align with the new database schema.
6. **Verify CRUD Operations**: Test GET, POST, PATCH, and DELETE API endpoints.
7. **Apply to Production Supabase**: Run the migration in the Production Supabase SQL Editor.
8. **Deploy Application Code**: Deploy the backend and frontend code after verifying database readiness.
9. **Post-Deployment Verification**: Verify `/api/cms/status` returns `databaseConnected: true` and verify existing records remain intact.

---

## 6. Emergency Rollback Procedures

If a migration causes unexpected application errors:

1. **Do NOT delete records**.
2. Roll back application code to the prior release.
3. If necessary, write a compensating forward migration (e.g. `0005_revert_course_prerequisites.sql`) to safely remove or drop the unused column:
   ```sql
   ALTER TABLE public.courses DROP COLUMN IF EXISTS prerequisite_ids;
   ```
