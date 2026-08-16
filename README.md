# ProBitian

> **ProBitian** is an enterprise-grade, full-stack Business Intelligence and Data Analytics platform featuring an interactive public learning portal and a feature-rich CMS Admin Control Center. Founded and maintained by **Shivam Singh**, ProBitian delivers hands-on course paths, portfolio project showcases with downloadable datasets, technical analytics articles, YouTube tutorials, and real-time analytics.

Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  
Project Owner: **Shivam Singh**

---

## 📋 Table of Contents
1. [About ProBitian](#1-about-probitian)
2. [Key Features](#2-key-features)
3. [Public Website](#3-public-website)
4. [Admin Portal](#4-admin-portal)
5. [Email & Newsletter System](#5-email--newsletter-system)
6. [Media Library](#6-media-library)
7. [Analytics](#7-analytics)
8. [Database Architecture](#8-database-architecture)
9. [Security Architecture](#9-security-architecture)
10. [Production Infrastructure](#10-production-infrastructure)
11. [Environment Variables](#11-environment-variables)
12. [Local Development](#12-local-development)
13. [Database Migration Workflow](#13-database-migration-workflow)
14. [Deployment Workflow](#14-deployment-workflow)
15. [Backup / Recovery](#15-backup--recovery)
16. [User Documentation](#16-user-documentation)
17. [Admin Documentation](#17-admin-documentation)
18. [Project Structure](#18-project-structure)
19. [Troubleshooting](#19-troubleshooting)
20. [Production Checklist](#20-production-checklist)
21. [Project Owner](#21-project-owner)

---

## 1. About ProBitian

ProBitian is designed specifically for aspiring and experienced Data Analysts, Business Intelligence (BI) Developers, and Analytics Engineers. It bridges the gap between academic theory and real-world execution by providing structured learning paths for **Power BI, SQL, Excel, Python, Microsoft Fabric, and AI Tools for Data Professionals**.

- **Learners** get access to interactive curriculum guides, video walkthroughs, and raw sample dataset downloads (CSV, XLSX) to build verified resume portfolio projects.
- **Administrators** get a unified CMS Control Center to manage course paths, portfolio projects, technical articles, user inquiries, email broadcasts, media assets, branding, and GA4 visitor metrics.

---

## 2. Key Features

- **Full-Stack SPA Architecture**: Single-page React application powered by Node.js/Express and Supabase PostgreSQL.
- **Authoritative Database Persistence**: Direct server-side integration with Supabase PostgreSQL (no local JSON, mock data, or localStorage fallbacks in production).
- **Media Asset Storage**: Cloud media management hosted in Supabase Storage (`probitian-media` bucket) with automatic SVG sanitization.
- **Email Communications**: Server-side transactional email dispatch (welcome messages, inquiry alerts, admin inbox replies) and bulk email campaign broadcasts via **Gmail SMTP**.
- **Visitor Analytics**: Google Analytics 4 (GA4) integration with real-time site monitoring in the Admin Command Center.
- **Passkey Protection**: Secure server-side passkey authentication for administrative portal access.
- **Responsive Theme Engine**: High-contrast Light and Dark mode styling built with Tailwind CSS and smooth motion transitions.

---

## 3. Public Website

The public website caters to learners and site visitors with seamless hash routing:
- **Home (`#/`)**: Hero overview, platform stats, core skill pillars, featured courses, project showcases, and recent articles.
- **Learn (`#/learn`)**: Filterable course directory with interactive curriculum modals, lesson video links, downloadable cheat sheets, and practice datasets.
- **Projects (`#/projects`)**: Portfolio gallery of production-grade BI dashboards with live demo links, GitHub repositories, video walkthroughs, and raw sample data files.
- **Blog (`#/blog`)**: Deep-dive technical articles, DAX optimization guides, and SQL walkthroughs with code snippets and embedded videos.
- **YouTube (`#/youtube`)**: Video tutorial repository and playlist directory.
- **About (`#/about`)**: Profile of Project Owner Shivam Singh, mission statement, impact metrics, and learning roadmap.
- **Contact (`#/contact`)**: Inquiry submission form and Community Hub physical location details.
- **Legal Pages (`#/terms`, `#/privacy-policy`)**: Terms of Service and Privacy Policy.

---

## 4. Admin Portal

Accessible at `#/admin`, the Admin Control Center provides 17 administrative modules:
1. **Dashboard Overview**: KPI cards, recent activity, and quick CMS shortcuts.
2. **GA4 Analytics**: Real-time traffic, page views, duration, country map, and conversion events.
3. **Home Page Editor**: Headlines, value proposition cards, and platform statistics.
4. **Projects Manager**: Create, edit, feature, and order portfolio projects.
5. **Blog Manager**: Article publishing, markdown editing, and YouTube video attachments.
6. **Learn & Courses Manager**: Course paths, curriculum lessons, and downloadable dataset URLs.
7. **YouTube Manager**: Organize tutorial playlists and featured channel videos.
8. **Media Library Engine**: Upload, sanitize, preview, and re-use media assets stored in Supabase Storage.
9. **Contact Messages & Inbox**: Visitor inquiry table with status badges, notes, and direct Gmail SMTP email reply modals.
10. **Subscribers Manager**: Active subscriber roster and CSV export capabilities.
11. **Email Campaign Manager**: Create, test, schedule, and broadcast bulk newsletter emails.
12. **Branding Manager**: Logo, banner, and theme color controls with factory reset support.
13. **Social Links Manager**: Social media URL controls.
14. **Navigation Menu Manager**: Menu visibility and link order controls.
15. **SEO & Meta Tags Manager**: Meta titles, descriptions, keywords, OG tags, and canonical URLs.
16. **Website Settings**: Site parameters and Community Hub physical address settings.
17. **Legal & Policies Manager**: Edit Terms of Service and Privacy Policy texts.

---

## 5. Email & Newsletter System

Email services run server-side using **Nodemailer** over **Gmail SMTP**:
- **Official Sender**: `probitianofficial@gmail.com`
- **Transactional Emails**:
  - Immediate inquiry confirmation emails sent to visitors.
  - New message notification alerts.
  - Direct email replies sent from the Admin Inbox.
  - Welcome emails triggered upon new newsletter subscriptions.
- **Newsletter Persistence Gate**: Welcome emails are strictly gated on successful Supabase PostgreSQL subscriber persistence. If database write fails, HTTP 503 is returned and no email is dispatched.
- **Email Campaigns**: Admin can draft campaigns, dispatch test emails, and execute bulk broadcasts to active subscribers with recipient tracking logged in `email_campaign_recipients`.

---

## 6. Media Library

- **Storage Engine**: Supabase Storage (`probitian-media` bucket).
- **Categories / Folders**: `logos/`, `banners/`, `blog/`, `projects/`, `courses/`, `youtube/`, `general/`.
- **SVG Security**: Automatic server-side DOMPurify sanitization strips scripts and malicious handlers before storage.
- **Integration**: Assets uploaded to the Media Library can be re-used directly across Branding, Projects, Blog, and Courses.

---

## 7. Analytics

- **Platform**: Google Analytics 4 (GA4).
- **Measurement ID**: Configured via `VITE_GA4_MEASUREMENT_ID`.
- **Server API**: Express proxies GA4 Data API calls (`/api/analytics/status`, `/api/analytics/realtime`, `/api/analytics/report`) to render visitor traffic charts, top pages, country distribution, and conversion event counters directly inside the Admin Portal.

---

## 8. Database Architecture

- **Authoritative Engine**: **Supabase PostgreSQL**.
- **CMS Tables**:
  - `projects`
  - `blogs`
  - `courses`
  - `videos`
  - `categories`
  - `pages`
  - `settings`
  - `messages`
  - `newsletter`
  - `media`
  - `email_campaigns`
  - `email_campaign_recipients`
- **Strict Data Policy**: All production reads and writes communicate directly with Supabase PostgreSQL. There are **no production fallbacks** to local JSON files, localStorage, or mock data.

---

## 9. Security Architecture

- **Secret Isolation**: All sensitive credentials (`SUPABASE_SECRET_KEY`, `GMAIL_APP_PASSWORD`, `ADMIN_PASSKEY`, `GEMINI_API_KEY`) reside exclusively in the server environment and are never exposed in client bundles or public code.
- **Passkey Verification**: Admin login requires server-side passkey verification (`/api/admin/verify-passkey`) issuing time-limited session tokens.
- **Row Level Security (RLS)**: RLS enabled on Supabase tables. Public direct postgREST access is blocked (HTTP 403), ensuring all privileged queries pass through Express using the service-role key.
- **Sanitization**: SVG uploads are sanitized server-side to prevent stored XSS attacks.

---

## 10. Production Infrastructure

```
PROBITIAN WEBSITE / ADMIN PORTAL
        ↓
     EXPRESS API (Node.js Port 3000)
        ↓
SUPABASE POSTGRESQL (Authoritative Source of Truth)

MEDIA:
ADMIN / WEBSITE → EXPRESS MEDIA API → SUPABASE STORAGE (probitian-media bucket)

EMAIL:
PROBITIAN SERVER → GMAIL SMTP (probitianofficial@gmail.com)

ANALYTICS:
WEBSITE → GOOGLE ANALYTICS 4
```

- **Firebase**: NOT USED.
- **Cloud SQL**: NOT USED.
- **Drizzle**: NOT USED.
- **Resend**: NOT the active email delivery provider.

---

## 11. Environment Variables

Define required variables in `.env` (refer to `.env.example`):

```env
# GEMINI API KEY (Server Side)
GEMINI_API_KEY="<configured in server environment>"

# APP HOST URL
APP_URL="https://probitian.ai.studio/"

# PUBLIC BRAND SETTINGS
VITE_SITE_URL="https://probitian.ai.studio/"
VITE_YOUTUBE_URL="https://youtube.com/@probitian"
VITE_INSTAGRAM_URL="https://instagram.com/probitian"
VITE_FACEBOOK_URL="https://facebook.com/probitian"
VITE_GITHUB_URL="https://github.com/probitian"
VITE_CONTACT_EMAIL="probitianofficial@gmail.com"

# SUPABASE CONFIGURATION
VITE_SUPABASE_URL="https://dlaehchzzkjsrarktfsf.supabase.co"
VITE_SUPABASE_ANON_KEY="<configured in client environment>"
SUPABASE_SECRET_KEY="<configured in server environment>"

# ADMIN AUTHENTICATION
ADMIN_PASSKEY="<configured in server environment>"

# GA4 ANALYTICS
VITE_GA4_MEASUREMENT_ID="<configured in client environment>"

# GMAIL SMTP CONFIGURATION
GMAIL_USER="probitianofficial@gmail.com"
GMAIL_APP_PASSWORD="<configured in server environment>"
```

---

## 12. Local Development

```bash
# Install dependencies
npm install

# Run development server (Node + Express + Vite on port 3000)
npm run dev

# Run TypeScript type check
npm run lint

# Build production assets and bundle server
npm run build

# Start production server
npm start
```

---

## 13. Database Migration Workflow

1. Create a timestamped SQL migration file in `supabase/migrations/`.
2. Review migration SQL for destructive actions.
3. Test migration on a staging environment or backup database.
4. Execute SQL in Supabase Dashboard SQL Editor or via Supabase CLI.
5. Verify schema updates and grants (`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`). *Note: This grant applies strictly to the backend `service_role` and does not grant public `anon` or `authenticated` clients permissions, which remain restricted under RLS.*
6. Test application API handlers.
7. Record migration completion status.

*Note: Application startup NEVER performs automated `TRUNCATE`, `DROP TABLE`, or database reset routines.*

---

## 14. Deployment Workflow

1. Perform local typecheck (`npm run lint`).
2. Run local build (`npm run build`).
3. Verify environment variables in Cloud Run container settings.
4. Apply any pending database migrations to Supabase PostgreSQL.
5. Deploy container artifact.
6. Perform post-deployment smoke tests (contact form, newsletter, media upload, admin login).

---

## 15. Backup / Recovery

- **Database Backups**: Download full JSON backups directly from the Admin Portal (**Backup & Restore** module).
- **Supabase Cloud Snapshots**: Automatic daily PostgreSQL backups managed within the Supabase Cloud dashboard.
- **Disaster Recovery**: Upload backup JSON files via the Admin Control Center to restore full CMS state on demand.

---

## 16. User Documentation

- **Website User Guide (Markdown)**: `docs/PROBITIAN_USER_GUIDE.md`
- **Website User Guide (PDF)**: `public/docs/ProBitian_Website_User_Guide.pdf`

---

## 17. Admin Documentation

- **Admin User Guide (Markdown)**: `docs/PROBITIAN_ADMIN_CONTROL_CENTER_USER_GUIDE.md`
- **Admin User Guide (PDF)**: `public/docs/ProBitian_Admin_Control_Center_User_Guide.pdf`

---

## 18. Project Structure

```
.
├── docs/                                    # Technical & Architectural Documentation
│   ├── README.md                            # Documentation Index
│   ├── PROBITIAN_USER_GUIDE.md             # Website Learner Guide
│   ├── PROBITIAN_ADMIN_CONTROL_CENTER_USER_GUIDE.md # Admin Manual
│   ├── DATABASE_ARCHITECTURE.md            # Supabase PostgreSQL Architecture
│   ├── DATABASE_MIGRATIONS.md               # Migration Log & Procedure
│   ├── NEWSLETTER_WORKFLOW.md               # Subscription & Welcome Email Pipeline
│   ├── EMAIL_CAMPAIGN_WORKFLOW.md           # Email Campaign Broadcast Engine
│   ├── EMAIL_CONFIGURATION.md              # Gmail SMTP Setup & Security
│   ├── MEDIA_LIBRARY.md                     # Supabase Storage Asset Management
│   ├── ANALYTICS.md                         # GA4 Integration Specification
│   ├── SECURITY.md                          # Secret Isolation & RLS Security
│   ├── DEPLOYMENT_WORKFLOW.md               # Deployment Pipeline
│   ├── PRODUCTION_RELEASE_CHECKLIST.md      # Production Audit Checklist
│   └── TROUBLESHOOTING.md                   # Operational Error Resolution
├── public/                                  # Static Assets & Public Documents
│   ├── docs/                                # Public Guides & Generated PDFs
│   ├── banner.svg                           # Site Banner
│   ├── favicon.svg                          # Site Favicon
│   └── logo.svg                             # ProBitian Brand Logo
├── src/                                     # React Frontend Application
│   ├── components/                          # UI Components & Modals
│   ├── pages/                               # Page Components (Home, Learn, Admin, etc.)
│   ├── services/                            # Frontend API Services
│   ├── lib/                                 # Supabase client, SVG Sanitizer, GA4 helpers
│   ├── App.tsx                              # Main Application Router
│   └── main.tsx                             # Entry Point
├── supabase/                                # Supabase Schema & Migrations
│   └── migrations/                          # Sequential Migration Scripts
├── generate_docs.js                         # Documentation & PDF Generator Script
├── metadata.json                            # Platform Capabilities Config
├── package.json                             # Dependencies & Build Scripts
├── server.ts                                # Node.js Express Application Server
└── vite.config.ts                           # Vite Config
```

---

## 19. Troubleshooting

- **Admin Login Rejected**: Ensure `ADMIN_PASSKEY` environment variable matches the passkey entered.
- **Contact Email Not Sending**: Verify server environment variables `GMAIL_USER` and `GMAIL_APP_PASSWORD` are valid.
- **Supabase Permission Error (HTTP 403)**: Ensure service role grants are executed in Supabase SQL Editor (`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`).
- **Media Upload Failed**: Confirm the `probitian-media` bucket is created in Supabase Storage with public access enabled.

---

## 20. Production Checklist

- [x] Supabase PostgreSQL project provisioned and configured.
- [x] All 6 migration files applied (`0001` through `0006`).
- [x] Table grants verified for `service_role`.
- [x] RLS enabled and direct public postgREST access blocked.
- [x] Supabase Storage bucket `probitian-media` created and public.
- [x] Gmail SMTP credentials (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) active.
- [x] Admin Passkey (`ADMIN_PASSKEY`) configured in server environment.
- [x] GA4 Measurement ID (`VITE_GA4_MEASUREMENT_ID`) active.
- [x] Firebase and Cloud SQL dependencies removed.
- [x] Production build and TypeScript checks passing cleanly.

---

## 21. Project Owner

- **Name**: Shivam Singh
- **Project**: ProBitian
- **Website**: [https://probitian.ai.studio/](https://probitian.ai.studio/)
- **Official Email**: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)
- **Official LinkedIn**: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)

---

*© 2026 ProBitian. All Rights Reserved. Maintained by Shivam Singh.*
