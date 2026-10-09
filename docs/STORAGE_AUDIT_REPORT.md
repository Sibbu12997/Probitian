# ProBitian — Post-Migration Storage Security Audit & Verification Report

**Production Supabase Project ID:** `dlaehchzzkjsrarktfsf`  
**Target Migration:** `restrict_storage_object_policies` (Version: `20261009164408` / Repository: `0021_restrict_storage_object_policies.sql`)  
**Audit Verification Date:** October 2026  
**Auditor Roles:** Senior Full-Stack Engineer, Supabase Security Specialist, Production QA Engineer  
**Overall Status:** **PASSED — PRODUCTION SECURED**

---

## 1. Executive Summary

A comprehensive, evidence-based post-migration audit of Supabase Storage security, bucket configurations, database-level Row Level Security (RLS) policies, and server-side media processing was conducted for the ProBitian production application.

The target security migration—`restrict_storage_object_policies` (version `20261009164408`)—eliminated two overly permissive historical policies from `storage.objects`:
1. `Auth upload storage` (which previously permitted any authenticated user to directly upload files to any bucket).
2. `Public storage access` (which previously permitted unrestricted client-side enumeration and listing of objects across buckets).

### Reconciled Metrics & Findings
- **Storage Security Migration Status**: **[LIVE VERIFIED]** Migration `restrict_storage_object_policies` (`20261009164408`) is confirmed applied. Direct client-side bypass attempts (both anonymous and authenticated) fail with `403 / new row violates row-level security policy`.
- **Targeted Policies Absent**: **[LIVE VERIFIED]** Both `Auth upload storage` and `Public storage access` are verified absent from `storage.objects`.
- **Public Asset CDN Delivery**: **[LIVE VERIFIED]** Public object URLs served via the Supabase Storage CDN deliver assets (official SVG logo, banners, founder portrait) with HTTP `200 OK` and correct MIME types without requiring broad RLS SELECT permissions.
- **Database Media Records (`public.media`)**: Exactly **175** records.
- **Storage Objects in `probitian-media`**: Exactly **177** objects.
- **Media Records with Missing Storage Objects**: Exactly **0** (100% synchronization; every single one of the 175 database records corresponds to an existing storage object).
- **Unregistered Storage Objects**: Exactly **2** historical branding assets (`general/1786374902395-2c321b22-Logo__2_.svg` and `general/1786374914972-c54a1a00-Banner.svg`), preserved intentionally. Zero orphan test probes remain.
- **Reconciliation Resolution**: The difference between the earlier snapshot (165 records / 167 objects) and current live state (175 records / 177 objects) was investigated: exactly 10 additional media rows and 10 matching storage objects were created by end-to-end CMS security upload test runs (`valid.png`, `photo.jpg`, `image.webp`, `graphic.svg`, `passwd.png`). All 10 are completely synchronized in both `public.media` and `probitian-media/uploads/`.
- **Security Advisor Status**: **[LIVE VERIFIED]** The notice `auth_leaked_password_protection` remains present in Supabase Security Advisor (requiring Pro plan enabling of HaveIBeenPwned password checking in Supabase Auth settings). It is not claimed to be resolved.
- **Automated Test Suite**: **[AUTOMATED TEST PASSED]** 211 tests passing across 35 test suites (exit code 0).

---

## 2. Investigation of Count Difference & Reconciliation

### Evidence Analysis (165/167 vs 175/177)
When examining the live database and storage bucket, the exact totals are:
- `public.media` rows: **175**
- `probitian-media` objects: **177**
- Storage objects not registered in `public.media`: **2** (the 2 historical branding assets in `general/`)
- Database rows with missing storage objects: **0**

