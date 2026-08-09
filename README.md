# ProBitian — Master Business Intelligence & Data Analytics Platform

> **ProBitian** is an enterprise-grade, full-stack learning, portfolio, and data-professional platform with an interactive public web application and a rich CMS Admin Command Center. Founded by **Shivam Baghel**, ProBitian delivers hands-on course modules, real-world portfolio project showcases with downloadable raw datasets, technical analytics articles, YouTube tutorials, and real-time business intelligence analytics.

![ProBitian Banner](/banner.svg)

---

## 📋 Table of Contents
- [Project Overview](#-project-overview)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Admin Portal Modules](#-admin-portal-modules)
- [Database & Storage Strategy](#-database--storage-strategy)
- [Email System (Nodemailer + Gmail SMTP)](#-email-system-nodemailer--gmail-smtp)
- [Authentication & Passkey Protection](#-authentication--passkey-protection)
- [Environment Variables Guide](#-environment-variables-guide)
- [Local Development & Commands](#-local-development--commands)
- [CMS Content Management Usage](#-cms-content-management-usage)
- [Media Library Engine](#-media-library-engine)
- [Legal & Policy Management](#-legal--policy-management)
- [Official Location & Community Hub](#-official-location--community-hub)
- [Security Architecture](#-security-architecture)

---

## 🌐 Project Overview

ProBitian is designed specifically for aspiring and experienced Data Analysts, BI Developers, and Analytics Engineers. It bridges the gap between academic theory and real-world execution by providing structured learning paths for **Power BI, SQL, Excel, Power Query, Microsoft Fabric, and AI Tools for Data Professionals**.

Key capabilities include:
- **Public Learning Platform**: Course curricula, interactive topic modals, downloadable practice datasets, portfolio project walk-throughs, technical articles, and direct inquiry forms.
- **CMS Admin Portal**: Centralized administration for website content, lead management, email dispatch, branding, navigation, SEO meta tags, and system backups.
- **Analytics Dashboard**: Real-time visitor activity and multi-range reporting integrated directly with Google Analytics 4 (GA4).

---

## 🛠 Technology Stack

### Frontend
- **React 18**: UI rendering & component hierarchy
- **TypeScript**: Full type safety across models and APIs
- **Vite**: Rapid asset bundling and development server
- **Tailwind CSS (v4)**: Modern utility-first styling with high-contrast Light/Dark mode
- **Framer Motion (`motion/react`)**: Smooth view transitions and animated cards
- **Lucide React**: Clean SVG iconography
- **Recharts**: Responsive chart rendering for analytics and dashboards

### Backend Server & APIs
- **Node.js & Express**: High-performance HTTP application server running on port `3000`
- **TypeScript & esbuild**: Native TS execution in dev mode (`tsx`), bundled CommonJS (`dist/server.cjs`) for production

### Database & Persistence
- **Supabase PostgreSQL**: Production source of truth for CMS data, content, messages, and subscribers
- **Local Fallback Storage**: `/data/cms_settings.json` emergency persistence backup
- **Browser State**: `localStorage` caching for instant UI hydration

### Integrations
- **Nodemailer + Gmail SMTP**: Server-side transactional email notifications and contact replies
- **Google Analytics 4 (GA4)**: Real-time traffic, conversion events, and demographic metrics
- **YouTube Integration**: Direct video playback, playlist embeds, and tutorial showcases
- **DOMPurify**: XSS protection and SVG sanitization for dynamic media and logos

---

## 🏗 Architecture

```text
               PUBLIC WEBSITE
                     │
              React Frontend
                     │
            Express Backend API
            (/api/* Endpoints)
                     │
    ┌────────────────┼────────────────┐
    ▼                ▼                ▼
Supabase PG     Nodemailer       Google Analytics 4
(CMS Data)      (Gmail SMTP)     (Traffic & Events)
```

1. **Public Website Flow**: Users browse courses, projects, and articles. Data is fetched from Supabase via Express server API endpoints with local caching.
2. **Email System Flow**: Contact enquiries and admin replies pass through Express server endpoints (`/api/contact`, `/api/admin/reply-message`) to Nodemailer using Gmail SMTP credentials (`GMAIL_USER` and `GMAIL_APP_PASSWORD`).
3. **Analytics Flow**: GA4 tracks non-PII events (`contact_form_submit`, `newsletter_subscribe`, `dataset_download_click`, `course_click`, etc.) from client side without exposing sensitive input fields.
4. **Media Storage Flow**: Media uploads pass through Admin Media Library, saving secure references to Supabase and filesystem for persistent web usage.

---

## 🔐 Admin Portal Modules

The Admin Control Center (`#/admin`) features 16 integrated modules:

1. **Dashboard Overview**: System health, quick navigation shortcuts, statistics summary, and recent activity.
2. **GA4 Analytics**: Active real-time visitors, date range selectors (7D, 30D, 90D, custom), traffic sources, device breakdowns, top pages, and conversion events.
3. **Home Page Editor**: Customize hero headings, descriptions, call-to-action buttons, key statistics, and feature cards.
4. **Projects Manager**: Create, edit, publish, order, and tag portfolio projects with dataset downloads and live links.
5. **Blog Manager**: Draft, schedule, or publish technical articles with custom excerpts, category tags, and SEO metadata.
6. **Courses / Learn Manager**: Manage skill topics, module syllabi, video links, PDF resources, and skill levels.
7. **YouTube Manager**: Organize video tutorials, playlists, durations, view counts, and category tags.
8. **Media Library**: Upload images, search files, manage graphics, and select media for branding or content.
9. **Messages Inbox**: Review contact inquiries, set status (new, read, replied, archived), add internal admin notes, and send email responses via Gmail SMTP.
10. **Subscribers Manager**: Manage newsletter email subscriptions, filter domains, and export subscriber lists.
11. **Branding Manager**: Update official logos, banners, themes, and execute factory defaults.
12. **Social Links Manager**: Control active social profiles (YouTube, Instagram, Facebook, GitHub, etc.) and display order.
13. **Navigation Manager**: Customize top menu items, paths, icons, and visibility toggles.
14. **SEO & Meta Tags**: Configure meta titles, meta descriptions, Open Graph images, Twitter handles, and `robots.txt`.
15. **Website Settings**: Manage site name, tagline, official contact email, footer copyright, and **Community Hub Location details**.
16. **Legal & Policies**: Edit Terms of Service, Privacy Policy, effective dates, and governing law clauses.
17. **Backup & Restore**: Export full JSON database backups and restore CMS content on demand.

---

## 🗄 Database & Storage Strategy

ProBitian implements a multi-tier storage architecture to ensure zero downtime and absolute data persistence:

- **Supabase PostgreSQL (Production Source of Truth)**: Primary cloud database storing all CMS records, messages, subscribers, settings, and legal documents.
- **`/data/cms_settings.json` (Local Emergency Fallback)**: Persistent file-based store ensuring backend operations continue even during external network disruptions.
- **`localStorage` (Client-Side Cache)**: Caches general settings and theme preferences for immediate render without layout shifts.
- **`mockData` (Seed Data Only)**: Standard initial default values used solely during brand initialization or factory reset.

---

## 📧 Email System (Nodemailer + Gmail SMTP)

Contact form submissions and admin response dispatches use server-side **Nodemailer** over **Gmail SMTP**:

- **Outgoing Contact Notification**: Sent automatically when a visitor submits the contact form.
- **Admin Reply Dispatch**: Sent directly from the Messages Inbox modal in the Admin Portal to the visitor's email.
- **Environment Configuration**:
  - `GMAIL_USER`: Official sender email address (`probitianofficial@gmail.com`)
  - `GMAIL_APP_PASSWORD`: Google App Password generated for secure SMTP authentication
  - `NOTIFICATION_EMAIL`: Recipient email address for new contact alerts

*Note: All SMTP processing occurs strictly on the server side (`server.ts`). Secret credentials are never exposed to browser clients.*

---

## 🔑 Authentication & Passkey Protection

Access to the Admin Portal (`#/admin`) is guarded by a server-side authentication layer:

- **Authentication Flow**: Client sends passkey to `POST /api/admin/verify-passkey`.
- **Server Validation**: Express server compares the submitted string against the `ADMIN_PASSKEY` environment variable.
- **Token Handling**: Successful validation issues an authenticated session token stored in browser memory/session storage.
- **Isolation**: The `ADMIN_PASSKEY` value is server-only. It is **never** included in client JavaScript bundles, network payloads, or logs.

---

## 🔑 Environment Variables Guide

Declare all environment keys in `.env.example`. Do not commit real production secrets to repository history.

### Public Client Variables
```env
# Frontend Supabase URL & Public Anon Key
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Public Google Analytics 4 Measurement ID
VITE_GA4_MEASUREMENT_ID="G-G3WJXY6THP"

# Brand Social & Contact Public Links
VITE_SITE_URL="https://probitian.com"
VITE_YOUTUBE_URL="https://youtube.com/@probitian"
VITE_INSTAGRAM_URL="https://instagram.com/probitian"
VITE_FACEBOOK_URL="https://facebook.com/probitian"
VITE_GITHUB_URL="https://github.com/probitian"
VITE_CONTACT_EMAIL="probitianofficial@gmail.com"
```

### Server-Only Secrets
```env
# Admin Portal Master Passkey
ADMIN_PASSKEY="your-secure-passkey"

# Supabase Server Service Role Key
SUPABASE_SECRET_KEY="your-supabase-service-role-key"

# Gmail SMTP Email Credentials
GMAIL_USER="probitianofficial@gmail.com"
GMAIL_APP_PASSWORD="your-google-app-password"

# GA4 Server Reporting Credentials
GA4_PROPERTY_ID="549083163"
GA4_CLIENT_EMAIL="your-service-account@iam.gserviceaccount.com"
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## 💻 Local Development & Commands

### Prerequisites
- Node.js v18.0 or higher
- npm v9.0 or higher

### Installation & Execution

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (Express + Vite on Port 3000)
npm run dev

# 3. Validate code quality & TypeScript types
npm run lint

# 4. Build full-stack production bundle (Vite SPA + esbuild server.cjs)
npm run build

# 5. Launch compiled production server
npm run start
```

Access the application at `http://localhost:3000`.

---

## 📝 CMS Content Management Usage

Admin users can modify all site content dynamically without editing code:
1. Navigate to `#/admin` and log in using the Admin Passkey.
2. Select desired module from the left navigation bar:
   - **Home**: Edit headline, subheadline, stats, and feature cards.
   - **Projects / Blog / Courses / YouTube**: Add new entries, upload custom thumbnails, attach datasets/PDFs, and toggle visibility.
   - **Branding / Navigation / Social**: Upload logos, adjust display order, and update social URLs.
   - **Website Settings**: Update site name, contact email, copyright, and Community Hub location.
   - **Legal & Policies**: Edit Terms of Service and Privacy Policy sections.
3. Click **Save Changes** — Updates persist immediately to Supabase and reflect live across the public website.

---

## 🖼 Media Library Engine

The Media Library module provides a unified asset manager:
- **Upload**: Accepts PNG, JPG, SVG, WebP, and PDF assets.
- **Sanitization**: SVG files undergo DOMPurify sanitization before saving to protect against script injection.
- **Selection**: Assets uploaded in Media Library can be selected directly inside Project forms, Blog editors, Course resources, and Branding panels.
- **Persistence**: File meta and URLs are stored persistently in Supabase (`probitian_cms_media`) and filesystem.

---

## ⚖️ Legal & Policy Management

ProBitian maintains dedicated, editable legal pages:
- **Terms of Service**: Reachable at `#/terms`. Governs platform usage, course access, and intellectual property.
- **Privacy Policy**: Reachable at `#/privacy` and `#/privacy-policy`. Details data collection, cookie usage, user rights, and contact procedures.
- **CMS Management**: Accessible via **Admin Portal → Legal & Policies**. Edits save directly to Supabase and update public legal pages in real time.

---

## 📍 Official Location & Community Hub

The official ProBitian Community Hub location is integrated into the Contact page (`#/contact`):

- **Place Name**: ProBitian Community Hub
- **Address**: `M93M+688, Salaiya, Madhya Pradesh 486440, India`
- **Coordinates**: `24.6030, 81.2833`
- **Plus Code**: `M93M+688 Salaiya, Madhya Pradesh`
- **Public Maps Link**: `https://maps.app.goo.gl/T4426JADcNHHFPqb7` (opens in a new browser tab with `target="_blank" rel="noopener noreferrer"`).
- **CMS Configurable**: Editable via **Admin Portal → Website Settings → Community Hub Location Settings**.

---

## 🛡 Security Architecture

- **Credential Isolation**: All API keys, passkeys, and SMTP secrets remain strictly on the server side (`process.env`).
- **Input Sanitization**: Contact forms and CMS text fields are validated client-side and sanitized server-side.
- **XSS Protection**: Dynamic SVG logos and user inputs are passed through DOMPurify sanitization.
- **PII Protection**: User details entered into contact forms are never transmitted to Google Analytics 4.
- **Secure Links**: All external hyperlinks enforce `rel="noopener noreferrer"`.

---

© 2026 ProBitian. All Rights Reserved. Founded by Shivam Baghel.
