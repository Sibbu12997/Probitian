# ProBitian Storage Security Audit & Asset Lifecycle Plan

Strategic blueprint and verification roadmap for securing Supabase Storage, reconciling database-to-bucket media references, isolating test artifacts, and ensuring zero downtime or content breakage across the ProBitian platform.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Active Production State & Retention Policies**:
> 1. **Zero Production Mutation Without Approval**: All 180 existing `public.media` rows, 182 storage objects in `probitian-media`, and empty legacy buckets (`blogs`, `media`, `projects`, `settings`) remain strictly preserved. No deletion or schema migration will occur during verification.
> 2. **Historical Branding Assets**: Two unregistered legacy branding assets in `general/` (`Logo__2_.svg` and `Banner.svg`) are permanently protected from automated garbage collection to preserve brand heritage.
> 3. **Test Artifact Isolation Strategy**: Future regression runs of `tests/cms_public_endpoints.test.ts` should route through an ephemeral mock storage adapter or automatically purge created test probes in a teardown hook, preventing unintended accumulation in the live production bucket.
> 4. **Security Advisor Acknowledgment**: The `auth_leaked_password_protection` warning in Supabase Security Advisor is recognized as an Auth-tier advisory (requiring a Supabase Pro subscription) and does not compromise Storage RLS boundaries.

- **Confirmed Decision 1**: Maintain strict forward-only verification against Supabase project `dlaehchzzkjsrarktfsf` without altering active RLS policies or database schemas.
- **Confirmed Decision 2**: Isolate test deletion assertions in `tests/storage_security_audit.test.ts` using privileged disposable probes rather than targeting production assets (e.g., founder portrait).
- **Open Decision / Recommendation**: Implement a cleanup teardown hook in `tests/cms_public_endpoints.test.ts` so future automated CI/CD runs do not increment live `public.media` rows. Recommended default: Add isolated test teardown cleanup.

---

## 1. Overview & Core Concept

- **What It Does**: Establishes an end-to-end security and data integrity verification pipeline for the ProBitian digital learning platform. It verifies that client-side direct uploads and bucket enumeration are completely blocked, all media delivery operates via secure public CDN endpoints, and every media database record maps 1-to-1 with an underlying cloud storage object.
- **Target Audience / Persona**: System Administrators, Security Engineers, and Content Editors managing technical courses, portfolio projects, blog tutorials, and B2B outreach media.
- **Key Value**: Guarantees zero data loss, eliminates unauthorized storage access vectors, and prevents broken images across production web pages while maintaining full administrative CMS flexibility.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Admin Asset Ingestion**:
   - Content Editor selects an image (PNG, JPEG, WebP, SVG) or PDF document within the Admin Media Library (`/admin` → Media).
   - System performs client validation (max 15MB) and dispatches a multipart upload request to the protected Express endpoint (`POST /api/cms/media/upload`).
   - Server validates magic byte signatures, sanitizes SVG content via DOMPurify, generates a collision-resistant path in `uploads/`, stores the asset in `probitian-media`, and records metadata in `public.media`.
   - Admin UI displays immediate progress feedback, renders a thumbnail preview, and provides a one-click copyable CDN URL.
2. **Pre-Deletion Reference Inspection**:
   - Administrator selects one or more assets for removal.
   - The UI queries `GET /api/cms/media/:id/usage`. If the asset is active in branding, blog cover images, project showcases, or founder avatars, the UI presents an explicit warning modal detailing referencing content models.
   - Accidental deletions of in-use media are prevented.
3. **Public Visitor Asset Delivery**:
   - Anonymous site visitors browse tutorials, projects, and courses.
   - All visual media loads cleanly with HTTP 200 via CDN caching (`https://dlaehchzzkjsrarktfsf.supabase.co/storage/v1/object/public/probitian-media/...`), with zero database or RLS queries incurred by the browser.

### Visual Identity & Layout Theme
- **Aesthetic Direction**: High-trust, professional educational portal with dark-mode elegance and high-contrast typography.
- **Color Palette Tokens**:
  - Background: Deep slate neutral (`--background: #0f172a`, `--surface: #1e293b`)
  - Primary Accent: Precision cyan / electric blue (`--primary: #06b6d4`, `--primary-hover: #0891b2`)
  - Semantic Status: Emerald green for verified states (`--success: #10b981`), Amber for warnings (`--warning: #f59e0b`), Crimson for blocked attempts (`--danger: #ef4444`)
- **Interactive Feedback**:
  - Micro-animations on media grid card selection and upload progress bars.
  - Non-destructive error toasts preserving editor selection sets if a bulk deletion batch encounters a protected reference.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Authoritative Media Pipeline vs. Direct Storage Token Uploads**
  - *Chosen Approach*: Route all asset uploads through the Express backend with session-cookie authentication, server-side MIME sniffing, and DOMPurify SVG sanitization.
  - *Why*: Direct client uploads via Supabase JWTs bypass server-side file inspection, risking stored XSS (malicious SVG scripts) or polyglot payload execution. Server mediation enforces rigorous sanitization before bytes reach storage.
  - *Alternatives Considered*: Direct pre-signed URLs from client. Rejected because client cannot enforce deep magic-byte validation or comprehensive SVG script stripping.

