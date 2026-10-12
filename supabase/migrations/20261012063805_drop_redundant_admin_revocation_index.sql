-- Remove the redundant composite index on admin session revocations.
-- Lookups and upsert conflict handling use target, already covered by
-- the unique index idx_admin_revocations_target.
DROP INDEX IF EXISTS public.idx_admin_revocations_lookup;
