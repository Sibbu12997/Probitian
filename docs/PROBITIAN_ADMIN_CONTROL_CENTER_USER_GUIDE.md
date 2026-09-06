# ProBitian Admin Control Center — User Guide

Official Administrative Management Guide for Authorized ProBitian Portal Administrators.

Project Owner: **Shivam Singh**
Official Website: https://probitian.ai.studio/
Official Communication Email: probitianofficial@gmail.com
Official X: https://x.com/Probitian (@Probitian)
Official LinkedIn: https://www.linkedin.com/company/probitian/

## 1. Introduction & Security Guidance
The ProBitian Admin Control Center (/admin) is a secure management portal for authorized administrators to control website content, analyze GA4 traffic, manage contact inquiries, send email responses, maintain subscribers, broadcast email campaigns, manage media assets, and configure brand settings.

### Critical Security Instructions
- **Never Share Credentials**: Do not share the Admin Passkey or login URL.
- **Server-Side Secret Isolation**: Secret environment variables (ADMIN_PASSKEY, SUPABASE_SECRET_KEY, GMAIL_APP_PASSWORD, GEMINI_API_KEY) must remain strictly server-side.
- **No Client Secrets**: Never place server secrets in frontend code, git commits, README files, or public documentation.

## 2. Production Architecture Overview
ProBitian utilizes a clean, server-side verified architecture:
- **Database**: Supabase PostgreSQL is the SINGLE authoritative source of truth.
- **Media Storage**: Supabase Storage (`probitian-media` bucket) stores all uploaded images, PDFs, logos, and banners.
- **Email Delivery**: Server-side Express engine via **Gmail SMTP** (`probitianofficial@gmail.com`).
- **Analytics**: Google Analytics 4 (GA4) integration.
- **Removed / Unused Infrastructure**: Firebase, Cloud SQL, Drizzle, and Resend are NOT used in production.

## 3. Admin Authentication & Access Control
### Accessing the Admin Portal
1. Navigate to the `/admin` route (e.g., `https://probitian.ai.studio/admin`).
2. Authentication Modes:
   - **Admin Passkey**: Enter the authorized administrator passkey and click **Unlock Admin Portal**. Validated server-side via constant-time SHA-256 comparison against `ADMIN_PASSKEY`.
   - **Supabase OAuth**: Sign in with an authorized Google or GitHub account linked to `CONFIGURED_ADMIN_EMAILS` or `profiles.role === 'admin'`.
3. The server sets an `HttpOnly`, `Secure`, `SameSite=Lax` session cookie (`admin_session`) signed with HMAC-SHA-256. The session token is never sent in the JSON body or stored in browser storage.
4. **First-Party vs. Embedded Iframe Navigation**:
   - In a normal top-level browser tab, HttpOnly cookies work natively without warning.
   - If accessed inside an embedded preview iframe (`window.self !== window.top`), modern browser third-party cookie restrictions may block cookie persistence. The portal detects this context and provides an **Open in New Tab** button so administrators can unlock full access seamlessly.
5. **Session Verification & Distributed Revocation**:
   - On page load, the portal verifies session health via `GET /api/admin/session`.
   - The backend checks the token signature and verifies against `public.admin_session_revocations` in Supabase PostgreSQL, ensuring multi-instance synchronization on Cloud Run.
6. **Navigation Controls**:
   - **Back to Website**: Navigates back to the public homepage without destroying the active session cookie.
   - **Logout**: Calls `POST /api/admin/logout`, records the token hash in the distributed revocation registry, clears the `admin_session` cookie, and redirects to the login screen.

## 4. Comprehensive Admin Modules Guide
The Admin Portal features 22 comprehensive management modules organized into 5 functional navigation sections:

### Section 1: Analytics & Overview

