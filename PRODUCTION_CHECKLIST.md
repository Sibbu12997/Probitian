# Production checklist entry point

The previous version of this file used pre-checked boxes for security, database, accessibility, and backup claims without attaching release-specific evidence. Those checks should not be treated as proof of the current production state.

Use the maintained [Production Release Checklist](docs/PRODUCTION_RELEASE_CHECKLIST.md) for each release. It is intentionally unchecked until an operator verifies each item in the target environment.

Repository CI can validate code, tests, dependency audit, and build. It cannot by itself prove live hosting configuration, production database state, backup recoverability, end-to-end production behavior, or accessibility conformance.

**Database safety:** `supabase/migrations/0001_probitian_baseline.sql` is for new/empty Supabase projects only. Never apply it to the existing production database. Use reviewed forward-only migrations for production changes.
