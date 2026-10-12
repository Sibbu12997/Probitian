# ProBitian

ProBitian is a full-stack Business Intelligence and Data Analytics learning platform with a public learning portal and an authenticated CMS/Admin Control Center.

- **Website:** https://probitian.ai.studio/
- **Stack:** React, TypeScript, Vite, Express/Node.js, Supabase PostgreSQL and Storage
- **Repository owner/maintainer:** Shivam Singh

## Features

- Public learning pages, articles, videos and project showcases
- Admin tools for content, branding, media, founder message, SEO and navigation
- CRM lead management, outreach sequences and email campaigns
- Contact forms, newsletter subscriptions and feedback moderation
- Analytics and operational/security controls

## Current codebase layout

```text
src/                     React application, pages, components and frontend services
  app/                   Routing, shell, session and SEO integration
  pages/                 Public pages and admin portal
  pages/admin/modules/   CMS and admin feature modules
  services/              Frontend API/domain clients
server.ts                Express application entry point
server/
  routes/                API route handlers
  auth/                  Session and RBAC logic
  middleware/            Request middleware and error handling
  security/              CORS, CSRF, headers, sanitization and token protections
  services/              Supabase, storage, analytics, CRM and audit services
supabase/
  migrations/            Forward-only SQL migration history
  schema.sql             Schema reference; verify against live production
tests/                   Unit, security and guarded integration tests
docs/                    Maintained developer and operator documentation
.github/workflows/       CI and CodeQL workflows
```

For the expanded structure and security boundaries, read [Current Architecture](docs/ARCHITECTURE.md).

## Local development

Requirements: a supported Node.js version and npm.

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm run lint
npm test
npm run build
```

Review `package.json` for the authoritative script definitions and `.env.example` for required configuration names. Never commit real secrets or expose server-only Supabase credentials to the browser.

## Database and security

- Supabase PostgreSQL is the production persistence layer; Supabase Storage holds application media.
- SQL changes must be forward-only and reviewed before applying to any shared environment.
- A migration file in Git is not proof that the migration has been applied to a database.
- Row Level Security and SQL grants are separate controls.
- Public API handlers that use a privileged server-side Supabase client must explicitly filter public records and return only safe fields.
- Production integration tests must be blocked by the repository's test safety guard.

Read [Database Migrations](docs/DATABASE_MIGRATIONS.md) and [Security](docs/SECURITY.md) before making schema, access-control or deployment changes.

## Documentation

The maintained documentation is in [`docs/`](docs/README.md). It covers architecture, database migrations, security, deployment, analytics, email, CRM sequences, media, newsletter, SEO and user/admin workflows.

Generated public Markdown exports and PDF guides were removed to avoid duplicate, stale documentation. Update the maintained source documents under `docs/` instead.

## Contributing

1. Inspect the existing implementation and tests before changing behavior.
2. Add or update tests for meaningful behavior/security changes.
3. For schema changes, add a new migration; do not rewrite applied migrations.
4. Run lint, tests and build when possible, and report any check that could not be run.
5. Never commit credentials, production exports or personal data.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Source code is licensed under the [MIT License](LICENSE). ProBitian branding, trademarks and original educational content remain subject to the terms stated in the license.

© 2026 ProBitian.
