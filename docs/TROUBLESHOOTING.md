# ProBitian — Operational Troubleshooting Guide

Official Troubleshooting & Problem Resolution Manual for ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 📋 Common Issues & Resolutions

### 1. API Returns HTML Instead of JSON

- **Problem**: API call to `/api/...` returns `<!DOCTYPE html>` or HTML content instead of JSON object.
- **Cause**: The Express router failed to match the API endpoint before reaching the SPA fallback wildcard handler (`app.get('*', ...)`).
- **How to Verify**: Inspect Network tab in browser DevTools and check response `Content-Type`. If `text/html`, endpoint route is unmatched or misspelt.
- **Solution**: Ensure API route path matches Express server handler registration exactly. Ensure catch-all `app.all('/api/*', ...)` is mounted before static SPA fallback.
- **Prevention**: Always register custom `/api` routes above Vite/static fallback middlewares in `server.ts`.

---

### 2. Supabase Permission Denied (HTTP 403)

- **Problem**: API calls to Supabase PostgreSQL return `HTTP 403 Permission Denied` or `permission denied for table ...`.
- **Cause**: Row Level Security (RLS) is active on the table, but table grants for the `service_role` or API user have not been executed.
- **How to Verify**: Run `SELECT * FROM table_name;` via server client vs direct postgREST client. Server client using service role key fails if table grants are missing.
- **Solution**: Open Supabase SQL Editor and run:
  ```sql
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
  ```
  *(Note: This grants access strictly to the backend `service_role` and does not expose tables to public `anon` or `authenticated` roles, which are governed strictly by Row-Level Security).*
- **Prevention**: Always include explicit `GRANT ALL` statements in migration scripts that create new database tables.

---

### 3. Newsletter Subscription Fails

- **Problem**: Submitting the newsletter subscription form returns an error or HTTP 503 response.
- **Cause**: Supabase PostgreSQL is unreachable or the `newsletter` table schema is missing.
- **How to Verify**: Check browser console network response for `POST /api/newsletter`. Look for database write failure errors in server logs.
- **Solution**: Ensure Supabase database connection is online and verify `SUPABASE_SECRET_KEY` is set in server environment.
- **Prevention**: Regularly test newsletter API endpoints and maintain automated error logging.

---

### 4. Welcome Email Not Received

