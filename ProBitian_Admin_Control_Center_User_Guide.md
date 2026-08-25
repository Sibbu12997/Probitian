# ProBitian Admin Control Center — Comprehensive User & Operations Guide

Official Administrative Management and Operations Manual for Authorized ProBitian Portal Administrators.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Contact Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 1. Introduction & Security Guidance

The **ProBitian Admin Control Center** (`#/admin`) is the central management portal for authorized administrators to manage site content, analyze GA4 performance, handle contact inquiries, maintain newsletter subscribers, broadcast marketing campaigns, manage digital assets, maintain the **B2B Lead CRM**, orchestrate **Automated Multi-Step Email Sequences**, and launch **Lead Outreach Campaigns**.

### Critical Security Instructions
- **Never Share Credentials**: Protect the Admin Passkey and administrative access tokens.
- **Server-Side Secret Isolation**: Secret environment variables (`ADMIN_PASSKEY`, `SUPABASE_SECRET_KEY`, `GMAIL_APP_PASSWORD`, `GEMINI_API_KEY`) remain strictly server-side and are never exposed to client browsers.
- **Service Role Isolation**: Supabase database tables are protected by Row Level Security (RLS). Server-side Express API routes execute operations securely via backend tokens.

---

## 2. Production Architecture Overview

ProBitian operates on a streamlined, cloud-persisted architecture:
- **Primary Database**: **Supabase PostgreSQL** is the **SINGLE AUTHORITATIVE SOURCE OF TRUTH**.
- **Data Persistence Guarantee**: All CRM leads, campaigns, sequence enrollments, courses, blog articles, and inquiries are persisted in Supabase PostgreSQL. Refreshing the browser, clearing local cache, or logging out does not delete or alter production data.
- **Media Storage**: Supabase Storage (`probitian-media` bucket) stores portfolio visuals, logos, blog covers, video thumbnails, and PDF documentation.
- **Email Transmission**: Express server engine via **Gmail SMTP** (`probitianofficial@gmail.com`).
- **Web Analytics**: Real-time Google Analytics 4 (GA4) measurement.

---

## 3. Admin Authentication & Navigation

### Accessing the Portal
1. Navigate to `#/admin` (e.g., `https://probitian.ai.studio/#/admin`).
2. Enter the authorized **Admin Passkey**.
3. Click **Unlock Admin Portal**.
4. The server validates credentials via `POST /api/admin/verify-passkey` and issues an authenticated session token.

### Portal Navigation Hierarchy
The Admin Control Center sidebar organizes tools into 6 logical functional groups:

1. **Overview & Analytics**:
   - `Dashboard Overview`
   - `GA4 Traffic Analytics`
2. **Content Management System (CMS)**:
   - `Home Page Content`
   - `Projects & Case Studies`
   - `Technical Blog & Articles`
   - `Courses & Curriculum`
   - `YouTube Video Tutorials`
   - `Media Library & Assets`
3. **Inquiries & Newsletter**:
   - `Contact Enquiries Inbox`
   - `Newsletter Subscribers`
   - `Newsletter Campaigns`
4. **Lead Outreach & CRM**:
   - `B2B Leads CRM`
   - `Email Sequences`
   - `Lead Outreach Campaigns`
5. **Branding & Layout**:
   - `Website Branding`
   - `Social Media Links`
   - `Navigation Menu`
   - `SEO & Meta Tags`
6. **System & Security**:
   - `Global Settings`
   - `Terms & Privacy Policies`
   - `Backup & Restore`

---

## 4. B2B Lead CRM (`Lead Outreach & CRM` -> `B2B Leads CRM`)

The **B2B Leads CRM** module empowers administrators to manage enterprise sales prospects, Power BI consulting inquiries, and corporate training opportunities.

### 4.1 Lead Data Fields

| Field Name | Type | Description | Sample Value |
| :--- | :--- | :--- | :--- |
| **Company Name** | Text (Required) | Legal or trade name of the business | `Acme Retail Solutions` |
| **Contact Person** | Text | Primary contact or decision maker | `Sarah Jenkins` |
| **Email** | Text (Required) | Business email address (Unique identifier) | `sarah.j@acmeretail.com` |
| **Phone** | Text | Direct phone or mobile number | `+1 (312) 555-0199` |
| **Industry** | Text | Business vertical / sector | `Supply Chain & Logistics` |
| **Location** | Text | City, state, or regional location | `Chicago, IL` |
| **LinkedIn** | Text | Contact or company LinkedIn profile URL | `https://linkedin.com/in/sarahjenkins` |
| **Power BI Use Case** | Text | Specific BI requirement, pain point, or goal | `Executive Sales Margin & Inventory Dashboard` |
| **Lead Priority** | Dropdown | Operational urgency (`High`, `Medium`, `Low`) | `High` |
| **Status** | Dropdown | Sales & outreach lifecycle state | `Not Contacted` |
| **Follow-up Date** | Date Picker | Scheduled next contact date | `2026-09-15` |
| **Internal Notes** | Textarea | Memos, conversation history, meeting logs | `Requested demo of supply chain DAX models` |

### 4.2 Supported Lead Statuses & Purpose

