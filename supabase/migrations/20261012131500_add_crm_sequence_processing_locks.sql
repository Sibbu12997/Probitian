-- Forward-only production migration: owner-token leases for CRM sequence workers.
-- Apply and verify before deploying code that calls these RPCs. Never apply the consolidated
-- fresh-install baseline to an existing production project.

CREATE TABLE public.crm_sequence_locks (
  lock_key text PRIMARY KEY,
  owner_token uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT crm_sequence_locks_key_length CHECK (pg_catalog.length(lock_key) BETWEEN 1 AND 200)
);

ALTER TABLE public.crm_sequence_locks ENABLE ROW LEVEL SECURITY;
-- Only the SECURITY DEFINER RPCs should access lock state; no direct table DML is granted.
REVOKE ALL ON TABLE public.crm_sequence_locks FROM PUBLIC, anon, authenticated, service_role;

-- Remember every owner token so a delayed worker cannot reacquire a lock after another
-- worker has taken over and released it. Tokens are unique per lock acquisition attempt.
CREATE TABLE public.crm_sequence_lock_tokens (
  owner_token uuid PRIMARY KEY,
  lock_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT crm_sequence_lock_tokens_key_length CHECK (pg_catalog.length(lock_key) BETWEEN 1 AND 200)
);

ALTER TABLE public.crm_sequence_lock_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_sequence_lock_tokens FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.try_acquire_crm_sequence_lock(
  p_key text, p_owner_token uuid, p_lease_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seen_key text;
  v_owner uuid;
BEGIN
  IF p_key IS NULL OR pg_catalog.length(p_key) < 1 OR pg_catalog.length(p_key) > 200
     OR p_owner_token IS NULL OR p_lease_seconds IS NULL
     OR p_lease_seconds < 1 OR p_lease_seconds > 900 THEN
    RETURN false;
  END IF;

  -- A token that has ever been used may only renew its still-live lease for that key.
  -- It may never take over an expired or released lock, even if the row still contains
  -- an old owner or a later owner has since released the lock.
  SELECT lock_key INTO v_seen_key
    FROM public.crm_sequence_lock_tokens
   WHERE owner_token = p_owner_token;

  IF FOUND THEN
    IF v_seen_key <> p_key THEN RETURN false; END IF;
    UPDATE public.crm_sequence_locks
       SET expires_at = pg_catalog.clock_timestamp() + pg_catalog.make_interval(secs => p_lease_seconds),
           updated_at = pg_catalog.clock_timestamp()
     WHERE lock_key = p_key
       AND owner_token = p_owner_token
       AND expires_at > pg_catalog.clock_timestamp();
    RETURN FOUND;
  END IF;

  -- A new token can acquire a fresh key or take over an expired lease. The unique key
  -- and conditional UPSERT make competing owners serialize atomically in PostgreSQL.
  INSERT INTO public.crm_sequence_locks (lock_key, owner_token, expires_at, created_at, updated_at)
  VALUES (p_key, p_owner_token, pg_catalog.clock_timestamp() + pg_catalog.make_interval(secs => p_lease_seconds), pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp())
  ON CONFLICT (lock_key) DO UPDATE
    SET owner_token = EXCLUDED.owner_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = EXCLUDED.updated_at
    WHERE public.crm_sequence_locks.expires_at <= pg_catalog.clock_timestamp()
      AND public.crm_sequence_locks.owner_token <> EXCLUDED.owner_token
  RETURNING owner_token INTO v_owner;

  IF NOT FOUND OR v_owner IS DISTINCT FROM p_owner_token THEN RETURN false; END IF;

  INSERT INTO public.crm_sequence_lock_tokens (owner_token, lock_key)
  VALUES (p_owner_token, p_key);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_crm_sequence_lock(p_key text, p_owner_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_key IS NULL OR p_owner_token IS NULL THEN RETURN false; END IF;
  -- Keep a tombstone with the old owner token. Deleting the row would let a delayed
  -- callback from the old worker INSERT it again and resurrect an already released lease.
  UPDATE public.crm_sequence_locks
     SET expires_at = pg_catalog.clock_timestamp(),
         updated_at = pg_catalog.clock_timestamp()
   WHERE lock_key = p_key
     AND owner_token = p_owner_token
     AND expires_at > pg_catalog.clock_timestamp();
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