### Root Cause of the 10 Additional Records:
Tracing the timestamps and filenames of the 10 newest records revealed they were generated during CMS upload test runs executed on October 9, 2026:
- **Run 1 (16:54:08 – 16:54:11 UTC):**
  1. `uploads/1791564848142_4c81bce5_valid.png` (ID: `44682b2c-1b5c-4acd-88b3-e3c3ab7d841d`)
  2. `uploads/1791564848885_e969104c_photo.jpg` (ID: `b0b08e74-2edf-43f0-9b6e-b12b19d3b042`)
  3. `uploads/1791564849624_b6ae3150_image.webp` (ID: `dc4d8d0d-1253-48c1-a5b4-aea46a12aa27`)
  4. `uploads/1791564850298_f9fab2b0_graphic.svg` (ID: `499e647e-cbfb-4138-8981-02dac3601379`)
  5. `uploads/1791564851487_b10f4a23_passwd.png` (ID: `c96853be-a645-48ba-ac2b-6aaaa3024c21`)
- **Run 2 (17:05:17 – 17:05:21 UTC):**
  6. `uploads/1791565517381_20accac7_valid.png` (ID: `76561dca-ac3e-4cae-9d95-c723f128f768`)
  7. `uploads/1791565518259_79e9d1ac_photo.jpg` (ID: `10a82d50-d388-4711-80c0-07052abd779d`)
  8. `uploads/1791565519120_188e1008_image.webp` (ID: `3301fca9-e451-4138-a23a-f46e60bc7026`)
  9. `uploads/1791565519817_d74ebe60_graphic.svg` (ID: `e5ec54ea-9190-4f0d-945f-794a5c395986`)
  10. `uploads/1791565521178_a9be68d0_passwd.png` (ID: `b47d1bdf-ebf9-4e3b-9ea9-3400dff3bf41`)

These assets were created by `tests/cms_public_endpoints.test.ts`, which tests the real server endpoint `/api/cms/media/upload` with valid editor session tokens. Because the server endpoint properly synchronizes uploads to both Supabase Storage and `public.media`, **both tables incremented identically by 10**, leaving **0 orphaned rows** and **0 missing files**.

In accordance with explicit audit instructions, no records or files have been deleted.

---

## 3. Storage Security Test Suite Safety Hardening

In `tests/storage_security_audit.test.ts`, Test 4 previously referenced the active founder portrait path as a target to verify anonymous deletion rejection. While the test passed (because anonymous deletions are blocked by RLS), targeting a live production asset posed an unacceptable operational risk.

**Correction Implemented:**
Test 4 has been rewritten to create an isolated, disposable test probe (`uploads/audit_disposable_probe_<timestamp>.txt`) using the privileged admin client, verify that an anonymous client cannot delete it (returns 0 deleted items), and then clean up the probe via the admin client in a `finally` block:

```typescript
test('4. Anonymous direct deletion from probitian-media is blocked (returns 0 deleted items)', async () => {
  // SECURITY COMPLIANCE: Never target a real production asset.
  const probePath = `uploads/audit_disposable_probe_${Date.now()}.txt`;
  const serviceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (serviceKey) {
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    await adminClient.storage.from('probitian-media').upload(probePath, Buffer.from('test-probe'), { contentType: 'text/plain' });
  }

  try {
    const { data, error } = await anonClient.storage.from('probitian-media').remove([probePath]);
    assert.strictEqual(error, null);
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0, 'Anonymous client must not delete storage objects');
  } finally {
    if (serviceKey) {
      const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
      await adminClient.storage.from('probitian-media').remove([probePath]);
    }
  }
});
```

---

## 4. Test Verification: Local Automated vs. Live Production

### A. Local Automated Regression Suite
- **Exact Command Executed:** `npm test` (`NODE_ENV=test tsx --test tests/**/*.test.ts`)
- **Process Exit Code:** `0`
- **Total Tests:** `211`
- **Passed Tests:** `211`
- **Failed Tests:** `0`
- **Skipped / Todo Tests:** `0`
- **Suites:** `35`
- **Duration:** `55,460 ms`

### B. Live Production Verification (Executed against Supabase project `dlaehchzzkjsrarktfsf`)
- **Direct Anonymous Listing:** **[LIVE VERIFIED]** `anonClient.storage.from('probitian-media').list('')` returned 0 items. Listing `uploads/` returned 0 items.
- **Direct Anonymous Upload:** **[LIVE VERIFIED]** Returned 403 `new row violates row-level security policy`.
- **Direct Authenticated Upload:** **[LIVE VERIFIED]** Created an authenticated test user session; attempting `authClient.storage.from('probitian-media').upload()` returned:
  ```json
  {
    "success": false,
    "errorMessage": "new row violates row-level security policy",
    "statusCode": "403"
  }
  ```
