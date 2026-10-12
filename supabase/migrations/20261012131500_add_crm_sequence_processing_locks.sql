-- Forward-only production migration: owner-token leases for CRM sequence workers.
-- Apply and verify before deploying code that calls these RPCs. Never apply the consolidated
-- fresh-install baseline to an existing production project.

CREATE TABLE IF NOT EXISTS public.crm_sequence_locks (
  lock_key text PRIMARY KEY,
  owner_token uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_sequence_locks_key_length CHECK (length(lock_key) BETWEEN 1 AND 200)
);

ALTER TABLE public.crm_sequence_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_sequence_locks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_sequence_locks TO service_role;

CREATE OR REPLACE FUNCTION public.try_acquire_crm_sequence_lock(
  p_key text, p_owner_token uuid, p_lease_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF p_key IS NULL OR length(p_key) < 1 OR length(p_key) > 200
     OR p_owner_token IS NULL OR p_lease_seconds IS NULL
     OR p_lease_seconds < 1 OR p_lease_seconds > 900 THEN
    RETURN false;
  END IF;

  INSERT INTO public.crm_sequence_locks (lock_key, owner_token, expires_at, created_at, updated_at)
  VALUES (p_key, p_owner_token, clock_timestamp() + make_interval(secs => p_lease_seconds), clock_timestamp(), clock_timestamp())
  ON CONFLICT (lock_key) DO UPDATE
    SET owner_token = EXCLUDED.owner_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = EXCLUDED.updated_at
    WHERE public.crm_sequence_locks.expires_at <= clock_timestamp()
       OR public.crm_sequence_locks.owner_token = EXCLUDED.owner_token
  RETURNING owner_token INTO v_owner;

  RETURN FOUND AND v_owner = p_owner_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_crm_sequence_lock(p_key text, p_owner_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_key IS NULL OR p_owner_token IS NULL THEN RETURN false; END IF;
  DELETE FROM public.crm_sequence_locks WHERE lock_key = p_key AND owner_token = p_owner_token;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.try_acquire_crm_sequence_lock(text, uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.release_crm_sequence_lock(text, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.try_acquire_crm_sequence_lock(text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_crm_sequence_lock(text, uuid) TO service_role;

COMMENT ON TABLE public.crm_sequence_locks IS
  'Owner-token leases used to prevent concurrent CRM sequence workers and duplicate per-step dispatch.';
