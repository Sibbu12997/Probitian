# ProBitian — Email Configuration & Security Documentation

Official Specification for Email Infrastructure in ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official X: [https://x.com/Probitian](https://x.com/Probitian) (@Probitian)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 1. Primary Email Infrastructure Overview

All outgoing emails—including contact enquiry alerts, visitor response confirmations, admin inbox replies, newsletter welcome messages, and subscriber campaign broadcasts—are delivered via server-side **Nodemailer** using **Gmail SMTP**.

- **Active Provider**: **Gmail SMTP**
- **Official Sender Address**: `probitianofficial@gmail.com`
- **Inactive / Historical Providers**: Resend API is not the active delivery engine.

---

## 2. Server Environment Configuration

Email credentials reside strictly in the server environment (`.env`):

```env
# GMAIL SMTP CONFIGURATION (Server-Side Only)
GMAIL_USER="probitianofficial@gmail.com"
GMAIL_APP_PASSWORD="<configured in server environment>"
```

---

## 2.1 Unsubscribe Token Signing Secret

Unsubscribe tokens are signed with a dedicated server-side `UNSUBSCRIBE_SECRET`. In production, the server validates this setting before opening its HTTP listener. The value must contain at least 32 bytes of secret material and must remain stable across restarts.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Store the generated value in the hosting provider's server-side secret manager under `UNSUBSCRIBE_SECRET`. Never use a `VITE_` prefix, commit the real value, or fall back to `SESSION_SECRET`. If the secret is absent or invalid, production startup must fail.

Rotating the secret invalidates unsubscribe tokens signed with the previous value. Plan rotation accordingly and provide users a working way to request a fresh unsubscribe link.

---

## 3. Strict Security & Credential Isolation Guidelines

> 🚨 **CRITICAL SECURITY REQUIREMENT**:
> The `GMAIL_APP_PASSWORD` is a privileged authentication credential. It must **NEVER** be exposed or included in:
> - Frontend TypeScript code (`src/`)
> - Client Vite bundles or static JS artifacts
> - Browser `localStorage` or session storage
> - Public or client API JSON responses
> - Markdown documentation, README files, or commit logs
> - Public version control repositories

All email dispatch operations occur exclusively on the Express backend server (`server.ts`, `src/services/emailService.ts`). The client application triggers endpoints (e.g., `POST /api/contact`, `POST /api/newsletter`, `POST /api/admin/reply-email`), and the server executes SMTP transport securely.

---

## 4. Operational Email Use Cases

| Email Type | Trigger Event | Recipient | Sender |
| :--- | :--- | :--- | :--- |
| **Contact Form Alert** | Visitor submits enquiry | Admin (`probitianofficial@gmail.com`) | `probitianofficial@gmail.com` |
| **Inquiry Confirmation**| Visitor submits enquiry | Visitor | `probitianofficial@gmail.com` |
| **Admin Inbox Reply** | Admin clicks "Reply via Email" | Visitor | `probitianofficial@gmail.com` |
| **Newsletter Welcome** | Visitor subscribes to newsletter | Subscriber | `probitianofficial@gmail.com` |
| **Campaign Broadcast** | Admin broadcasts email campaign | Active Subscribers | `probitianofficial@gmail.com` |

---

*Documentation maintained by Shivam Singh — ProBitian.*
