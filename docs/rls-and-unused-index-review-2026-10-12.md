# Production RLS and unused-index review (2026-10-12)

## Scope and production action

Project: `dlaehchzzkjsrarktfsf`.

The forward-only migration `20261012062531_consolidate_permissive_rls_policies` was applied to production on 2026-10-12. Its SQL is recorded in the sibling migration file in this repository.

The migration replaces overlapping admin/editor `FOR ALL` and public-read policies with a single authenticated SELECT policy per affected table, separate anonymous public-read policy, and command-specific admin/editor write policies. On `messages` and `newsletter`, the authenticated INSERT policy combines the existing admin/editor path with the same public-form validation predicate; anonymous INSERT retains the validation predicate. Existing column-level INSERT grants remain in force. Published-only rules for blogs, courses, projects and videos, visibility for navigation, settings allowlist and active social links are preserved.

Affected tables: blogs, categories, courses, media, messages, navigation, newsletter, pages, projects, settings, social_links, videos.

## Verification

After application, Supabase Performance Advisor no longer returned the `multiple_permissive_policies` lint. It continued to report 17 `unused_index` informational findings. This is evidence that the overlapping-policy finding was resolved; it is not a substitute for end-to-end tests of anonymous users, authenticated non-admin users, editors and admins.

CMS tables `projects`, `blogs`, `courses`, `videos`, and `categories` are intentionally empty. This migration does not seed, restore, or modify their data.

## Unused-index investigation and decision

Postgres statistics were reset at `2026-07-24 08:28:18 UTC`; the snapshot was taken `2026-10-12`. Thus zero `idx_scan` is evidence of no recorded index scan since the reset, not proof an index is unnecessary. Several affected tables are empty or low volume, and the listed indexes are mostly 8–40 kB.

**No indexes were dropped.** This is intentional, risk-based remediation rather than ignoring the advisor:

- Keep primary-key and unique indexes; they enforce identity/uniqueness and are not cleanup candidates.
- Keep `idx_admin_revocations_lookup` and `idx_admin_revocations_expires_at`: security/session-revocation lookups and expiry cleanup should not be degraded based only on historical scan counters.
- Keep `idx_audit_logs_actor`, `idx_audit_logs_action`, `idx_audit_logs_resource`: audit investigations and filtering are expected even if infrequent.
- Keep `idx_content_revisions_lookup` and `idx_content_revisions_created_at`: history/version retrieval and ordering are expected features; table is currently empty.
- Keep `idx_videos_published_created_at`: videos table is intentionally empty; this index supports the published-video listing when content is added.
- Keep lead/campaign indexes (`idx_leads_email`, `idx_leads_status`, `idx_leads_priority`, `idx_campaign_leads_lead_id`, `idx_campaign_leads_status`, `idx_lead_campaigns_status`) because these are CRM filter/join paths and dropping them could regress admin operations.
- Keep `idx_feedback_status`, `idx_feedback_featured`, and `idx_email_campaign_recipients_campaign_id` for moderation/filtering and campaign recipient joins.

Recommended follow-up: collect another representative usage window after normal production traffic and feature use; compare `idx_scan`, table sizes, actual query plans, and application query patterns before dropping any non-constraint index. Avoid dropping indexes merely to silence an informational lint.

## Known limitation

The migration was applied directly through the Supabase migration API before the repository migration file was committed. The file added in this branch records the exact SQL submitted. Confirm the GitHub CI result and then merge this branch to keep repository and production migration ledgers aligned.
