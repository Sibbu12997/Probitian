-- ==============================================================================
-- 0021: Restrict direct Storage uploads and legacy bucket enumeration
-- Target: Supabase PostgreSQL (Production, forward-only)
--
-- ProBitian's documented media architecture routes uploads through the Express
-- media API using the server-side Supabase secret. That trusted server client
-- bypasses Storage RLS. Browser clients must not receive broad direct INSERT
-- access to storage.objects.
--
-- Public object URLs for public buckets continue to work without a SELECT
-- policy. Removing the legacy SELECT policy prevents API enumeration/listing
-- for the legacy buckets; it does not change bucket visibility or delete files.
-- ==============================================================================

-- Remove the broad policy that lets any authenticated user upload to any bucket.
DROP POLICY IF EXISTS "Auth upload storage" ON storage.objects;

-- Public buckets are readable by known object URL; this policy unnecessarily
-- also allows listing/enumerating objects in legacy buckets.
DROP POLICY IF EXISTS "Public storage access" ON storage.objects;
