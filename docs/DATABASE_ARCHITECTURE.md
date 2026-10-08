# ProBitian — Database Architecture Documentation

Official Specification for the Supabase PostgreSQL Database Architecture in ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official X: [https://x.com/Probitian](https://x.com/Probitian) (@Probitian)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 1. Authoritative Production Source of Truth

**Supabase PostgreSQL** is the **SINGLE AUTHORITATIVE PRODUCTION DATABASE** for all website content, administrative settings, contact enquiries, email subscribers, media metadata, and email campaigns across ProBitian.

```
+-------------------------------------------------------------+
|               ProBitian Website / Admin Portal              |
+-------------------------------------------------------------+
                              │
                      Express API Routes
                              │
                              ▼
+-------------------------------------------------------------+
|               Supabase PostgreSQL (Cloud Database)          |
|                 SINGLE AUTHORITATIVE SOURCE OF TRUTH        |
+-------------------------------------------------------------+
```

---

## 2. Prohibition of Production Data Fallbacks

To guarantee zero data contamination and total data consistency:
- **No Local JSON Production Source**: Production Express APIs query Supabase PostgreSQL directly. `/data/cms_settings.json` is strictly an offline non-production development utility and must **never** be used as a production data source or fallback.
- **No `localStorage` Production Fallback**: Browser `localStorage` is used exclusively for client-side UI preferences (such as light/dark mode selection). It is **not** a production database.
- **No `mockData` Production Fallback**: `src/data/mockData.ts` contains development and testing fixtures only. The production application must never display mock projects, blogs, courses, or videos merely because the Supabase database contains zero records. Empty tables return empty lists.
- **No Stale Cached Content**: Production reads reflect live database state. Network or database errors produce explicit HTTP error responses (`HTTP 503 Service Unavailable`), not synthetic fallback content.

---

## 3. Major Production Database Tables

The Supabase PostgreSQL database schema comprises 20 primary tables:

| Table Name | Description | Key Fields |
| :--- | :--- | :--- |
| **`feedback`** | Authoritative visitor feedback & testimonials | `id`, `name`, `email`, `role`, `company`, `rating`, `feedback`, `service`, `consent_public`, `status`, `featured`, `created_at`, `updated_at` |
| **`profiles`** | Authenticated user profiles & RBAC roles | `id` (references `auth.users`), `email`, `full_name`, `role` (`admin`/`editor`/`user`), `avatar_url`, `created_at`, `updated_at` |
| **`leads`** | B2B CRM prospects and enterprise leads | `id`, `company_name`, `contact_person`, `email`, `phone`, `industry`, `location`, `linkedin`, `powerbi_use_case`, `lead_priority`, `status`, `follow_up_date`, `notes`, `created_at`, `updated_at` |
| **`lead_campaigns`** | B2B lead outreach email campaigns | `id`, `name`, `campaign_type`, `subject`, `preheader`, `html_content`, `status`, `total_recipients`, `successful_count`, `failed_count`, `sent_at`, `created_at`, `updated_at` |
| **`campaign_leads`** | Outreach & sequence delivery audit log per lead | `id`, `campaign_id`, `lead_id`, `lead_email`, `lead_company`, `status`, `provider_message_id`, `error_message`, `sent_at`, `created_at` |
| **`projects`** | Portfolio projects and dashboards | `id`, `title`, `slug`, `category`, `summary`, `description`, `tools`, `live_demo_url`, `github_url`, `youtube_url`, `dataset_url`, `is_featured`, `created_at` |
| **`blogs`** | Technical articles and tutorials | `id`, `title`, `slug`, `category`, `read_time`, `tags`, `excerpt`, `content`, `cover_image`, `youtube_url`, `status`, `author`, `created_at` |
| **`courses`** | Course paths and curriculum modules | `id`, `title`, `subtitle`, `category`, `level`, `duration`, `overview`, `curriculum`, `youtube_id`, `pdf_url`, `dataset_url`, `instructor`, `created_at` |
| **`videos`** | YouTube video tutorial showcase | `id`, `title`, `youtube_url`, `youtube_id`, `thumbnail`, `category`, `description`, `duration`, `created_at` |
| **`categories`** | Taxonomy categories across content | `id`, `name`, `slug`, `description`, `created_at` |
| **`pages`** | Dynamic legal & information pages | `id`, `slug`, `title`, `content`, `updated_at` |
| **`settings`** | Global settings, sequences & branding | `id`, `key`, `value`, `site_name`, `tagline`, `contact_email`, `hero_headline`, `hero_subheadline`, `community_hub_address`, `community_hub_maps_url`, `updated_at` |
| **`messages`** | Visitor contact form enquiries | `id`, `name`, `email`, `phone`, `course_interested`, `subject`, `message`, `status`, `reply_message`, `replied_at`, `admin_notes`, `created_at` |
| **`newsletter`** | Newsletter email subscribers | `id`, `email`, `status`, `created_at`, `unsubscribed_at` |
| **`media`** | Uploaded media metadata inventory | `id`, `filename`, `original_filename`, `storage_path`, `public_url`, `file_size`, `mime_type`, `category`, `uploaded_at` |
| **`email_campaigns`** | Email newsletter campaigns | `id`, `name`, `subject`, `preview_text`, `content`, `status`, `scheduled_at`, `sent_at`, `total_recipients`, `successful_count`, `failed_count`, `created_at` |
| **`email_campaign_recipients`**| Newsletter delivery log per recipient | `id`, `campaign_id`, `subscriber_id`, `email`, `status`, `provider_message_id`, `error_message`, `sent_at` |
| **`rate_limits`** | Distributed atomic rate limit counters | `key`, `count`, `reset_time`, `updated_at` |
| **`audit_logs`** | Administrative governance & security audit trail | `id`, `actor`, `role`, `action`, `resource`, `resource_id`, `ip_address`, `user_agent`, `result`, `metadata`, `created_at` |
| **`content_revisions`** | Version history & rollbacks for CMS content | `id`, `content_type`, `content_id`, `version_number`, `title`, `status`, `author`, `data`, `created_at` |
| **`admin_session_revocations`** | Multi-instance distributed session revocation | `id`, `revocation_type`, `target`, `revoked_at`, `expires_at`, `reason`, `metadata`, `created_at` |

---

## 4. Distributed Session Revocation Architecture (`public.admin_session_revocations`)

To support multi-instance horizontal scaling on Cloud Run without stale in-memory session drift:
- **`admin_session_revocations`** acts as the cluster-wide revocation registry.
- **Granular Revocation Types**:
  - `SESSION`: Revokes an individual session token by its SHA-256 hash.
  - `USER`: Revokes all sessions for a specific admin user/email created prior to `revoked_at`.
  - `GLOBAL`: Emergency cluster-wide revocation invalidating all sessions issued prior to `revoked_at`.
- **Fail-Closed Verification**: Every incoming administrative request checks the session token against `admin_session_revocations`. If a database read error occurs in production, the system fails closed with HTTP 500 (`AUTH_STORE_UNAVAILABLE`), preventing unauthorized bypasses. During local development or schema-cache transition where the remote table is not yet provisioned (`PGRST205`), the revocation store gracefully falls back to memory tracking.
- **Automated Pruning**: Expired revocation tombstones can be safely cleaned via the database maintenance function `public.prune_expired_session_revocations(current_epoch_ms)`.

---

## 4. Automated Sequence Data Architecture (`public.settings` & `public.campaign_leads`)

Automated email sequence metadata, multi-step configs, and lead enrollments are stored directly in Supabase PostgreSQL:
- **`crm_lead_sequences`**: Sequence definitions, titles, description, and status (`Active`, `Paused`, `Draft`).
- **`crm_sequence_steps`**: Ordered sequence steps (`step_number`, `delay_days`, `subject`, `preheader`, `html_content`, `enabled`).
- **`crm_sequence_leads`**: Active sequence enrollments per lead (`lead_id`, `sequence_id`, `status`, `current_step`, `next_send_at`, `last_sent_at`, `stop_reason`).
- **`crm_sequence_deliveries` & `campaign_leads`**: Immutable delivery logs per step execution with provider message IDs and timestamps.

---

## 5. Settings Table Security & RLS Isolation (`public.settings`)

To prevent sensitive CRM and outreach enumeration while serving public CMS configuration:
- **Strict Public Allowlist Policy**: The public SELECT RLS policy on `public.settings` (`Public read settings allowlist`) strictly permits rows matching:
  `general`, `seo`, `legal`, `home`, `founder_message`, `founder`, `social_links`, `navigation_items`.
- **Private Data Protection**: Internal CRM sequences (`crm_lead_sequences`, `crm_sequence_steps`, `crm_sequence_leads`, `crm_sequence_deliveries`) and legacy backup keys are completely inaccessible to anonymous PostgREST / Data API clients.
- **Service Role Exclusivity**: Express backend handlers operate under `service_role`, maintaining authoritative access for CMS and CRM workflows while rejecting non-allowlisted keys at the application route boundary (`/api/cms/settings`).

---

## 6. Connection & Authentication Security

- Server-side Express handlers connect to Supabase using `@supabase/supabase-js` initialized with `process.env.SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`).
- Row Level Security (RLS) is enabled on all tables. Direct client-side postgREST queries using the public anonymous key are restricted (`HTTP 403 Permission Denied`), ensuring all database reads and writes are securely handled server-side.

---

*Documentation maintained by Shivam Singh — ProBitian.*
