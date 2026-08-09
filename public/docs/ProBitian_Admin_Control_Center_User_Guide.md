# ProBitian Admin Control Center — User Guide

Official Administrative Management Guide for Authorized ProBitian Portal Administrators.

## 1. Introduction & Security Guidance
The ProBitian Admin Control Center (#/admin) is a secure management portal for authorized administrators to control website content, analyze GA4 traffic, manage contact inquiries, send email responses, maintain subscribers, and configure brand settings.

### Critical Security Instructions
- **Never Share Credentials**: Do not share the Admin Passkey or login URL.
- **Server-Side Secret Isolation**: Secret environment variables (ADMIN_PASSKEY, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, GMAIL_APP_PASSWORD, GEMINI_API_KEY) must remain strictly server-side.
- **No Client Secrets**: Never place server secrets in frontend code, git commits, README files, or public documentation.

## 2. Admin Authentication & Access Control
### Accessing the Admin Portal
1. Append #/admin to the website URL (e.g., https://probitian.com/#/admin).
2. Enter the authorized **Admin Passkey**.
3. Click **Unlock Admin Portal**.
4. The server validates the passkey via POST /api/admin/verify-passkey against process.env.ADMIN_PASSKEY and issues an authenticated session token.

### Navigation Controls
- **Back to Website**: Returns to the public site without terminating the session.
- **Logout**: Instantly clears the admin session token and redirects to the login screen.

## 3. Comprehensive Admin Modules Guide
The Admin Portal contains **17 integrated management modules**:

### 1. Dashboard Overview
- **Function**: Command center summary and quick launchpad.
- **Features**: KPI metrics (Active Users Now, Today's Visitors, Pending Inquiries, Total Subscribers), quick shortcuts to core CMS actions, and recent activity logs.

### 2. GA4 Analytics Command Center
- **Function**: Real-time traffic, audience engagement, and conversion tracking via Google Analytics 4 API.
- **Features**: Active visitors count, date range filters (7D, 30D, 90D, Custom), total page views, average session duration, top pages report, traffic referral sources, device types, visitor country map, and event conversion counters (contact_form_submit, newsletter_subscribe, dataset_download_click, etc.).

### 3. Home Page Editor
- **Function**: Edit hero section, headlines, statistics, and value proposition cards on the public Home page.
- **Workflow**:
  - Edit hero headline, subheadline, CTA text, and CTA links.
  - Modify platform key stats (e.g. "10K+ Learners", "50+ Dashboards").
  - Update feature cards and value pillars.
  - Click **Save Changes** -> Persists to Supabase and reflects immediately on the live Home page.

### 4. Projects Portfolio Manager
- **Function**: Create, edit, publish, order, and tag portfolio projects.
- **Workflow**:
  - Click **Add New Project** or select an existing project to edit.
  - Set Title, Category, Summary, Full Description, and Tools Used.
  - Attach Live Demo URL, GitHub Repository, YouTube Tutorial link, and Dataset download link.
  - Toggle **Featured** to display on the Home page grid.
  - Click **Save Project** -> Updates Supabase and reflects instantly on #/projects.

### 5. Blog & Articles Manager
- **Function**: Draft, schedule, publish, or edit technical articles and guides.
- **Workflow**:
  - Set Article Title, URL Slug, Category, Read Time, and Tags.
  - Enter Excerpt and full Markdown content.
  - Attach Cover Image URL and optional YouTube video walkthrough link.
  - Set status to **Draft** or **Published**.
  - Click **Save Article** -> Updates Supabase and reflects on #/blog.

### 6. Learn & Courses Manager
- **Function**: Manage skill paths, course modules, video links, PDFs, and dataset resources.
- **Workflow**:
  - Set Course Title, Subtitle, Category (Power BI, SQL, Excel, Python, AI), Skill Level, and Duration.
  - Attach YouTube Video IDs, PDF Documentation links, and raw dataset download URLs.
  - Click **Save Course** -> Updates Supabase and reflects on #/learn.

### 7. YouTube Showcase Manager
- **Function**: Organize YouTube video tutorials, playlists, and channel highlights.
- **Workflow**:
  - Add Video Title, YouTube URL, Thumbnail URL, Category, Description, and Duration.
  - Edit or delete existing videos.
  - Click **Save** -> Updates Supabase and reflects on #/youtube.

### 8. Media Library Engine
- **Function**: Asset manager for site graphics, logos, banners, thumbnails, and PDF files.
- **Workflow**:
  - Upload media files (PNG, JPG, SVG, WebP, PDF).
  - SVG files undergo automated server-side **DOMPurify sanitization** before saving to eliminate script injection.
  - Preview media items, copy URLs, or **select existing media assets** directly when editing Branding, Projects, Blog, or Courses.
  - **Asset Reuse**: Re-use existing Media Library items instead of uploading duplicate files.

### 9. Contact Messages & Inbox Manager
- **Function**: Review visitor inquiries, organize status, and send email replies via Gmail SMTP / Nodemailer.
- **Workflow**:
  - View inbox table with sender Name, Email, Phone, Course Interest, Message, and Timestamp.
  - Update status badges (**Unread**, **Read**, **Replied**, **Archived**).
  - Add internal **Admin Notes** for team reference.
  - Click **Reply via Email**: Sends an email response directly from the portal via server-side **Gmail SMTP / Nodemailer** (GMAIL_USER and GMAIL_APP_PASSWORD).

### 10. Subscribers Manager
- **Function**: Manage newsletter email subscriptions.
- **Workflow**:
  - View full subscriber email roster and signup timestamps.
  - Search subscribers by domain or date.
  - Export subscriber lists to CSV format for email campaigns.

### 18. Email Campaign & Newsletter Manager
- **Function**: Draft, test, schedule, and broadcast email newsletters to active subscribers via Resend API.
- **Workflow**:
  - View total active subscribers count and delivery provider status (Resend API).
  - Create new email campaigns or edit existing draft campaigns.
  - Set Campaign Name, Email Subject Line, Preheader Preview Text, and HTML/Formatted Body Content.
  - Use Media Library insert tools and call-to-action button snippets.
  - Send instant **Test Emails** to any verified email address.
  - Execute **Bulk Campaign Broadcasts** to all active newsletter subscribers with live progress reporting.
  - Automated inclusion of compliant **Unsubscribe links** allowing recipients to unsubscribe with one click.

### 11. Website Branding Manager
- **Function**: Configure site logos, banners, theme colors, and brand identity.
- **Workflow**:
  - **Choose Logo & Banner from Media Library** or upload custom SVG assets.
  - Set Site Name, Tagline, and Theme Accents.
  - Preview new assets side-by-side before publishing.
  - Click **Reset to Factory Default** to restore original ProBitian branding assets if needed.

### 12. Social Links Manager
- **Function**: Control social profiles displayed across header and footer.
- **Workflow**:
  - Manage links for YouTube, Instagram, Facebook, GitHub, LinkedIn, etc.
  - Toggle active status and adjust display order.
  - Click **Save Social Links** -> Updates Supabase and reflects globally.

### 13. Navigation Menu Manager
- **Function**: Customize top navigation links, paths, icons, and visibility.
- **Workflow**:
  - Toggle navigation link visibility (e.g. show/hide Learn or YouTube).
  - Adjust order of menu items.
  - Click **Save Navigation** -> Updates Supabase and reflects in header.

### 14. SEO & Meta Tags Manager
- **Function**: Configure search engine optimization settings and social share tags.
- **Workflow**:
  - Edit Meta Title, Meta Description, Keywords, and Canonical URL.
  - Set Open Graph (OG) Title, OG Description, and OG Image URL.
  - Configure Twitter Handle and robots.txt indexing directives.
  - Click **Save SEO Settings** -> Updates Supabase and injects meta tags into index.html.

### 15. Website Settings (Including Community Hub Location)
- **Function**: Manage global site parameters and official physical location details.
- **Workflow**:
  - Edit Site Name, Tagline, Official Contact Email, and Footer Copyright.
  - **Community Hub Location Settings**:
    - **Community Hub Name**: Default ProBitian Community Hub
    - **Hub Physical Address**: Default M93M+688, Salaiya, Madhya Pradesh 486440, India
    - **Google Maps URL**: Default https://maps.app.goo.gl/T4426JADcNHHFPqb7
  - Click **Save Settings** -> Updates Supabase. Changes immediately update the Contact page (#/contact).

### 16. Backup & Restore Manager
- **Function**: Full CMS database backup and disaster recovery.
- **Workflow**:
  - Click **Export JSON Backup** to download a complete, time-stamped JSON snapshot of all CMS tables, settings, messages, and subscribers.
  - Click **Restore Database** to upload a backup JSON file and restore CMS state on demand.

### 17. Legal & Policies Manager
- **Function**: Edit Terms of Service and Privacy Policy pages.
- **Workflow**:
  - Edit Terms of Service and Privacy Policy text sections.
  - Set Effective Date, Contact Address, and Governing Jurisdiction clauses.
  - Click **Save Legal Settings** -> Updates Supabase. Public pages #/terms and #/privacy-policy update in real time.

## 4. Multi-Tier Data Persistence Architecture
ProBitian uses a high-availability, multi-tiered data storage model:
1. **Supabase PostgreSQL (Production Source of Truth)**: Primary cloud database storing all CMS tables, settings, messages, subscribers, and legal documents.
2. **data/cms_settings.json (Server-Side Fallback)**: Persistent file-based store ensuring continuity during cloud network disruptions.
3. **localStorage (Client-Side Cache)**: Caches theme preferences and general settings for instant rendering without layout shift.
4. **mockData (Seed Defaults)**: Baseline fallback data used during brand initialization or factory resets.

## 5. Email System Architecture (Gmail SMTP / Nodemailer)
Contact enquiries and admin email replies pass through server-side Express routes using **Nodemailer** over **Gmail SMTP**:
- Outgoing contact alerts and subscriber welcome emails.
- Admin reply dispatch directly from the Messages Inbox modal.
- Configured via server environment variables (GMAIL_USER and GMAIL_APP_PASSWORD).

## 6. Admin Troubleshooting & FAQ
- **Issue: Changes made in Admin are not appearing on the public site.**
  - **Solution**: Verify you clicked "Save". Check Supabase connection in browser dev tools console. Refresh the public page.
- **Issue: Uploaded image or logo is not displaying.**
  - **Solution**: Ensure the file was uploaded into the Media Library. Verify the media URL in Branding or content settings. Click "Save".
- **Issue: Contact reply email is failing to send.**
  - **Solution**: Verify server environment variables GMAIL_USER and GMAIL_APP_PASSWORD are valid. Check server log output.
- **Issue: Admin login failed.**
  - **Solution**: Confirm the passkey entered matches ADMIN_PASSKEY configured in the server environment.
