# ProBitian

ProBitian is a full-stack Business Intelligence and Data Analytics learning platform with a public learning portal and an authenticated CMS/Admin Control Center.

- **Website:** https://probitian.ai.studio/
- **Stack:** React, TypeScript, Vite, Express/Node.js, Supabase PostgreSQL and Storage
- **Repository:** https://github.com/Sibbu12997/Probitian
- **Contact:** probitianofficial@gmail.com

## Product capabilities

- Public learning pages, articles, videos and project showcases
- Admin tools for content, branding, media library, founder message, SEO and navigation
- CRM lead management, outreach sequences and email campaigns
- Contact forms, newsletter subscriptions and feedback moderation
- Analytics, audit logging, session revocation and security controls

## Repository structure

```text
src/                     React application, pages, components and frontend services
  app/                   Routing, shell, session and SEO integration
  pages/                 Public pages and admin portal
  pages/admin/modules/   CMS and admin feature modules
  services/              Frontend API/domain clients
server.ts                Express application entry point
server/                  API routes, auth, middleware, security and services
supabase/
  migrations/            Single consolidated baseline for fresh projects
  schema.sql             Pointer to canonical baseline
  legacy-migrations.md   Historical migration inventory and warning
tests/                   Unit, security and guarded integration tests
docs/                    Maintained developer and operator documentation
.github/workflows/       CI and CodeQL workflows
```

See [Architecture](docs/ARCHITECTURE.md) and [Documentation Index](docs/README.md).

## Quick start

Requirements: a supported Node.js version and npm. Read [Connection and Environment Setup](docs/CONNECTION_SETUP.md) before configuring credentials.

```bash
npm ci
cp .env.example .env
# Set only the values required by the features you use.
npm run dev
```

Useful checks:

```bash
npm run lint
npm test
npm run build
```

Review `package.json` for authoritative scripts. Never commit real secrets or expose server-only Supabase credentials to the browser. Treat every `VITE_` variable as public.

## Database and migrations

- `supabase/migrations/0001_probitian_baseline.sql` is the canonical schema baseline for **new/empty Supabase projects only**.
- **Do not run this baseline against existing production.** It is a schema-creation script, not an upgrade migration.
- Removing legacy SQL files from the active directory does not remove production objects or reset Supabase migration history.
- CMS content is intentionally not seeded by the baseline.
- Existing production changes must use reviewed forward-only migrations after comparing live schema and migration history.
- RLS and SQL grants are separate controls. Server routes using a privileged Supabase client must explicitly authorize requests and filter public output.

Read [Database Migration Guide](docs/DATABASE_MIGRATIONS.md), [Connection Setup](docs/CONNECTION_SETUP.md), and [Security](docs/SECURITY.md) before database or deployment changes.

## Configuration and social links

Environment variable names are documented in `.env.example` and [Connection Setup](docs/CONNECTION_SETUP.md). Optional integrations include Supabase, Gemini, GA4, Gmail SMTP and a Power BI demo URL.

The live database currently configures YouTube, Instagram, Facebook, GitHub, X, LinkedIn and email links. The Admin Control Center/live settings are the operational source for public social links; update live settings and environment defaults together when a destination changes.

## Documentation

Start at [docs/README.md](docs/README.md). Edit maintained source docs rather than generating duplicate stale copies.

## Contributing

1. Inspect the implementation and tests before changing behavior.
2. Add or update tests for meaningful behavior/security changes.
3. Use the baseline only for clean installations; use reviewed forward-only migrations for existing installations.
4. Run lint, tests and build when possible, and report checks that could not be run.
5. Never commit credentials, production exports or personal data.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

See [LICENSE](LICENSE) for the software license and separate ProBitian brand/content reservations.

© 2026 ProBitian.
