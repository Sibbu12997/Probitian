# ProBitian — Production Release Checklist

Official Pre-Release Audit & Verification Checklist for ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  

---

## 📋 Comprehensive Production Verification Checklist

Prior to releasing a new deployment or major update, ensure every item below is verified and checked:

### 1. Database & Infrastructure
- [x] **Supabase Project Verified**: Target reference `dlaehchzzkjsrarktfsf.supabase.co` online.
- [x] **Supabase Credentials Configured**: `SUPABASE_SECRET_KEY` configured in server environment; `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured in client.
- [x] **Database Schema Verified**: All 12 tables (`projects`, `blogs`, `courses`, `videos`, `categories`, `pages`, `settings`, `messages`, `newsletter`, `media`, `email_campaigns`, `email_campaign_recipients`) present in Supabase PostgreSQL.
- [x] **RLS Verified**: Row Level Security enabled on all tables; direct public postgREST access blocked (HTTP 403).
- [x] **Backend CMS Permissions Verified**: Service role grants executed strictly for backend Express API (`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`).
- [x] **Firebase Absent**: Zero active code, imports, or dependencies on Firebase in production.
- [x] **Cloud SQL Disabled**: Zero active code, imports, or dependencies on Cloud SQL in production.

### 2. Email & Communications
- [x] **Newsletter Subscriptions Tested**: `POST /api/newsletter` saves subscribers to Supabase.
- [x] **Welcome Email Tested**: Welcome email dispatched via Gmail SMTP (`probitianofficial@gmail.com`) only after DB persistence.
- [x] **Contact Form Tested**: Visitor enquiries saved to Supabase `messages` table and alert emails sent.
- [x] **Admin Reply Tested**: Direct email replies sent from Admin Messages Inbox via Gmail SMTP.
- [x] **Campaign Save Tested**: `POST /api/admin/email-campaigns` upserts drafts to Supabase `email_campaigns`.
- [x] **Campaign Test Email Tested**: Test emails dispatched successfully.
- [x] **Campaign Status Tracking Tested**: Campaign status lifecycle (`draft` → `sending` → `sent`) and recipient delivery logs (`email_campaign_recipients`) functioning.

### 3. Media & Storage
- [x] **Media Upload Tested**: Files uploaded to Supabase Storage `probitian-media` bucket and metadata written to `public.media`.
- [x] **Media Deletion Tested**: Files removed from Supabase Storage and metadata deleted from database.
- [x] **SVG Security Verified**: DOMPurify sanitization strips scripts from uploaded SVG graphics.
- [x] **Branding Tested**: Logo and banner assets selectable from Media Library and rendered globally.

### 4. Analytics, Routing & Security
- [x] **GA4 Verified**: Google Analytics 4 Measurement ID configured and client events firing.
- [x] **API 404 Handling Verified**: Catch-all `app.all('/api/*', ...)` returns JSON `404` errors before SPA fallback.
- [x] **Secrets Isolated**: Zero client exposures of `SUPABASE_SECRET_KEY`, `GMAIL_APP_PASSWORD`, `ADMIN_PASSKEY`, or `GEMINI_API_KEY`.

### 5. Quality & Build
- [x] **Typecheck Passed**: `npm run lint` (`tsc --noEmit`) exits with code 0.
- [x] **Production Build Passed**: `npm run build` completes with zero errors.
- [x] **Fresh Deployment Tested**: Application verified live at `https://probitian.ai.studio/`.
- [x] **Data Persistence Verified**: Subscriptions, messages, and settings persist safely across container restarts.

---

*Checklist verified by Shivam Singh — ProBitian.*