- **Problem**: Newsletter subscriber is recorded in the database, but no welcome email arrives.
- **Cause**: Gmail SMTP transport failed due to invalid credentials, network blockage, or rate limits.
- **How to Verify**: Check server log output for Nodemailer SMTP errors (`Invalid login`, `ETIMEDOUT`, or `454 4.7.0`).
- **Solution**: Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` environment variables in server settings. Generate a fresh Google App Password if necessary.
- **Prevention**: Test Gmail SMTP dispatch periodically using test scripts or the Admin test email tool.

---

### 5. Gmail SMTP Authentication Failure

- **Problem**: Server logs display `Error: Invalid login: 535-5.7.8 Username and Password not accepted`.
- **Cause**: Incorrect Gmail username, revoked Google App Password, or standard password used instead of a dedicated App Password.
- **How to Verify**: Inspect Nodemailer error code `EAUTH` in Express logs.
- **Solution**:
  1. Log into Google Account for `probitianofficial@gmail.com`.
  2. Enable 2-Step Verification.
  3. Generate a new App Password under Security -> App Passwords.
  4. Update `GMAIL_APP_PASSWORD` in the server environment and restart the server.
- **Prevention**: Use dedicated 16-character Google App Passwords instead of personal Google account passwords.

---

### 6. Email Campaign Doesn't Save

- **Problem**: Clicking "Save Campaign" in the Admin Email Campaign Manager displays an error or fails to persist.
- **Cause**: Missing `email_campaigns` table or invalid JSON body parameters.
- **How to Verify**: Check network response for `POST /api/admin/email-campaigns`.
- **Solution**: Ensure migration `0003_add_campaign_tables.sql` is applied to Supabase PostgreSQL and service_role permissions are granted.
- **Prevention**: Verify database schema completeness before releasing campaign management features.

---

### 7. Email Campaign Doesn't Send

- **Problem**: Clicking "Send Campaign" sets campaign status to `failed` or fails to broadcast to subscribers.
- **Cause**: Active subscriber list is empty, or Gmail SMTP connection dropped during broadcast.
- **How to Verify**: Check Supabase `email_campaigns` and `email_campaign_recipients` tables for status logs.
- **Solution**: Ensure active subscribers exist in the `newsletter` table (`status = 'active'`). Check Gmail SMTP credentials.
- **Prevention**: Send a test email first to verify SMTP transport before initiating bulk broadcasts.

---

### 8. Media Upload Failure

- **Problem**: Uploading an image or PDF in the Media Library returns an upload error.
- **Cause**: File size exceeds 10MB limit, invalid mime type, or Supabase Storage bucket missing.
- **How to Verify**: Check network response for `POST /api/cms/media/upload`. Inspect Supabase Storage dashboard.
- **Solution**: Ensure `probitian-media` bucket exists in Supabase Storage with public access enabled.
- **Prevention**: Enforce client-side file size pre-checks before submitting uploads.

---

### 9. Supabase Storage Failure

- **Problem**: Uploaded images display broken link icons on the public website.
- **Cause**: Supabase Storage bucket is marked private or storage URL is misconfigured.
- **How to Verify**: Copy the image URL and open it directly in a browser tab. If HTTP 403 or `Bucket not found`, bucket permissions are restricted.
- **Solution**: In Supabase Dashboard -> Storage -> `probitian-media` -> Settings, toggle **Public Bucket = True**.
- **Prevention**: Always configure media storage buckets with public read policies.

---

### 10. Admin Page Data Missing

- **Problem**: Navigating to an Admin Control Center module displays blank tables or empty inputs.
- **Cause**: Expired or missing Admin Passkey session token (`x-admin-token`), or database query returned empty results.
- **How to Verify**: Open browser DevTools Network tab and check API response status code (`401 Unauthorized`).
- **Solution**: Log out of the Admin Portal and re-authenticate using the correct `ADMIN_PASSKEY`.
- **Prevention**: Set clear session expiry notices in the UI.

---

### 11. Light / Dark Mode Display Issue

- **Problem**: Certain UI elements show poor color contrast or invisible text when switching themes.
- **Cause**: Hardcoded color utility classes (e.g., `text-black`) missing theme-specific overrides (`dark:text-white`).
- **How to Verify**: Toggle light/dark theme using header sun/moon button and inspect affected DOM elements.
- **Solution**: Apply dual Tailwind color classes (e.g., `text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900`).
- **Prevention**: Use semantic color pairings across all component templates.

---

### 12. GA4 Analytics Not Showing Data

- **Problem**: GA4 Command Center in Admin shows zero visitors or empty charts.
- **Cause**: `VITE_GA4_MEASUREMENT_ID` is missing, or ad blockers are blocking analytics client scripts.
- **How to Verify**: Check browser console for `gtag` initialized message or network requests to `www.google-analytics.com`.
- **Solution**: Verify `VITE_GA4_MEASUREMENT_ID` in `.env`. Disable ad-blocker extensions during testing.
- **Prevention**: Include graceful fallbacks in the Admin UI if GA4 script loading is blocked.

---

### 13. Migration Not Applied

- **Problem**: New feature fails because a database column or table is missing in production.
- **Cause**: SQL migration file exists in `supabase/migrations/` but was never executed on the production Supabase PostgreSQL instance.
- **How to Verify**: Query `information_schema.tables` or `information_schema.columns` in Supabase SQL Editor.
- **Solution**: Copy the SQL content from the migration file in `supabase/migrations/` and run it manually in the Supabase SQL Editor.
- **Prevention**: Always follow the [Deployment Workflow](DEPLOYMENT_WORKFLOW.md) and verify schema changes in production after deploying code.

---

### 14. Production Data Missing After Republish

- **Problem**: Data appears missing or reset after a server deployment.
- **Cause**: Application code attempted to rely on local JSON files or temporary container memory instead of querying Supabase PostgreSQL.
- **How to Verify**: Verify Supabase PostgreSQL database directly using Supabase Dashboard table editor. If data exists in Supabase, client code is querying the wrong endpoint.
- **Solution**: Ensure Express backend endpoints fetch data directly from Supabase PostgreSQL using `SUPABASE_SECRET_KEY`.
- **Prevention**: Never store production application state in local JSON files or local container filesystems.

---

### 15. CSV Import Fails or Appears Empty

- **Problem**: Uploading a CSV in B2B Leads CRM displays zero leads or shows "No valid leads found".
- **Cause**: Header row is missing or contains unsupported column names.
- **How to Verify**: Check the first row of your CSV. Ensure headers include at least `company_name` (or `company`) and `email` (or `work_email`).
- **Solution**: Normalize headers to standard format: `company_name,contact_person,email,phone,industry,location,powerbi_use_case,lead_priority,status`. Re-upload the file.
- **Prevention**: Use the standard CSV template provided in the documentation.

---

### 16. Automated Sequence Step Not Sending

- **Problem**: Lead is enrolled in an Active sequence, but no email is delivered when expected.
- **Cause**: The lead is in a terminal status (`Replied`, `Interested`, `Converted`, `Do Not Contact`, `Bounced`), the sequence is paused, or `next_send_at` time is in the future.
- **How to Verify**: Open the Lead Details Drawer in CRM and inspect the sequence enrollment state and `next_send_at` timestamp.
- **Solution**: Verify sequence status is `Active`. If you want to force immediate evaluation, click **Process Due Steps Now** in the Email Sequences module.
- **Prevention**: Verify step delay days (`delay_days`) when creating or editing sequences.

---

### 17. Sequence Still Sending After Prospect Responded

- **Problem**: Automated emails continue to send to a prospect who already replied by email.
- **Cause**: Lead status in CRM was not updated from `Contacted` to a terminal status (`Replied`, `Interested`, `Demo Requested`).
- **How to Verify**: Look up the lead in B2B Leads CRM and check their current status column.
- **Solution**: Change the lead's status to `Replied` or `Interested`, or open the Lead Drawer and click **Stop** on the active sequence.
- **Prevention**: Establish a daily habit of updating lead status when reviewing replies in your Gmail inbox.

---

### 18. Personalization Variable Tags Appear Raw in Email

- **Problem**: Delivered email contains literal `{{company_name}}` or `{{contact_person}}` text instead of lead details.
- **Cause**: Typos in tag syntax (e.g., single braces `{company}` or mismatched spaces) or the lead record has blank values for that field.
- **How to Verify**: Check the step template in Email Sequences and verify the lead record in B2B Leads CRM.
- **Solution**: Use standard supported tags: `{{company_name}}`, `{{contact_person}}`, `{{first_name}}`, `{{industry}}`, `{{location}}`, `{{powerbi_use_case}}`. Ensure lead records have values populated.
- **Prevention**: Always use the **Send Test Email** feature to preview rendered output before launching broad sequences.

---

### 19. Duplicate Sequence Enrollment

- **Problem**: An administrator attempts to enroll the same lead into the same sequence twice.
- **Cause**: Multiple selection without checking existing enrollments.
- **How to Verify**: Server enrollment logic checks `crm_sequence_leads` for active enrollment.
- **Solution**: The system automatically detects and prevents active duplicate enrollments, updating status safely.
- **Prevention**: Review the enrollment summary modal before confirming batch sequence launches.

---

*Documentation maintained by Shivam Singh — ProBitian.*
