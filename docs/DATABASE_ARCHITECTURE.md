# ProBitian — Database Architecture Documentation

Official Specification for the Supabase PostgreSQL Database Architecture in ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
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

To ensure consistency, reliability, and security:
- **No Local JSON Production Fallback**: `/data/cms_settings.json` is strictly an offline local backup. Production CMS queries must **never** silently fall back to reading or writing local JSON files if database connection fails.
- **No `localStorage` Production Fallback**: Browser `localStorage` is used exclusively for client-side UI preferences (such as light/dark mode selection). It is **not** a production database.
- **No `mockData` Production Fallback**: `src/data/mockData.ts` provides baseline seed templates for brand initialization or testing. It is **never** used to serve production content.

If Supabase PostgreSQL is unreachable or returns a database error, Express APIs return explicit HTTP error codes (`HTTP 503 Service Unavailable` or `HTTP 500 Internal Server Error`) rather than serving stale or fake fallback data.

---

## 3. Major Production Database Tables

The Supabase PostgreSQL database schema comprises 12 primary CMS tables:

| Table Name | Description | Key Fields |
| :--- | :--- | :--- |
| **`projects`** | Portfolio projects and dashboards | `id`, `title`, `slug`, `category`, `summary`, `description`, `tools`, `live_demo_url`, `github_url`, `youtube_url`, `dataset_url`, `is_featured`, `created_at` |
| **`blogs`** | Technical articles and tutorials | `id`, `title`, `slug`, `category`, `read_time`, `tags`, `excerpt`, `content`, `cover_image`, `youtube_url`, `status`, `author`, `created_at` |
| **`courses`** | Course paths and curriculum modules | `id`, `title`, `subtitle`, `category`, `level`, `duration`, `overview`, `curriculum`, `youtube_id`, `pdf_url`, `dataset_url`, `instructor`, `created_at` |
| **`videos`** | YouTube video tutorial showcase | `id`, `title`, `youtube_url`, `youtube_id`, `thumbnail`, `category`, `description`, `duration`, `created_at` |
| **`categories`** | Taxonomy categories across content | `id`, `name`, `slug`, `description`, `created_at` |
| **`pages`** | Dynamic legal & information pages | `id`, `slug`, `title`, `content`, `updated_at` |
| **`settings`** | Global website configuration & branding | `id`, `site_name`, `tagline`, `contact_email`, `hero_headline`, `hero_subheadline`, `community_hub_address`, `community_hub_maps_url`, `updated_at` |
| **`messages`** | Visitor contact form enquiries | `id`, `name`, `email`, `phone`, `course_interested`, `subject`, `message`, `status`, `reply_message`, `replied_at`, `admin_notes`, `created_at` |
| **`newsletter`** | Newsletter email subscribers | `id`, `email`, `status`, `created_at`, `unsubscribed_at` |
| **`media`** | Uploaded media metadata inventory | `id`, `filename`, `original_filename`, `storage_path`, `public_url`, `file_size`, `mime_type`, `category`, `uploaded_at` |
| **`email_campaigns`** | Email newsletter campaigns | `id`, `name`, `subject`, `preview_text`, `content`, `status`, `scheduled_at`, `sent_at`, `total_recipients`, `successful_count`, `failed_count`, `created_at` |
| **`email_campaign_recipients`**| Campaign delivery log per recipient | `id`, `campaign_id`, `subscriber_id`, `email`, `status`, `provider_message_id`, `error_message`, `sent_at` |

---

## 4. Connection & Authentication Security

- Server-side Express handlers connect to Supabase using `@supabase/supabase-js` initialized with `process.env.SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`).
- Row Level Security (RLS) is enabled on all tables. Direct client-side postgREST queries using the public anonymous key are restricted (`HTTP 403 Permission Denied`), ensuring all database reads and writes are securely handled server-side.

---

*Documentation maintained by Shivam Singh — ProBitian.*
