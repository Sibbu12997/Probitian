# Contributing to ProBitian

Welcome to the **ProBitian** contribution guidelines! We are excited that you are interested in contributing to our Business Intelligence and Data Analytics learning platform.

---

## 📋 Table of Contents

1. [Welcome to ProBitian](#1-welcome-to-probitian)
2. [What You Can Contribute](#2-what-you-can-contribute)
3. [Before Contributing](#3-before-contributing)
4. [Development Setup](#4-development-setup)
5. [Project Architecture](#5-project-architecture)
6. [Contribution Workflow](#6-contribution-workflow)
7. [Pull Request Requirements](#7-pull-request-requirements)
8. [Code Quality Standards](#8-code-quality-standards)
9. [Security Contributions & Hardening](#9-security-contributions--hardening)
10. [Database & Migration Rules](#10-database--migration-rules)
11. [Educational Content Standards](#11-educational-content-standards)
12. [Commit Guidelines](#12-commit-guidelines)
13. [Issues and Pull Requests](#13-issues-and-pull-requests)
14. [Code of Conduct](#14-code-of-conduct)
15. [Contributor Recognition](#15-contributor-recognition)

---

## 1. Welcome to ProBitian

**ProBitian** is an enterprise-grade, full-stack learning platform and CMS dedicated to Business Intelligence, Power BI, SQL, DAX, Python, Data Modeling, and Modern Analytics. Founded and maintained by **Shivam Singh**, ProBitian bridges the gap between conceptual theory and industry execution with structured learning paths, portfolio project showcases, sample datasets, video walkthroughs, and technical blog posts.

Community contributions are essential to expanding our educational reach, enhancing platform performance, improving developer tooling, and maintaining the highest standard of data analytics education.

- **Official Website**: [https://probitian.ai.studio/](https://probitian.ai.studio/)
- **Project Maintainer**: **Shivam Singh**
- **Official Email**: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)

---

## 2. What You Can Contribute

We welcome contributions across various technical and educational domains:

- **Power BI & BI Educational Content**: Curated course paths, DAX formula cheat sheets, data modeling diagrams, and Power Query (M) recipes.
- **SQL & Analytics Examples**: Production-ready SQL queries, window function tutorials, schema designs, and optimization case studies.
- **Portfolio Projects & Datasets**: Curated practice datasets (CSV, XLSX) and BI dashboard project specifications for the resume portfolio gallery.
- **Frontend Enhancements**: Modern React components, responsive styling, accessibility (WCAG AA), smooth motion transitions, and light/dark theme refinements.
- **Backend & API Improvements**: Node.js/Express route handlers, rate limiters, transactional email pipelines, and media optimization.
- **Database & Migration Architecture**: Supabase PostgreSQL schemas, indexes, Row Level Security (RLS) policies, and performance tuning.
- **Documentation & User Guides**: Technical articles, API documentation, learner user guides, and administrator manuals.
- **Bug Fixes & Tooling**: Resolving open issues, improving build speed, TypeScript type safety, and linting.
- **Analytics & Reporting**: Enhancements to Google Analytics 4 (GA4) metric pipelines in the Admin Command Center.

---

## 3. Before Contributing

To maintain stability, security, and architectural consistency:

1. **Read the Repository Documentation**: Review [README.md](README.md) and technical architecture documents in [`docs/`](docs/).
2. **Understand the Source of Truth**: ProBitian uses **Supabase PostgreSQL** as its single, authoritative database in production. Local JSON files exist solely for offline development and sandbox previews.
3. **Protect Secrets & Sensitive Keys**: Never commit `.env` files, API keys (`GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`), admin passkeys, or SMTP passwords to version control.
4. **Preserve Security Controls**: Do not weaken Row Level Security (RLS), bypass server-side passkey verification, introduce unauthenticated admin APIs, or weaken CORS/CSRF protections.
5. **Check Existing Issues**: Search the GitHub issue tracker before starting work to avoid duplicate efforts.

---

## 4. Development Setup

ProBitian is built with **Node.js**, **Express**, **React 19**, **TypeScript**, and **Vite**.

### Prerequisites

- **Node.js**: `v18.x` or higher (Node 20+ recommended)
- **npm**: `v9.x` or higher
- **Git**

### Step-by-Step Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/probitian/probitian.git
   cd probitian
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file and configure your credentials:
   ```bash
   cp .env.example .env
   ```
   *For local development without cloud services, the server will operate in dev mode with local data caching.*

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   *The Express server and Vite frontend middleware will boot on [http://localhost:3000](http://localhost:3000).*

### Available npm Commands

| Command | Description |
| ------- | ----------- |
| `npm ci` | Clean, reproducible installation of exact locked dependencies from `package-lock.json`. |
| `npm run dev` | Starts the unified Express + Vite development server using `tsx` on port `3000`. |
| `npm run lint` | Runs the TypeScript compiler typecheck (`tsc --noEmit`) to validate type safety. |
| `npm test` | Runs the full security, authentication, and regression test suite using `tsx --test`. |
| `npm audit --audit-level=high` | Validates that zero high or critical dependency vulnerabilities exist. |
| `npm run build` | Compiles the React SPA via Vite and bundles `server.ts` into `dist/server.cjs` using `esbuild`. |
| `npm start` | Runs the bundled production CommonJS server (`node dist/server.cjs`). |
| `npm run preview` | Starts a Vite preview server for static client assets. |
| `npm run clean` | Cleans build artifacts (`dist/` directory). |

---

## 5. Project Architecture

Understanding the system architecture is essential before modifying core modules:

```
PROBITIAN APPLICATION (Full-Stack Architecture)
├── Client Tier: React 19 SPA + TypeScript + Vite + Tailwind CSS + Lucide Icons
│     └── Hash-based Router (`App.tsx`) with Public Portal & Protected Admin Control Center
├── Server Tier: Node.js + Express (Port 3000)
│     ├── API Gateway (`/api/cms/*`, `/api/admin/*`, `/api/analytics/*`, `/api/newsletter`)
│     ├── Admin Passkey Authentication & Session Cookie Issuance
│     ├── Gmail SMTP Transactional & Bulk Campaign Pipeline (Nodemailer)
│     ├── SVG DOMPurify Sanitization & Storage Proxy
│     └── Google Analytics 4 (GA4) API Proxy
├── Database Tier: Supabase PostgreSQL (Authoritative Production Source of Truth)
│     ├── Row Level Security (RLS) enabled on all tables
│     └── Server Service Role mediation via `SUPABASE_SECRET_KEY`
└── Storage Tier: Supabase Storage (`probitian-media` bucket)
```

### Architectural Principles

- **Authoritative Database**: Supabase PostgreSQL is the sole authoritative source of truth. Production writes and reads interact directly with Supabase.
- **Local JSON Cache**: `data/cms_settings.json` is strictly restricted to development environments and preview sandboxes. Local fallback is disabled in production.
- **Server Secret Isolation**: All privileged keys remain exclusively in server environment variables. Client bundles only receive public parameters prefixed with `VITE_`.
- **Admin Verification**: Administrative access to `/api/admin/*` and state-modifying `/api/cms/*` endpoints requires authenticated admin sessions (HttpOnly session cookies or verified authorization headers).

---

## 6. Contribution Workflow

We follow a standard, professional Git feature-branch workflow:

1. **Fork the Repository**: Click the **Fork** button on GitHub to create your copy.
2. **Create a Topic Branch**: Branch off `main` with a clear, descriptive name:
   ```bash
   # For new features
   git checkout -b feature/power-bi-dax-guide

   # For bug fixes
   git checkout -b fix/newsletter-validation

   # For documentation
   git checkout -b docs/database-migrations

   # For security enhancements
   git checkout -b security/rate-limit-tuning

   # For refactoring
   git checkout -b refactor/media-picker-component
   ```
3. **Implement Your Changes**: Write clean, modular, and readable code.
4. **Validate Locally**: Run TypeScript validation and build checks:
   ```bash
   npm run lint
   npm run build
   ```
5. **Commit Your Changes**: Use clear, conventional commit messages (see [Commit Guidelines](#12-commit-guidelines)).
6. **Push to Your Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**: Submit a Pull Request against the `main` branch of the official ProBitian repository.
8. **Engage in Code Review**: Address feedback or requests for clarification from maintainers promptly.

---

## 7. Pull Request Requirements

Every pull request must provide clear context. When opening a PR, include:

### Description
- **What Changed**: Summary of the changes introduced.
- **Why**: The problem being solved or the capability being added.
- **Affected Areas**: List of modified components, routes, or documentation files.

### Verification & Testing
- Steps taken to test the change locally.
- Test commands run (`npm run lint`, `npm run build`).
- Screenshots or screen recordings for visible UI/UX changes.

### Impact Checklist
Please verify the following before submitting:
- [ ] **Typecheck Passes**: `npm run lint` runs without errors.
- [ ] **Build Succeeds**: `npm run build` completes cleanly.
- [ ] **No Secrets Exposed**: No credentials, tokens, or `.env` files are included.
- [ ] **RLS & Security Preserved**: Security policies and passkey authentication remain intact.
- [ ] **Supabase Architecture Intact**: Production database contracts are preserved.
- [ ] **No Unsolicited Dependencies**: No unnecessary npm packages added.

---

## 8. Code Quality Standards

To maintain a maintainable and performant codebase:

- **TypeScript**:
  - Use explicit types, interfaces, and enums declared in `src/types.ts`.
  - Avoid using `any` unless strictly necessary for third-party library boundaries.
  - Import types cleanly at the top of each file.
- **React Components**:
  - Use functional components with React hooks.
  - Keep components modular and extract sub-components into `src/components/`.
  - Avoid infinite re-renders by stabilizing dependency arrays in `useEffect`.
- **Icons & Styling**:
  - **Icons**: Always import vector icons from `lucide-react`. Do not create arbitrary inline SVGs.
  - **Styling**: Use standard Tailwind CSS utility classes. Avoid inline `style` tags and separate `.css` files.
  - **Color & Contrast**: Maintain WCAG AA compliance (minimum 4.5:1 contrast for body text) across both Light and Dark modes.
- **API Communication & Error Handling**:
  - Catch network and API failures explicitly.
  - Never silently swallow backend error responses.
  - Return clear, user-friendly error messages in UI toast notifications and modals.

---

## 9. Security Contributions & Hardening

Security is paramount in ProBitian. When contributing backend or data handling logic:

- **Secret Isolation**: Privileged secrets (`SUPABASE_SECRET_KEY`, `ADMIN_PASSKEY`, `GMAIL_APP_PASSWORD`, `GEMINI_API_KEY`) must NEVER be sent to the client browser or referenced in client-side code.
- **Authorization Verification**: Ensure all administrative mutations on `/api/cms/*` and `/api/admin/*` are guarded by `requireAdmin` middleware.
- **Row Level Security (RLS)**: Never modify Supabase migrations to grant public `anon` unrestricted write access to tables.
- **Input Sanitization**: Validate and sanitize all user inputs, contact form fields, URLs, and file uploads.
- **SVG Protection**: All SVG media uploads must be sanitized server-side with DOMPurify to prevent stored XSS attacks.
- **Responsible Disclosure**: If you discover a vulnerability, report it privately via [SECURITY.md](SECURITY.md) to [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com).

---

## 10. Database & Migration Rules

When proposing schema updates or database changes:

1. **Numbered Migrations**: Add sequential SQL migration files inside `supabase/migrations/` following the existing naming format (e.g., `0007_new_feature_table.sql`).
2. **Safe DDL**: Use `IF NOT EXISTS` / `IF EXISTS` guards on tables, columns, and indexes.
3. **RLS Policies**: Always enable RLS on new tables (`ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`) and define explicit policies.
4. **Service Role Grants**: Grant backend service role access (`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`).
5. **No Destructive Server Code**: Server initialization scripts must never execute destructive operations (`DROP TABLE`, `TRUNCATE`).
6. **Data Compatibility**: Ensure new columns include sensible defaults or allow nulls to avoid breaking existing records.

---

## 11. Educational Content Standards

When contributing tutorials, DAX measures, SQL queries, or course outlines:

- **Technical Accuracy**: Test all DAX measures in Power BI Desktop and verify SQL queries against standard PostgreSQL/SQL Server engines.
- **Practical Context**: Include realistic business scenarios (e.g., Year-over-Year sales growth, customer retention, churn analysis, ETL data cleaning).
- **Clear Explanation**: Document the logic, filter context, and optimization considerations.
- **Intellectual Property**:
  - Respect copyrights for third-party materials.
  - Do NOT copy proprietary course materials from paid academies or books.
  - Use publicly available or synthetically generated datasets.
- **AI-Assisted Content Policy**: Content drafted with AI tools must be thoroughly reviewed, tested, and fact-checked by the contributor before submission. Unreviewed AI output is not accepted.

---

## 12. Commit Guidelines

We use conventional commit formatting to maintain a readable project history:

```
<type>: <short imperative summary>
```

### Commit Types

- `feat:` A new user-facing or administrative feature.
- `fix:` A bug fix in frontend, backend, or database logic.
- `docs:` Documentation additions or updates.
- `security:` Security enhancements, rate limiting, or vulnerability mitigations.
- `refactor:` Code restructuring without functional behavior changes.
- `chore:` Dependency updates, tooling configuration, or build script tweaks.

### Examples

```bash
git commit -m "feat: add DAX time intelligence filter to learn modules"
git commit -m "fix: sanitize inquiry form email address before submission"
git commit -m "docs: add step-by-step Supabase storage setup guide"
git commit -m "security: enforce strict regex validation on media asset IDs"
git commit -m "refactor: extract campaign recipient table into modular component"
```

---

## 13. Issues and Pull Requests

We use GitHub Issues and Pull Requests to coordinate improvements, track bug fixes, and review educational content.

### Working with Issues

- **Search Existing Issues First**: Before creating a new issue, search both open and closed issues to ensure your topic has not already been addressed or reported.
- **Use the Appropriate Issue Template**: When creating an issue, select the matching template from [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/):
  - [**Bug Report**](.github/ISSUE_TEMPLATE/bug_report.md) (`[BUG]`): For defects, UI glitches, API failures, or broken workflows.
  - [**Feature Request**](.github/ISSUE_TEMPLATE/feature_request.md) (`[FEATURE]`): For proposed learning modules, DAX recipes, analytics capabilities, or admin tooling.
  - [**Documentation Issue**](.github/ISSUE_TEMPLATE/documentation.md) (`[DOCS]`): For corrections, clarifications, or expansions in manuals or architecture guides.
  - [**Security Guidance**](.github/ISSUE_TEMPLATE/security.md) (`[SECURITY]`): Non-sensitive security documentation inquiries only.
- **One Problem or Feature Per Issue**: Keep each issue focused on a single actionable problem or capability rather than bundling multiple unrelated topics.
- **Provide Reproducible Technical Information**: For bug reports, include exact reproduction steps, affected URL/hash routes, browser/OS version, and DevTools console/network snippets where helpful.
- **Never Publicly Disclose Security Vulnerabilities**: If you discover an authorization bypass, credential exposure, or exploit, **do NOT file a public issue**. Follow our private disclosure process in [SECURITY.md](SECURITY.md) by contacting [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com).

### Working with Pull Requests

- **Use the PR Template**: Every pull request should fill out our [Pull Request Template](.github/pull_request_template.md).
- **Explain What and Why**: Clearly state what changes were made, the architectural impact (frontend, Express, Supabase, GA4), and the reasoning behind the implementation.
- **Document Testing & Verification**: Mention the specific tests performed and ensure both `npm run lint` (TypeScript validation) and `npm run build` (Vite + esbuild bundling) pass cleanly.
- **Security-Sensitive Review**: Changes affecting authentication (`requireAdmin`), passkey issuance, Supabase RLS, SVG sanitization, CORS, or server environment variables undergo rigorous manual review before merging.
- **Keep Documentation Synchronized**: Whenever modifying existing workflows, schemas, environment variables, or UI components, update the relevant user guides or architectural documentation in [`docs/`](docs/) within the same PR.

---

## 14. Code of Conduct

ProBitian is committed to fostering an open, welcoming, and inclusive learning community. All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 15. Contributor Recognition

Every meaningful contribution helps data learners around the world master Business Intelligence!

- **Release Notes**: Non-trivial contributions, bug fixes, and features are acknowledged in official release notes and changelogs.
- **Community Showcase**: Exceptional educational guides and portfolio datasets may be featured directly on the public ProBitian portal with contributor attribution.

---

*Thank you for contributing to ProBitian!*  
*Project Owner: Shivam Singh | Contact: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)*