#### 1. Dashboard Overview (`overview`)
- **Function**: Executive command center summary and operational launchpad.
- **Features**: Real-time KPI metrics (Active Visitors Now, Today's Pageviews, Pending Messages, Total Subscribers, Total Leads), quick shortcut buttons for core content actions, and live system health status.

#### 2. GA4 Analytics Command Center (`analytics`)
- **Function**: Traffic analysis, audience engagement, and conversion tracking via Google Analytics 4.
- **Features**: Active visitors count, date range filters (7D, 30D, 90D, Custom), total page views, average session duration, top pages report, traffic referral sources, device breakdown, and event conversion counters.

---

### Section 2: Lead Outreach & CRM

#### 3. B2B Leads CRM (`b2b-leads`)
- **Function**: Centralized enterprise lead directory for Power BI consulting, corporate training, and analytics opportunities.
- **Features**:
  - Full tabular directory with search, industry filters, priority filters (`High`, `Medium`, `Low`), and status filters (`Not Contacted`, `Contacted`, `Replied`, `Demo Scheduled`, `Interested`, `Proposal Sent`, `Converted`, `Do Not Contact`).
  - Single and bulk lead deletion.
  - CSV bulk import with automatic header normalization and export to CSV.
  - Slide-out Lead Details Drawer with contact history, follow-up calendar, and automated sequence status.

#### 4. Email Sequences (`email-sequences`)
- **Function**: Multi-step automated email drip workflows for prospect nurturing and onboarding.
- **Features**:
  - Create and manage multi-step sequences (`Active`, `Paused`, `Draft`).
  - Configure step timing delays (`delay_days`), subject lines, preheaders, and rich HTML templates with dynamic tags (`{{company_name}}`, `{{contact_person}}`, `{{industry}}`, `{{location}}`, `{{powerbi_use_case}}`).
  - Process due steps button and automated stop rules upon prospect reply.

#### 5. Lead Outreach Campaigns (`lead-campaigns`)
- **Function**: Targeted broadcast campaigns for B2B prospects and corporate contacts.
- **Features**:
  - Segment leads by industry, priority, or lifecycle stage.
  - Draft personalized broadcast emails, execute test dispatches to verified addresses, and broadcast via Gmail SMTP with per-lead delivery logs in `campaign_leads`.

---

### Section 3: Content Manager

#### 6. Home Page Editor (`home-editor`)
- **Function**: Control hero headlines, statistics, CTA banners, and value pillars on the public homepage.
- **Workflow**: Edit headline, subheadline, CTA text/links, hero stats, and feature cards; click **Save Changes** to persist to Supabase PostgreSQL.

#### 7. Projects Portfolio Manager (`projects`)
- **Function**: Create, edit, publish, tag, and reorder portfolio projects.
- **Workflow**: Set Title, Category, Summary, Full Description, and Tools Used. Attach Live Interactive Demo URL, GitHub repo, YouTube walkthrough, and downloadable dataset file. Toggle **Featured** flag.

#### 8. Blog & Articles Manager (`blogs`)
- **Function**: Draft, schedule, publish, or edit technical articles and guides.
- **Workflow**: Set Article Title, URL Slug, Category, Read Time, Tags, Excerpt, and full Markdown content. Attach Cover Image and optional YouTube video link. Set status to **Draft** or **Published**.

#### 9. Learn & Courses Manager (`courses`)
- **Function**: Manage skill learning tracks, course curriculum modules, video lessons, PDFs, and practice datasets.
- **Workflow**: Set Course Title, Subtitle, Category (Power BI, SQL, Excel, Python, AI), Skill Level, and Duration. Attach YouTube Video IDs, PDF cheat sheet links, and practice dataset downloads.

#### 10. YouTube Showcase Manager (`videos`)
- **Function**: Organize curated video tutorials, playlists, and channel highlights.
- **Workflow**: Add Video Title, YouTube URL, Thumbnail URL, Category, Description, and Duration. Edit or delete existing videos.

#### 11. Categories Taxonomy Manager (`categories`)
- **Function**: Manage content categories and taxonomy terms across Projects, Blogs, Courses, and Videos.
- **Workflow**: Add, rename, or delete category slugs and descriptive labels.

#### 12. Pages & Legal Content Manager (`pages`)
- **Function**: Custom pages editor for Terms of Service, Privacy Policy, and static landing sections.
- **Workflow**: Edit page titles, URL slugs, and rich content with instant persistence to `public.pages`.

#### 13. Founder & CEO Message (`founder`)
- **Function**: Dedicated management module for Shivam Singh's Founder message, leadership profile, and vision statement.
- **Workflow**: Edit founder headline, personal quote, vision statement, executive photo URL, and social channel links.

#### 14. Media Library Engine (`media`)
- **Function**: Enterprise digital asset management for site graphics, logos, banners, thumbnails, and PDF guides stored in Supabase Storage (`probitian-media` bucket).
- **Features**:
  - **Single & Multi-Select**: Checkbox selection with Select All / Deselect All and active selection counter.
  - **Pre-Deletion Usage Verification**: Checks if assets are referenced across CMS Settings, Blogs, Projects, Courses, Messages, Founder Message, or Pages (`GET /api/cms/media/:id/usage`) before deletion.
  - **Bulk Deletion**: Confirmation modal dialog with list of referencing items; deletes files from storage and metadata from `public.media`. Non-destructive failure handling preserves selection state if an error occurs.
  - **SVG Sanitization**: Server-side DOMPurify processing neutralizes scripts, XXE, and inline event handlers.

---

### Section 4: Subscriber & Messages

#### 15. Contact Messages & Inbox (`messages`)
- **Function**: Review visitor inquiries, organize message statuses, and send email replies via Gmail SMTP.
- **Workflow**: View inbox table with sender Name, Email, Phone, Course Interest, Message, and Timestamp. Update status (**Unread**, **Read**, **Replied**, **Archived**), add internal notes, and click **Reply via Email** to dispatch responses directly from `probitianofficial@gmail.com`.

#### 16. Subscribers Manager (`newsletter`)
- **Function**: Manage newsletter email subscriptions stored in Supabase PostgreSQL.
- **Workflow**: View subscriber roster, active/unsubscribed status, and signup timestamps. Search by email or date, and export full subscriber lists to CSV format.

#### 17. Newsletter Campaigns Manager (`email-campaigns`)
- **Function**: Draft, test, and broadcast email newsletters to active subscribers via Gmail SMTP.
- **Workflow**: Create campaigns in `email_campaigns` table, set Subject, Preheader, and HTML content. Send test emails to verify rendering, execute bulk broadcasts with progress tracking in `email_campaign_recipients`, and include automated one-click unsubscribe links.

---

### Section 5: Site Settings & Admin

#### 18. Website Branding Manager (`branding`)
- **Function**: Configure site logos, banners, theme accents, and brand identity.
- **Workflow**: Choose Logo & Banner from the Media Library or upload custom assets; set Site Name and Tagline.

#### 19. Social Links Manager (`social`)
- **Function**: Control official social channel links displayed across the global header and footer.
- **Workflow**: Manage URLs for YouTube, Instagram, Facebook, GitHub, X (Twitter), LinkedIn, and other channels.

#### 20. Navigation Menu Manager (`navigation`)
- **Function**: Customize top navigation links, menu order, paths, and visibility toggles.
- **Workflow**: Reorder navigation items, update labels, and toggle link visibility.

#### 21. SEO & Meta Tags Manager (`seo`)
- **Function**: Configure global search engine optimization settings, social share cards, and canonical domains.
- **Workflow**: Edit Meta Title, Meta Description, Keywords, Canonical URL, Open Graph (OG) tags, and Twitter/X handles.

#### 22. Backup & Restore Manager (`backup`)
- **Function**: System disaster recovery and database snapshot management.
- **Workflow**: Export full JSON backups of all Supabase tables, download snapshots locally, and inspect backup integrity.

## 5. Troubleshooting & FAQ
- **Issue: Changes made in Admin are not appearing on the public site.**
  - **Solution**: Verify you clicked "Save". Refresh the public page.
- **Issue: Uploaded image or logo is not displaying.**
  - **Solution**: Ensure the file was uploaded into the Media Library. Verify the Supabase Storage URL.
- **Issue: Contact reply email is failing to send.**
  - **Solution**: Verify server environment variables `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in the server environment.
- **Issue: Admin login failed.**
  - **Solution**: Confirm the passkey entered matches `ADMIN_PASSKEY` configured in the server environment.