| Status | Category | Purpose & Behavior |
| :--- | :--- | :--- |
| **`Not Contacted`** | Inbound / Initial | Prospect has been added or imported but not yet reached out to. |
| **`Contacted`** | In Progress | Initial outreach email or sequence step has been sent. |
| **`Opened`** | Engaged | Prospect has opened an outreach email. |
| **`Replied`** | **Terminal (Stop)** | Prospect replied to outreach. **Automatically terminates any active automated sequences.** |
| **`Interested`** | **Terminal (Stop)** | Prospect expressed interest in consulting or training. **Automatically halts automated sequences.** |
| **`Demo Requested`** | **Terminal (Stop)** | Prospect requested a live walkthrough or meeting. **Automatically halts automated sequences.** |
| **`Proposal Sent`** | Active Deal | Formal statement of work or proposal delivered. |
| **`Converted`** | **Terminal (Won)** | Closed client. **Automatically terminates automated sequences.** |
| **`Not Interested`** | **Terminal (Stop)** | Prospect declined. **Automatically terminates automated sequences.** |
| **`Bounced`** | **Terminal (Error)** | Undeliverable email address. **Excluded from all campaigns and sequences.** |
| **`Do Not Contact`** | **Terminal (Opt-Out)**| Unsubscribed or requested no contact. **Strictly blocked across the entire system.** |

---

## 5. CSV Lead Import User Guide

Administrators can upload bulk lead lists using the built-in CSV import wizard.

### Step-by-Step Import Process:
1. Open **B2B Leads CRM** (`#/admin -> Lead Outreach & CRM -> B2B Leads CRM`).
2. Click **Import CSV** in the top action bar.
3. Choose or drag-and-drop your `.csv` file.
4. Select **Duplicate Resolution Mode**:
   - **Skip Existing Leads**: Leaves existing leads unchanged and imports only new emails.
   - **Update Existing Leads**: Matches existing records by email and overwrites fields with CSV data.
5. Review the **Validation Summary** (Valid Rows vs. Invalid Rows).
6. Click **Confirm & Import Leads**.
7. The server validates each row and performs atomic upserts to Supabase PostgreSQL.
8. The CRM table refreshes automatically with the newly imported records.

### Supported Column Aliases
The parser recognizes variations in CSV header names:
- `company_name`, `company`, `account`, `organization`, `business`
- `contact_person`, `contact_name`, `contact`, `person`, `name`, `full_name`
- `email`, `email_address`, `work_email`, `mail`
- `phone`, `phone_number`, `telephone`, `mobile`
- `industry`, `vertical`, `sector`
- `location`, `city`, `state`, `country`, `address`
- `linkedin`, `linkedin_url`, `profile_url`
- `powerbi_use_case`, `use_case`, `bi_needs`, `project_needs`
- `lead_priority`, `priority`
- `status`, `lead_status`
- `follow_up_date`, `followup_date`, `next_followup`
- `notes`, `internal_notes`, `comments`

---

## 6. Lead Outreach Campaigns (`Lead Outreach & CRM` -> `Lead Outreach Campaigns`)

One-time outreach broadcasts allow sending targeted emails to filtered segments of CRM prospects.

### Key Capabilities:
- **Campaign Configuration**: Set Campaign Name, Subject Line, Preheader Text, and HTML Body.
- **Recipient Filtering**: Select leads by Status or Priority, or launch directly with leads pre-selected from the CRM.
- **Recipient Safety Controls**: Automatically excludes `Do Not Contact`, `Bounced`, or invalid email leads.
- **Test Email Verification**: Dispatch a live test message to an authorized admin address before sending to prospects.
- **Detailed Delivery History**: Tracks individual dispatch outcomes (`sent`, `failed`, `opened`, `replied`) in `public.campaign_leads`.

---

## 7. Automated Email Sequences (`Lead Outreach & CRM` -> `Email Sequences`)

Automated Email Sequences automate multi-step drip journeys over configurable day/hour intervals.

### 7.1 Multi-Step Sequence Flow Example:
- **Step 1 (Delay: 0 Days / Immediate)**: Initial introduction to ProBitian Power BI consulting tailored to `{{powerbi_use_case}}`.
- **Step 2 (Delay: 3 Days)**: Case study demonstrating quantifiable business impact and DAX optimization in the `{{industry}}` vertical.
- **Step 3 (Delay: 4 Days)**: Follow-up invite for a 20-minute executive dashboard demo.

### 7.2 Dynamic Personalization Tags
Use dynamic curly-brace variables inside subjects and email content:

| Dynamic Tag | Alternate Tag | Output Example | Fallback Value |
| :--- | :--- | :--- | :--- |
| `{{company_name}}` | `{{Company Name}}` | `Acme Retail Solutions` | `your company` |
| `{{contact_person}}` | `{{Contact Person}}` | `Sarah Jenkins` | `Valued Partner` |
| `{{first_name}}` | `{{First Name}}` | `Sarah` | `there` |
| `{{industry}}` | `{{Industry}}` | `Supply Chain & Logistics` | `your industry` |
| `{{location}}` | `{{Location}}` | `Chicago, IL` | `your region` |
| `{{powerbi_use_case}}`| `{{Power BI Use Case}}`| `Executive Sales Margin Dashboard`| `reporting and analytics`|
| `{{phone}}` | `{{Phone}}` | `+1 (312) 555-0199` | `(blank)` |
| `{{linkedin}}` | `{{LinkedIn}}` | `https://linkedin.com/in/...` | `(blank)` |
| `{{lead_priority}}` | `{{Lead Priority}}` | `High` | `Standard` |

