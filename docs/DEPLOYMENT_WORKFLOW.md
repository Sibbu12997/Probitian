# ProBitian — Deployment Workflow Documentation

Official Deployment Pipeline & Release Procedures for ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 1. Overview

This document outlines the step-by-step production deployment workflow for ProBitian, ensuring zero downtime, safe database schema updates, and clean releases.

---

## 2. Standard Deployment Pipeline

```
1. LOCAL DEVELOPMENT & LOCKFILE INTEGRITY
   └── Clean dependencies: `npm ci`
   └── Code Changes & Bug Fixes
        ↓
2. AUTOMATED CI/CD VALIDATION
   ├── Typecheck & Lint: `npm run lint` (`tsc --noEmit`)
   ├── Security & Regression Suite: `npm test` (`tsx --test tests/**/*.test.ts`)
   ├── Dependency Vulnerability Audit: `npm audit --audit-level=high`
   └── Custom CodeQL Security Analysis: `+security-extended,security-and-quality`
        ↓
3. PRODUCTION BUILD
   └── Run `npm run build` (`vite build` + `esbuild server.ts`)
        ↓
4. DATABASE SCHEMA REVIEW
   └── Identify if changes require database schema updates
        ├── If Schema Updated: Create new migration in `supabase/migrations/`
        ├── Review SQL for idempotency (CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS)
        ├── Apply SQL in Supabase Dashboard SQL Editor
        ├── Execute Grants (`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;` for backend API only)
        └── Verify RLS and Table Permissions
        ↓
5. API & SYSTEM SMOKE TESTS
   └── Test API endpoints (`/api/health`, `/api/cms/settings`)
   └── Test Contact Form Submission & Email Delivery (Gmail SMTP)
   └── Test Media Upload to Supabase Storage (`probitian-media`)
        ↓
6. DEPLOYMENT & REPUBLISH
   └── Deploy Container Image / Cloud Run Service
        ↓
7. PRODUCTION VERIFICATION & UAT
   └── Verify Live Web Application (https://probitian.ai.studio/)
   └── Verify Admin Control Center Access
   └── Verify Data Persistence in Supabase PostgreSQL
```

---

## 3. Mandatory Non-Destructive Rules

> 🚨 **NON-DESTRUCTIVE STARTUP MANDATE**:
> Application startup (`server.ts`) must **NEVER** automatically perform:
> - `DROP TABLE`
> - `TRUNCATE`
> - Automated database table recreation
> - `DELETE` of production records
> - Destruction or seeding of test records over production data

All database migrations are forward-only, incremental SQL scripts explicitly applied and verified in Supabase prior to code deployment.

---

## 4. Post-Deployment Verification Protocol

Immediately following a deployment:
1. Load `https://probitian.ai.studio/` in a fresh browser session.
2. Verify home page layout, featured courses, and project showcases.
3. Verify public path routing (`/about`, `/projects`, `/blog`, `/learn`, `/contact`, `/privacy`, `/terms`).
4. Verify dynamic blog routing (`/blog/mastering-advanced-dax-calculation-groups`).
5. Verify `/robots.txt` and `/sitemap.xml` endpoints return valid HTTP 200 responses.
6. Verify an invalid URL (`/nonexistent-route`) returns `HTTP 404 Not Found` with 404 UI.
7. Submit a test enquiry via `/contact` and verify email dispatch.
8. Subscribe a test email via footer and confirm Supabase `newsletter` insert.
9. Log into `/admin` with `ADMIN_PASSKEY` and verify GA4 analytics metrics load.
10. Test uploading a sample image in the Media Library.

---

*Documentation maintained by Shivam Singh — ProBitian.*
