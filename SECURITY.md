# ProBitian Security Policy

The ProBitian team and maintainer **Shivam Singh** take the security and integrity of the ProBitian platform, its users, and community data very seriously. We appreciate responsible disclosure of security vulnerabilities by security researchers, developers, and community members.

---

## 1. Supported Versions

Security patches and updates are actively applied to the main production branch of the repository:

| Branch / Release | Supported          |
| ---------------- | ------------------ |
| `main`           | :white_check_mark: |
| Latest Release   | :white_check_mark: |
| Historical / Dev | :x:                |

---

## 2. Reporting a Vulnerability

**Please DO NOT open a public GitHub issue or discuss potential vulnerabilities in public forums.**

If you discover a security vulnerability, unintended data exposure, or architectural weakness in ProBitian, please report it privately via email:

- **Official Security Contact**: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)
- **Subject Line**: `[SECURITY VULNERABILITY] <Brief Description of Issue>`

### What to Include in Your Report

To help us investigate and triage the issue quickly, please include:
1. **Description**: Clear description of the vulnerability and its potential impact.
2. **Component / Area**: Which component is affected (e.g., Express server, Supabase RLS, Passkey Authentication, Media Upload, Contact/Newsletter endpoints, CSRF/CORS, etc.).
3. **Steps to Reproduce**: Detailed reproduction steps, Proof of Concept (PoC) scripts, or HTTP request payloads.
4. **Environment**: Details on the environment, browser, or tool used to reproduce the issue.
5. **Mitigation Suggestion**: Any recommended fixes or remediation steps (if known).

---

## 3. Vulnerability Scope

We encourage private reports regarding vulnerabilities in the following areas:

- **Authentication & Authorization**: Admin passkey verification bypasses, session cookie forgery, improper privilege escalation, or unauthorized access to `/api/admin/*`.
- **Database & Row Level Security (RLS)**: Direct Supabase postgREST bypasses, unauthorized data modification or exfiltration, or improper table grants.
- **Secrets & Credentials Exposure**: Accidental exposure of API keys, `SUPABASE_SECRET_KEY`, `GMAIL_APP_PASSWORD`, or other server-only environment variables.
- **Cross-Site Scripting (XSS) & Content Injection**: Stored or reflected XSS in rich text preview, markdown renderers, or SVG uploads in the Media Library.
- **File Upload Vulnerabilities**: Malicious file upload handling, path traversal in Supabase Storage (`probitian-media` bucket), or bypass of SVG DOMPurify sanitization.
- **CORS & CSRF Vulnerabilities**: Insecure cross-origin request handling or state-changing request vulnerabilities on administrative APIs.
- **Denial of Service & Abuse**: Unthrottled volumetric endpoints or bypasses of rate limiters on email dispatch or contact form endpoints.

### Out of Scope

The following issues are generally considered out of scope unless they present a direct security risk:
- Reports from automated vulnerability scanners without verified exploitability.
- Missing HTTP security headers in development-only environments.
- Self-XSS (e.g., pasting code into your own browser DevTools console).
- Attacks requiring physical access to a user's unlocked device.
- Social engineering or phishing targeting ProBitian maintainers or users.

---

## 4. Response & Remediation Process

1. **Acknowledgment**: We aim to acknowledge receipt of security reports within **48 hours**.
2. **Assessment & Validation**: The maintainer will investigate and validate the reported issue, determining its severity and scope.
3. **Remediation**: A fix will be developed, tested, and validated across local and staging environments.
4. **Deployment**: The security patch will be deployed to the production environment, including any necessary database migrations or configuration updates.
5. **Public Disclosure / Credit**: Once the vulnerability has been resolved and verified, a public advisory or acknowledgment will be released with appropriate credit to the reporter (if desired).

---

## 5. Security Best Practices for Contributors

Contributors are required to adhere strictly to ProBitian's security principles:
- **Never commit `.env` files** or real credentials (`SUPABASE_SECRET_KEY`, `ADMIN_PASSKEY`, `GMAIL_APP_PASSWORD`, `GEMINI_API_KEY`).
- **Never weaken Row Level Security (RLS)** or grant unrestricted public permissions on Supabase tables.
- **Never store administrative session state in localStorage** — admin sessions must always use server-verified HttpOnly cookies or server-authenticated tokens.
- **Always keep Supabase PostgreSQL as the authoritative source of truth** in production.

For more technical details on ProBitian's internal security architecture, see [docs/SECURITY.md](docs/SECURITY.md).

---

*Maintained by Shivam Singh — ProBitian.*