- **Decision 2: Retention of Historical Unregistered Branding Assets**
  - *Chosen Approach*: Permanently retain `general/1786374902395-2c321b22-Logo__2_.svg` and `general/1786374914972-c54a1a00-Banner.svg` as preserved legacy assets while marking them in audit logs.
  - *Why*: Deleting legacy branding can cause silent broken asset links in external historical marketing or social share scrapers.
  - *Alternatives Considered*: Deleting unregistered storage objects automatically during audits. Rejected due to high risk of unintended collateral damage.

- **Decision 3: Test Fixture Teardown vs. Permanent Accumulation**
  - *Chosen Approach*: Update end-to-end integration tests to automatically clean up their uploaded files upon completion.
  - *Why*: Previous test executions increased database records from 165 to 175, and then to 180. Automated teardown keeps the production database lean and eliminates count drift during CI runs.
  - *Alternatives Considered*: Running tests against a dedicated staging project. Ideal for long term, but automated teardown ensures immediate hygiene in the current shared environment.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Security Boundary

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PUBLIC VISITOR BROWSER                          │
│   • Views Home, Blog, Projects, Learn, About                           │
│   • Direct CDN Asset Fetch (HTTP 200, Content-Type: image/*)          │
│   • Direct API/Storage Enumeration BLOCKED by RLS (HTTP 403 / 0 items) │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
                   ▼ (Public Read-Only CDN)
┌────────────────────────────────────────────────────────────────────────┐
│               SUPABASE STORAGE (`probitian-media` BUCKET)              │
│   • Public Read CDN Enabled                                            │
│   • Direct Client Insert / Update / Delete BLOCKED by Storage RLS       │
│   • 182 Total Objects (179 in uploads/, 3 in general/)                 │
│   • 0 Missing Storage Objects across all 180 Media Database Rows       │
└──────────────────▲─────────────────────────────────────────────────────┘
                   │ (Service Role Privileged Client)
┌──────────────────┴─────────────────────────────────────────────────────┐
│                       EXPRESS CMS BACKEND API                          │
│   • Session Cookie & HMAC-SHA-256 Token Verification                   │
│   • RBAC Enforcement (`EDIT_CONTENT` / `MANAGE_CRM`)                   │
│   • File Magic-Byte Sniffing & DOMPurify SVG Sanitization              │
│   • Path Traversal Defense & Unique Nanoid Prefixing                   │
│   • Referential Integrity Pre-Check (`mediaReferenceService`)          │
└──────────────────▲─────────────────────────────────────────────────────┘
                   │ (Authenticated HttpOnly Admin Session)
┌──────────────────┴─────────────────────────────────────────────────────┐
│                      ADMIN CONTROL CENTER UI                           │
│   • Media Library Multi-Select & Batch Actions                         │
│   • Dynamic Usage Warning Modals Before Asset Removal                  │
│   • Unified Brand, Blog, Course, and Project Media Picker              │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Reconciliation Model

```
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  `public.media` (PostgreSQL) │          │ `probitian-media` (Storage)  │
│  Total Rows: 180             │          │ Total Objects: 182           │
│                              │          │                              │
│  • Registered Uploads: 179   │◄────────►│ • uploads/* Objects: 179     │
│  • Registered Logo: 1        │◄────────►│ • general/probitian_logo: 1  │
│                              │          │                              │
│  • Missing Objects: 0 (100%) │          │ • Preserved Historical: 2    │
│                              │          │   - general/Logo__2_.svg     │
│                              │          │   - general/Banner.svg       │
└──────────────────────────────┘          └──────────────────────────────┘
```

### Interactive State & Component Mapping
- **`MediaGrid` & `MediaCard`**: Renders uploaded items with mime badges, file sizes, and selection checkboxes.
- **`SelectionToolbar`**: Displays count of selected items with instant "Select All", "Deselect", and "Bulk Delete" buttons.
- **`UsageWarningModal`**: Triggered when attempting deletion of assets matching active tokens in `blogs`, `projects`, `courses`, `videos`, or `settings`.
- **`UploadDropzone`**: Handles drag-and-drop ingestion with real-time feedback, rejecting prohibited executable formats (`.exe`, `.elf`, `.sh`, `.php`) before transmission.

### Verification Execution Roadmap
1. **Automated Regression**: Execute full suite (`npm test`) confirming 211 passing tests across 35 suites with exit code 0.
2. **Storage Audit Verification**: Verify `tests/storage_security_audit.test.ts` passes 6/6 tests using isolated disposable probe assertions.
3. **Documentation Alignment**: Synchronize `docs/STORAGE_AUDIT_REPORT.md` with reconciled counts (180 database rows, 182 storage objects, 0 missing, 2 preserved historical assets).
4. **Compliance Status**: Affirm verdict `PASS WITH WARNINGS` reflecting verified storage security alongside the acknowledged `auth_leaked_password_protection` advisory.