---

## 8. Selective Lead Enrollment Workflow

Administrators control exactly which prospects enter automated sequences using manual multi-select checkboxes in the CRM:

```
1. Open B2B Leads CRM.
2. Select checkboxes next to specific targeted leads (e.g., Company A, C, F).
3. The selection toolbar shows "[3] selected".
4. Click [ Start Email Sequence ].
5. Choose target sequence in the modal and review selected lead list.
6. Click [ Enroll 3 Leads ].
7. Sequence enrollments are persisted in Supabase with Step 1 scheduled for delivery.
8. Background worker checks and dispatches Step 1 within 60 seconds.
```

---

## 9. Background Sequence Worker & Safety Controls

### 9.1 Background Execution
- An internal background worker runs every **60 seconds** on the server.
- Evaluates active sequence enrollments where `next_send_at <= now()`.
- Verifies lead status is not in a terminal state.
- Dispatches due emails via Gmail SMTP, logs delivery, and schedules the subsequent step (`now + delay_days`).
- Marks sequence as `Completed` once all steps are sent.

### 9.2 Manual "Process Due Steps Now"
Administrators can click **Process Due Steps Now** inside the *Email Sequences* module to immediately trigger processing without waiting for the 60-second timer.

### 9.3 Automatic Sequence Termination Rules
A sequence is **automatically stopped** for any individual lead if their status transitions to:
- `Replied`
- `Interested`
- `Demo Requested`
- `Converted`
- `Do Not Contact`
- `Bounced`
- `Not Interested`

### 9.4 Lead Drawer Inspection & Manual Stop
Clicking any lead in the CRM opens the **Lead Details Drawer**:
- Displays all currently enrolled sequences and current step number.
- Shows next scheduled send timestamp.
- Allows administrators to click **Stop** on any active sequence immediately.

---

## 10. Step-by-Step Admin Recipes (Quick Reference)

### Recipe 1: Add a Single Lead
1. Open **B2B Leads CRM**.
2. Click **Add Lead**.
3. Enter Company Name, Email, Contact Person, Industry, and Power BI Use Case.
4. Set Priority (`High`, `Medium`, `Low`) and Status (`Not Contacted`).
5. Click **Save Lead**.

### Recipe 2: Import Leads via CSV
1. Prepare a `.csv` file with headers `company_name`, `contact_person`, `email`, `industry`, `location`, `powerbi_use_case`.
2. Open **B2B Leads CRM** -> Click **Import CSV**.
3. Upload file, choose Duplicate Mode (**Skip** or **Update**), and click **Confirm & Import**.

### Recipe 3: Launch a One-Time Campaign
1. Open **Lead Outreach Campaigns** -> Click **New Campaign**.
2. Fill in Name, Subject, Preheader, and HTML Message.
3. Filter or select recipients.
4. Click **Send Test Email** to verify formatting in your inbox.
5. Click **Send Campaign Now**.

### Recipe 4: Enroll Specific Leads in an Automated Sequence
1. Open **B2B Leads CRM**.
2. Check the checkboxes for target leads.
3. Click **Start Email Sequence** in the action bar.
4. Select the target sequence (e.g. *Enterprise Power BI Outbound*).
5. Click **Enroll Leads**.

### Recipe 5: Stop an Active Sequence for a Lead
1. Open **B2B Leads CRM** and click on the lead's row.
2. In the **Lead Details Drawer**, find the active sequence under *Automated Email Sequences*.
3. Click the **Stop** button.

---

## 11. Troubleshooting & FAQ

- **Issue: CSV imported successfully, but leads are not visible.**
  - **Solution**: Refresh the browser page. Verify your status/priority filters are set to "All".
- **Issue: Sequence email did not send.**
  - **Solution**: Check that the sequence status is `Active`, the lead is not in a terminal stop status (`Replied`, `Converted`, etc.), and `next_send_at` time has passed. Click **Process Due Steps Now** to trigger immediate evaluation.
- **Issue: Lead received duplicate emails.**
  - **Solution**: The system enforces unique step delivery records in `deliveries` and `campaign_leads`. Verify the lead was not enrolled in two separate sequences simultaneously.
- **Issue: Sequence continues sending after a prospect replied.**
  - **Solution**: Update the lead's status in the CRM to `Replied` or `Interested`. The worker will automatically mark the sequence as `Stopped`.
- **Issue: Personalization tags appear raw in emails.**
  - **Solution**: Ensure tags match supported formats (e.g., `{{company_name}}` or `{{contact_person}}`). Check that the lead record has values for the specified fields.

---

*Documentation maintained by Shivam Singh — ProBitian.*
