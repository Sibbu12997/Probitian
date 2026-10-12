# ProBitian — Current Architecture

> Last reconciled: 12 October 2026. This document describes the repository structure and the production controls verified during the latest maintenance pass. It is not a claim that every endpoint has been fully regression-tested.

## System overview

ProBitian is a React + TypeScript single-page application backed by an Express/Node.js API and Supabase PostgreSQL/Storage.

```text
Browser
  └─ React SPA (src/)
      └─ Express API (server.ts, server/routes/)
          ├─ Authentication, sessions and RBAC (server/auth/, server/middleware/)
          ├─ Domain services (server/services/)
          └─ Supabase PostgreSQL + Storage
```

- **Frontend:** `src/` contains app routing/shell, public pages, admin portal modules, shared components, and client-side libraries.
- **Backend:** `server.ts` mounts API routes; `server/routes/` contains CMS, auth, analytics, CRM, feedback, newsletter and SEO endpoints. Security middleware and domain services live under `server/`.
- **Data platform:** Supabase PostgreSQL is the production data store. SQL migrations are versioned in `supabase/migrations/`; `supabase/schema.sql` is a schema reference and must be checked against the live database before use.
- **Media:** Supabase Storage bucket `probitian-media` is the active application bucket. Public object delivery does not imply public permission to list or mutate objects.
- **Tests:** `tests/` contains API, security, routing, media and database-integration checks. Tests that touch a real Supabase project must be opt-in and guarded against production.
- **Automation:** `.github/workflows/` contains CI and CodeQL workflows; Dependabot configuration is in `.github/dependabot.yml`.

## Key directories

| Path | Responsibility |
|---|---|
| `src/pages/` | Public pages and admin entry points |
| `src/pages/admin/modules/` | Admin CMS and operational modules |
| `src/services/` | Frontend service clients |
| `server/routes/` | HTTP API endpoints |
| `server/auth/` | Session and role/permission model |
| `server/middleware/`, `server/security/` | Request protections |
| `server/services/` | Database, storage, audit, CRM and analytics services |
| `supabase/migrations/` | Forward-only SQL changes |
| `tests/` | Unit, integration and security tests |
| `docs/` | Maintained developer and operator documentation |

## Security boundaries

1. Keep privileged Supabase credentials and other secrets server-side only.
2. Public API handlers using a service-role client must explicitly filter records and fields; RLS is not a substitute for application-level filtering when a privileged client bypasses RLS.
3. Admin operations must enforce server-side session verification and permissions. Client-side hiding is not authorization.
4. Public storage delivery and direct object listing/upload/update/delete are separate capabilities. Uploads and mutations should go through the authenticated server workflow.
5. Public form endpoints must accept only user-submitted fields. Moderation, delivery, reply, and administrative fields remain server-owned.
6. Never run destructive resets or historical migrations against production. Apply new, reviewed migrations incrementally and verify the result.

## Current migration notes

The repository includes these production migrations added on 12 October 2026:

- `20261012050720_add_video_publication_controls.sql`: adds `videos.published` and `videos.published_at`, creates a public read policy for published videos, and adds a partial index.
- `20261012050802_harden_public_insert_and_feedback_access.sql`: revokes direct feedback SELECT for public roles and limits public message/newsletter inserts to permitted columns.

The database changes have been applied to the production Supabase project. Keep API behavior aligned with these controls. In particular, privileged server-side video queries must filter `published = true` on public endpoints; the database policy alone cannot filter service-role queries.

Migration names and version timestamps in Supabase history may not map one-to-one to older numeric filenames. Do not rename or rewrite historical migration files to make the sequence look uniform.

## Local development and checks

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Use the repository's configured scripts as the source of truth. Review `package.json` and `.github/workflows/ci.yml` rather than relying on test counts copied into old reports.

## Documentation policy

- Maintain technical documentation in `docs/`.
- Do not commit generated PDF copies or duplicate public documentation exports.
- Keep dated audit results as dated evidence only; do not present old point-in-time counts as current state.
- When schema or security behavior changes, update the relevant source document and verify it against the code and production state.
