# Connection and Environment Setup

This guide covers local setup and configuration for ProBitian. Never paste real secrets into GitHub, issue trackers, AI prompts, screenshots, or logs.

## Scheduled CRM sequence processing

The sequence worker uses PostgreSQL owner-token leases, not the rate-limit counter. Before deploying a version that calls `try_acquire_crm_sequence_lock` / `release_crm_sequence_lock`, apply and verify `supabase/migrations/20261012131500_add_crm_sequence_processing_locks.sql` in the target database using the approved migration process. This is a forward-only migration for an existing project; do not apply the fresh-install baseline. The worker deliberately fails closed if the lock RPCs are unavailable.

Configure `CRON_SECRET` as a dedicated high-entropy secret in the production hosting environment and in the external scheduler. Send it as a Bearer token or `x-cron-key` header when calling `POST /api/cron/process-sequences`. Do not reuse `SUPABASE_SERVICE_ROLE_KEY` or another database credential for scheduler authentication. If the secret is absent, secret-based cron requests are rejected; an authorized admin session remains a separate supported path.

## Local installation

```bash
npm ci
cp .env.example .env
npm run dev
```

For production, use `npm run build` then `npm start`. Check `package.json` for the authoritative scripts.

## Supabase connection

- `VITE_SUPABASE_URL`: project URL; public.
- `VITE_SUPABASE_ANON_KEY`: anon/public key; public but governed by RLS.
- `SUPABASE_SECRET_KEY`: privileged backend credential. Server-only; never use a `VITE_` prefix.

Route privileged data operations through Express. Keep RLS enabled and grants least-privileged. Service-role clients bypass RLS, so server routes must enforce authorization and filter public output.

### Database setup modes

**New/empty project:** `supabase/migrations/0001_probitian_baseline.sql` is intended for a new, empty Supabase project only. Review and test on a disposable project first. It creates schema only; it does not seed CMS content or upload media.

**Existing production:** do not run the baseline, reset the migration ledger, or mark it as applied merely to align names. Production has its own migration history. Use reviewed forward-only changes for future schema updates. See [Database Migration Guide](DATABASE_MIGRATIONS.md) and [legacy migration notes](../supabase/legacy-migrations.md).

## URLs and CORS

- `APP_URL`: canonical server-side application URL.
- `VITE_SITE_URL`: public canonical website URL.
- `CORS_ALLOWED_ORIGINS`: optional comma-separated exact origins for trusted previews/deployments. Avoid broad wildcards in production.
- Keep the configured production origin consistent with the actual hosting hostname.

## Authentication and token signing

- `ADMIN_PASSKEY`: admin portal passkey when that auth mode is enabled.
- `ADMIN_EMAILS`: optional comma-separated admin email allowlist for Supabase Auth mode.
- `SESSION_SECRET`: optional server-side session signing secret.
- `UNSUBSCRIBE_SECRET`: required in production; unique random value of at least 32 bytes. Generate with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Store secrets in the host's secret manager. Never print their values or use test values in production.

## Optional integrations

| Integration | Variables | Notes |
|---|---|---|
| Gemini | `GEMINI_API_KEY` | Server-side AI key. |
| Power BI demo | `POWERBI_DEMO_URL` | Optional report URL; review Publish-to-web privacy first. |
| GA4 client tracking | `VITE_GA4_MEASUREMENT_ID` | Public measurement ID; respect consent implementation. |
| GA4 reporting API | `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` | Server-side reporting credentials. |
| Gmail SMTP | `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Server-side email delivery credentials. |

Set optional integrations only when required. Do not disable validation to force deployment startup.

## Public social links currently configured

- Website: https://probitian.ai.studio/
- YouTube: https://youtube.com/@probitian
- Instagram: https://instagram.com/probitian
- Facebook: https://facebook.com/probitian
- GitHub: https://github.com/probitian
- X: https://x.com/Probitian
- LinkedIn: https://www.linkedin.com/company/probitian/
- Email: probitianofficial@gmail.com

These are the URLs observed in current live settings, not a guarantee that each account is claimed or active. Confirm ownership before changing them. Update the Admin Control Center/live `social_links` table and any environment defaults together to avoid conflicting hardcoded links.

## Safe verification

- Check required variable names in the host environment panel without revealing values.
- Ensure no server-only keys appear in browser bundles or client network requests.
- Test the related feature in a safe environment.
- Never commit `.env`; commit only the example template.

## Troubleshooting

- **Supabase request fails:** verify URL/key pairing, network access, RLS and grants.
- **Admin API returns 401/403:** check session/auth, exact origin, CSRF, role and policy checks.
- **CORS blocked:** allow only the exact trusted origin in `CORS_ALLOWED_ORIGINS`.
- **Unsubscribe startup failure:** configure a strong production `UNSUBSCRIBE_SECRET`; do not remove validation.
- **Email fails:** verify SMTP credentials/provider access without logging secrets.
- **Analytics missing:** verify consent state, measurement ID and browser console/network behavior.

See [Troubleshooting](TROUBLESHOOTING.md) and [Security](SECURITY.md).
