# ProBitian Admin Control Center — User Guide

Official Administrative Management Guide for Authorized ProBitian Portal Administrators.

Project Owner: **Shivam Singh**
Official Website: https://probitian.ai.studio/
Official Communication Email: probitianofficial@gmail.com

## 1. Introduction & Security Guidance
The ProBitian Admin Control Center (#/admin) is a secure management portal for authorized administrators to control website content, analyze GA4 traffic, manage contact inquiries, send email responses, maintain subscribers, broadcast email campaigns, manage media assets, and configure brand settings.

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
1. Append #/admin to the website URL (e.g., https://probitian.ai.studio/#/admin).
2. Enter the authorized **Admin Passkey**.
3. Click **Unlock Admin Portal**.
4. The server validates the passkey via `POST /api/admin/verify-passkey` against `process.env.ADMIN_PASSKEY` and issues an authenticated session token.

### Navigation Controls
- **Back to Website**: Returns to the public site without terminating the session.
- **Logout**: Instantly clears the admin session token and redirects to the login screen.

## 4. Comprehensive Admin Modules Guide
The Admin Portal contains integrated management modules:

### 1. Dashboard Overview
- **Function**: Command center summary and quick launchpad.
- **Features**: KPI metrics (Active Users Now, Today's Visitors, Pending Inquiries, Total Subscribers), quick shortcuts to core CMS actions, and recent activity logs.

### 2. GA4 Analytics Command Center
- **Function**: Real-time traffic, audience engagement, and conversion tracking via Google Analytics 4.
- **Features**: Active visitors count, date range filters (7D, 30D, 90D, Custom), total page views, average session duration, top pages report, traffic referral sources, device types, and event conversion counters.

### 3. Home Page Editor
- **Function**: Edit hero section, headlines, statistics, and value proposition cards on the public Home page.
- **Workflow**:
  - Edit hero headline, subheadline, CTA text, and CTA links.
  - Modify platform key stats (e.g. "10K+ Learners", "50+ Dashboards").
  - Update feature cards and value pillars.
  - Click **Save Changes** -> Persists directly to Supabase PostgreSQL and reflects immediately on the live Home page.

### 4. Projects Portfolio Manager
- **Function**: Create, edit, publish, order, and tag portfolio projects.
- **Workflow**:
  - Click **Add New Project** or select an existing project to edit.
  - Set Title, Category, Summary, Full Description, and Tools Used.
  - Attach Live Demo URL, GitHub Repository, YouTube Tutorial link, and Dataset download link.
  - Toggle **Featured** to display on the Home page grid.
  - Click **Save Project** -> Updates Supabase PostgreSQL and reflects instantly on #/projects.

### 5. Blog & Articles Manager
- **Function**: Draft, schedule, publish, or edit technical articles and guides.
- **Workflow**:
  - Set Article Title, URL Slug, Category, Read Time, and Tags.
  - Enter Excerpt and full Markdown content.
  - Attach Cover Image URL and optional YouTube video walkthrough link.
  - Set status to **Draft** or **Published**.
  - Click **Save Article** -> Updates Supabase PostgreSQL and reflects on #/blog.

### 6. Learn & Courses Manager
- **Function**: Manage skill paths, course modules, video links, PDFs, and dataset resources.
- **Workflow**:
  - Set Course Title, Subtitle, Category (Power BI, SQL, Excel, Python, AI), Skill Level, and Duration.
  - Attach YouTube Video IDs, PDF Documentation links, and raw dataset download URLs.
  - Click **Save Course** -> Updates Supabase PostgreSQL and reflects on #/learn.

### 7. YouTube Showcase Manager
- **Function**: Organize YouTube video tutorials, playlists, and channel highlights.
- **Workflow**:
  - Add Video Title, YouTube URL, Thumbnail URL, Category, Description, and Duration.
  - Edit or delete existing videos.
  - Click **Save** -> Updates Supabase PostgreSQL and reflects on #/youtube.

### 8. Media Library Engine
- **Function**: Asset manager for site graphics, logos, banners, thumbnails, and PDF files stored in Supabase Storage (`probitian-media` bucket).
- **Workflow**:
  - Upload media files (PNG, JPG, SVG, WebP, PDF).
  - SVG files undergo automated server-side **DOMPurify sanitization** before saving to eliminate script injection.
  - Preview media items, copy URLs, or **select existing media assets** directly when editing Branding, Projects, Blog, or Courses.
  - **Asset Reuse**: Re-use existing Media Library items directly from Supabase Storage.

### 9. Contact Messages & Inbox Manager
- **Function**: Review visitor inquiries, organize status, and send email replies via Gmail SMTP.
- **Workflow**:
  - View inbox table with sender Name, Email, Phone, Course Interest, Message, and Timestamp.
  - Update status badges (**Unread**, **Read**, **Replied**, **Archived**).
  - Add internal **Admin Notes** for team reference.
  - Click **Reply via Email**: Sends an email response directly from the portal via server-side **Gmail SMTP** (`probitianofficial@gmail.com`).

### 10. Subscribers Manager
- **Function**: Manage newsletter email subscriptions stored in Supabase PostgreSQL.
- **Workflow**:
  - View full subscriber email roster, active/unsubscribed status, and signup timestamps.
  - Search subscribers by domain or date.
  - Export subscriber lists to CSV format.

### 11. Email Campaign & Newsletter Manager
- **Function**: Draft, test, and broadcast email newsletters to active subscribers via Gmail SMTP.
- **Workflow**:
  - View total active subscribers count and delivery provider status (Gmail SMTP).
  - Create new email campaigns or edit existing draft campaigns in Supabase (`email_campaigns` table).
  - Set Campaign Name, Email Subject Line, Preheader Preview Text, and HTML/Formatted Body Content.
  - Send instant **Test Emails** to any verified email address.
  - Execute **Bulk Campaign Broadcasts** to all active newsletter subscribers with live status updates logged in `email_campaign_recipients`.
  - Compliant **Unsubscribe links** allowing recipients to unsubscribe safely.

### 12. Website Branding Manager
- **Function**: Configure site logos, banners, theme colors, and brand identity.
- **Workflow**:
  - **Choose Logo & Banner from Media Library** (Supabase Storage) or upload custom assets.
  - Set Site Name, Tagline, and Theme Accents.
  - Click **Save Branding** -> Updates Supabase PostgreSQL and updates site branding globally.

### 13. Social Links Manager
- **Function**: Control social profiles displayed across header and footer.
- **Workflow**:
  - Manage links for YouTube, Instagram, Facebook, GitHub, LinkedIn, etc.
  - Click **Save Social Links** -> Updates Supabase PostgreSQL.

### 14. Navigation Menu Manager
- **Function**: Customize top navigation links, paths, icons, and visibility.
- **Workflow**:
  - Toggle navigation link visibility and menu order.
  - Click **Save Navigation** -> Updates Supabase PostgreSQL.

### 15. SEO & Meta Tags Manager
- **Function**: Configure search engine optimization settings and social share tags.
- **Workflow**:
  - Edit Meta Title, Meta Description, Keywords, Canonical URL, Open Graph (OG) fields, and Twitter Handle.
  - Click **Save SEO Settings** -> Updates Supabase PostgreSQL and injects meta tags dynamically.

### 16. Website Settings & Location
- **Function**: Manage global site parameters and official physical location details.
- **Workflow**:
  - Edit Site Name, Tagline, Official Contact Email (`probitianofficial@gmail.com`), Footer Copyright, and Community Hub location details.
  - Click **Save Settings** -> Updates Supabase PostgreSQL.

### 17. Legal & Policies Manager
- **Function**: Edit Terms of Service and Privacy Policy pages.
- **Workflow**:
  - Edit Terms of Service and Privacy Policy text sections.
  - Click **Save Legal Settings** -> Updates Supabase PostgreSQL.

## 5. Troubleshooting & FAQ
- **Issue: Changes made in Admin are not appearing on the public site.**
  - **Solution**: Verify you clicked "Save". Refresh the public page.
- **Issue: Uploaded image or logo is not displaying.**
  - **Solution**: Ensure the file was uploaded into the Media Library. Verify the Supabase Storage URL.
- **Issue: Contact reply email is failing to send.**
  - **Solution**: Verify server environment variables `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in the server environment.
- **Issue: Admin login failed.**
  - **Solution**: Confirm the passkey entered matches `ADMIN_PASSKEY` configured in the server environment.