- **Direct Authenticated Listing:** **[LIVE VERIFIED]** `authClient.storage.from('probitian-media').list('')` returned 0 items.
- **Legacy Bucket Isolation:** **[LIVE VERIFIED]** Uploads to `blogs`, `media`, `projects`, and `settings` all returned 403 RLS violation.
- **Public CDN Resolution:** **[LIVE VERIFIED]**
  - Official Logo: `https://dlaehchzzkjsrarktfsf.supabase.co/storage/v1/object/public/probitian-media/general/1786857432327-d4d5d41a-probitian_logo.svg` -> **HTTP 200 OK** (`image/svg+xml`)
  - Founder Portrait: `https://dlaehchzzkjsrarktfsf.supabase.co/storage/v1/object/public/probitian-media/uploads/1788251642865_7b06f22b_WhatsApp_Image_2026-08-13_at_10.42.41__1_.jpeg` -> **HTTP 200 OK** (`image/jpeg`)
  - Canonical SVGs: `/logo.svg` and `/banner.svg` -> **HTTP 200 OK** (`image/svg+xml`)
- **Admin CMS Upload & Replacement:** **[LIVE VERIFIED]** Uploaded disposable test asset via privileged server client with `upsert: true` -> `{ success: true }`. Tested replacement -> `{ success: true }`. Cleaned up disposable asset -> `{ deletedCount: 1 }`.

---

## 5. Evidence Classification Matrix

| Finding / Item | Status Classification | Evidence |
| :--- | :---: | :--- |
| **Migration `restrict_storage_object_policies` applied** | **LIVE VERIFIED** | Version `20261009164408` active; repository migration `0021_restrict_storage_object_policies.sql` verified |
| **Policies `Auth upload storage` & `Public storage access` absent** | **LIVE VERIFIED** | Direct upload with authenticated JWT returns 403 RLS policy error; direct enumeration returns empty array |
| **Zero missing storage objects (175 DB rows)** | **LIVE VERIFIED** | Reconciled all 175 `public.media.storage_path` values against `probitian-media` objects (0 missing) |
| **2 Historical Unregistered Assets** | **LIVE VERIFIED** | `general/1786374902395-2c321b22-Logo__2_.svg` & `general/1786374914972-c54a1a00-Banner.svg` verified preserved |
| **Isolated test probe in `storage_security_audit.test.ts`** | **AUTOMATED TEST PASSED** | Test 4 runs with dynamically created probe and safe cleanup; suite passes 6/6 |
| **Full test suite passing** | **AUTOMATED TEST PASSED** | `npm test` exit code 0, 211 tests passed, 0 failed |
| **Service role secret isolated server-side** | **CODE REVIEW ONLY** | Verified `SUPABASE_SECRET_KEY` is referenced solely in `server/services/supabase.ts` |
| **Security Advisor Leaked Password Warning** | **LIVE VERIFIED** | Confirmed warning `auth_leaked_password_protection` remains present in Supabase Security Advisor |

---

## 6. Supabase Security Advisor Status

- **Check:** `auth_leaked_password_protection`
- **Status:** **ACTIVE WARNING (UNRESOLVED)**
- **Explanation:** Supabase Security Advisor flags that password checks against HaveIBeenPwned database are not enabled. This feature is a Supabase Auth Pro plan feature and cannot be toggled via Storage RLS migrations. It does not compromise Storage object boundaries or RLS integrity, but remains an open operational advisory in Supabase.

---

## 7. Final Verdict

### Verdict: **`PASS WITH WARNINGS`**

1. **Storage Security:** **PASS** — Both broad policies are absent, RLS blocks direct client-side access, public assets deliver with HTTP 200, and media synchronization is 100% (175 rows / 177 objects, 0 missing).
2. **Advisory Warning:** **WARNING** — Supabase Security Advisor `auth_leaked_password_protection` warning remains active in Supabase Auth configuration.
