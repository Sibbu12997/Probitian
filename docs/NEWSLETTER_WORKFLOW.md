# ProBitian — Newsletter Subscription Workflow Documentation

Official Technical Documentation for the Newsletter Subscription & Welcome Email Pipeline in ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  

---

## 📋 Overview

The ProBitian Newsletter Subscription system provides a secure, single-step email subscription pipeline with strict database persistence guarantees and automated welcome email dispatch.

---

## 🏗 Subscription Pipeline & Flow

```
VISITOR (Footer / Modal)
        ↓
Submit Email Address
        ↓
POST /api/newsletter
        ↓
Validate Email Format
        ↓
Query Supabase `newsletter` Table
        ├── New Subscriber → INSERT INTO newsletter (email, status='active')
        ├── Existing Active → Return Success (No Duplicate Record Created)
        └── Previously Unsubscribed → UPDATE newsletter SET status='active', unsubscribed_at=NULL
        ↓
Confirm Database Persistence (Supabase PostgreSQL Write Check)
        ├── If DB Write Fails → Return HTTP 503 (No Welcome Email Sent)
        └── If DB Write Succeeds → Proceed to Welcome Email Dispatch
        ↓
Express Server → Gmail SMTP (probitianofficial@gmail.com)
        ↓
Dispatch Welcome Email to Subscriber
        ↓
Return HTTP 200 JSON Success Response to Client
```

---

## 🔒 Critical Persistence Gate

To maintain absolute data integrity:
- **Welcome emails are strictly gated on successful database persistence.**
- The server writes to Supabase PostgreSQL **FIRST**. Only if the insert or reactivation query succeeds will the server attempt to dispatch the welcome email.
- If Supabase PostgreSQL is unreachable or returns a write error:
  - The API immediately aborts and returns `HTTP 503 Service Unavailable`.
  - **No welcome email is sent.**
  - **No fallback to local JSON or mock data is attempted.**

---

## 🔄 Subscriber State Handling

1. **New Subscriber**:
   - Record created in Supabase `newsletter` with `status = 'active'` and timestamp `created_at`.
   - Welcome email dispatched.
2. **Already Active Subscriber**:
   - Recognized as already subscribed.
   - On-screen confirmation shown without duplicate database rows or duplicate welcome emails.
3. **Reactivating Subscriber**:
   - Previously unsubscribed user re-subscribes.
   - Supabase updated: `status = 'active'`, `unsubscribed_at = NULL`.
   - Welcome email dispatched.

---

## 📬 Unsubscribe Flow

1. Subscriber clicks the **Unsubscribe** link in any email footer or navigates to `#/unsubscribe`.
2. Request sent to `POST /api/newsletter/unsubscribe`.
3. Server updates Supabase PostgreSQL: `UPDATE newsletter SET status = 'unsubscribed', unsubscribed_at = NOW() WHERE email = $1`.
4. Subscriber receives confirmation that they have been unsubscribed.
5. Unsubscribed emails are excluded from future email campaign dispatches.

---

## ⚙️ Server Configuration

- **API Route**: `POST /api/newsletter`
- **Email Delivery Provider**: Gmail SMTP via Nodemailer
- **Sender Address**: `probitianofficial@gmail.com`
- **Environment Variables**: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SUPABASE_SECRET_KEY`

---

*Documentation maintained by Shivam Singh — ProBitian.*
