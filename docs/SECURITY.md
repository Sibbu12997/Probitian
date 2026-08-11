# ProBitian — Security & Isolation Specification

Official Security Architecture & Data Protection Specification for ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  

---

## 1. Core Security Principles

ProBitian adheres to enterprise security standards to protect administrative controls, user data, media assets, and backend operations:

1. **Strict Secret Isolation**: All privileged keys (`SUPABASE_SECRET_KEY`, `GMAIL_APP_PASSWORD`, `ADMIN_PASSKEY`, `GEMINI_API_KEY`) reside exclusively in the server environment and are never bundled into client JS code.
2. **Server-Mediated Database Access**: Client-side direct postgREST access is restricted via Row Level Security (RLS). All CMS mutations pass through Express backend handlers.
3. **No Production Fallback Risk**: Production queries communicate directly with Supabase PostgreSQL. There are no silent fallbacks to local JSON or mock data that could expose stale or unauthenticated records.
4. **No Destructive Startup Operations**: Server startup scripts (`server.ts`) never execute `TRUNCATE`, `DROP TABLE`, or automated database resets.

---

## 2. Authentication & Passkey Security

- **Admin Control Center Access**: Protected at `POST /api/admin/verify-passkey`.
- **Passkey Check**: Server compares submitted passkey against `process.env.ADMIN_PASSKEY`.
- **Token Authorization**: Successful verification issues a time-bound session token (`x-admin-token`), which must accompany subsequent administrative API requests in HTTP headers.
- **Failed Attempts**: Failed passkey checks return `HTTP 401 Unauthorized` without revealing internal system paths.

---

## 3. Database Security & Row Level Security (RLS)

- **RLS Enforcement**: Row Level Security is enabled on all 12 Supabase PostgreSQL tables.
- **Anon Key Blocking**: Direct client queries using `VITE_SUPABASE_ANON_KEY` return `HTTP 403 Permission Denied` for direct table writes, preventing unauthorized client tampering.
- **Service Role Access**: Server endpoints execute queries using `SUPABASE_SECRET_KEY` (service role), bypassing RLS securely on the backend.
- **Explicit Grants**: Schema permissions are explicitly granted (`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`).

---

## 4. Input Validation & Error Handling

- **UUID Validation**: API parameters expecting database identifiers validate UUID syntax (`v4`) to prevent SQL injection or path traversal.
- **JSON Error Responses**: All Express API endpoints return consistent JSON error objects (`{ success: false, message: "..." }`) and safe HTTP status codes (`400`, `401`, `403`, `404`, `500`, `503`). Catch-all handlers intercept unexpected errors before SPA static fallback.

---

## 5. Media Upload & SVG Sanitization

- **File Validation**: File size capped at 10MB per upload. Mime types validated against allowed lists (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, `application/pdf`).
- **SVG DOMPurify Sanitization**: All uploaded SVG graphics pass through server-side DOMPurify sanitization to strip malicious script tags, event handlers (`onload`, `onerror`), and XML entity injection vulnerabilities.

---

## 6. Email Infrastructure & Unsubscribe Handling

- **Gmail SMTP Credentials**: `GMAIL_APP_PASSWORD` remains server-side.
- **Compliant Unsubscribe**: All outgoing newsletter dispatches contain one-click unsubscribe URLs. Unsubscribed emails are recorded immediately in Supabase PostgreSQL (`unsubscribed_at = NOW()`) and automatically omitted from future email dispatches.

---

*Documentation maintained by Shivam Singh — ProBitian.*
