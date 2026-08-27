# ProBitian — B2B Lead CRM, Outreach Campaigns & Automated Email Sequences Workflow

Official Technical & Operational Workflow Documentation for ProBitian's B2B Lead CRM, Outreach Campaign Broadcast Engine, and Automated Multi-Step Email Sequence System.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official X: [https://x.com/Probitian](https://x.com/Probitian) (@Probitian)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 1. System Overview & Architecture

ProBitian's B2B Lead Outreach & CRM engine is an enterprise-grade, server-side verified lead management, outreach broadcast, and automated sequence orchestration suite.

```
+-----------------------------------------------------------------------------------+
|                           ADMIN CONTROL CENTER (/admin)                           |
|                                                                                   |
|  [ B2B Leads CRM ]   ──▶   [ Email Sequences ]   ──▶   [ Lead Outreach Campaigns ]|
+-----------------------------------------------------------------------------------+
                                         │
                          Express REST API Server Routes
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              ▼                                                     ▼
+───────────────────────────+                         +───────────────────────────+
|   Supabase PostgreSQL     |                         |     Gmail SMTP Engine     |
| (Authoritative Production)|                         | (probitianofficial@gmail) |
|                           |                         |                           |
| - public.leads            |                         | - Outreach Broadcasts     |
| - public.lead_campaigns   |                         | - Automated Sequence Step |
| - public.campaign_leads   |                         | - Dynamic Personalization |
| - public.settings (Seqs)  |                         | - Unsubscribe & Brand FTC |
+───────────────────────────+                         +───────────────────────────+
```

---

## 2. B2B Leads CRM (`/admin` -> Lead Outreach & CRM -> B2B Leads CRM)

The Lead CRM provides a single, centralized database for prospective enterprise clients, Power BI consulting leads, and corporate training opportunities.

### 2.1 Lead Fields Specification

| Field | Type | Description | Required | Example |
| :--- | :--- | :--- | :--- | :--- |
| **`company_name`** | TEXT | Business or organization name | Yes | `Acme Retail Solutions` |
| **`contact_person`** | TEXT | Primary contact or decision maker | No | `Sarah Jenkins` |
| **`email`** | TEXT | Work email address (Unique identifier) | Yes | `sarah.j@acmeretail.com` |
| **`phone`** | TEXT | Phone or direct line | No | `+1 (555) 234-5678` |
| **`industry`** | TEXT | Industry vertical | No | `E-Commerce & Retail` |
| **`location`** | TEXT | City, state, or country | No | `Chicago, IL, USA` |
| **`linkedin`** | TEXT | LinkedIn profile or company page | No | `https://linkedin.com/in/sarahjenkins` |
| **`powerbi_use_case`** | TEXT | Specific BI scenario, pain point, or goal | No | `Executive Inventory & Sales Margin Dashboard` |
| **`lead_priority`** | ENUM | Priority tier (`High`, `Medium`, `Low`) | No | `High` |
| **`status`** | ENUM | Sales & outreach lifecycle state | No | `Not Contacted` |
| **`follow_up_date`** | DATE | Scheduled date for next action | No | `2026-09-15` |
| **`notes`** | TEXT | Internal notes, meeting memos, history | No | `Discussed Q4 budget, requested demo deck` |

### 2.2 Supported Lead Statuses & Purpose

| Status | Stage Category | Purpose & Behavior |
| :--- | :--- | :--- |
| **`Not Contacted`** | Inbound / Unreached | Fresh lead. Automatically transitions to `Contacted` upon first email broadcast or sequence step delivery. |
| **`Contacted`** | In Progress | Initial outreach email or sequence step has been delivered. |
| **`Opened`** | Engaged | Recipient viewed the outreach email. |
| **`Replied`** | **Terminal (Stop)** | Prospect responded to outreach. **Automatically terminates any active automated sequences.** |
| **`Interested`** | **Terminal (Stop)** | Prospect indicated interest in Power BI services. **Automatically terminates automated sequences.** |
| **`Demo Requested`** | **Terminal (Stop)** | Prospect booked or requested a live dashboard demo. **Automatically terminates automated sequences.** |
| **`Proposal Sent`** | Active Deal | Formal proposal or statement of work dispatched. |
| **`Converted`** | **Terminal (Won)** | Closed deal or active client. **Automatically terminates automated sequences.** |
| **`Not Interested`** | **Terminal (Stop)** | Prospect politely declined. **Automatically terminates automated sequences.** |
| **`Bounced`** | **Terminal (Error)** | Email address invalid or rejected by mailserver. **Excluded from all campaigns and sequences.** |
| **`Do Not Contact`** | **Terminal (Opt-Out)** | Compliance suppression / unsubscribed. **Strictly blocked from all outreach.** |

---

## 3. CSV Lead Import Pipeline

Administrators can import hundreds of leads in seconds with automatic duplicate detection and data normalization.

```
CSV File on Disk
       │
       ▼
[ Choose File & Upload ] (Drag & Drop or Manual Selection)
       │
       ▼
Client-Side RFC-4180 Parser (Handles quotes, commas, escapes, multi-line values)
       │
       ▼
Column Alias Resolution & Normalization
       │
       ▼
Validation & Email Formatting Check
       │
       ▼
Server-Side Duplicate Detection (Against `public.leads` in Supabase)
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
[ Mode: Skip Duplicates ]   [ Mode: Update Duplicates ]   [ Invalid Records ]
Preserves existing lead     Updates existing fields       Filtered & reported
       │                         │                         │
       └─────────────────────────┼─────────────────────────┘
                                 │
                                 ▼
               Atomic Batch Upsert to Supabase PostgreSQL
                                 │
                                 ▼
                     Import Summary Modal Report
          (Total Processed, Inserted, Updated, Skipped, Invalid)
                                 │
                                 ▼
                 Live CRM Table Instant Refresh
```

### 3.1 Supported Column Aliases

The CSV parser automatically recognizes standard CSV headers and variations:

- **Company**: `company_name`, `company`, `account`, `organization`, `business`
- **Contact Name**: `contact_person`, `contact_name`, `contact`, `person`, `name`, `full_name`
- **Email**: `email`, `email_address`, `work_email`, `mail`
- **Phone**: `phone`, `phone_number`, `telephone`, `mobile`, `tel`
- **Industry**: `industry`, `vertical`, `sector`, `category`
- **Location**: `location`, `city`, `state`, `country`, `address`
- **LinkedIn**: `linkedin`, `linkedin_url`, `profile_url`, `linkedin_profile`
- **Power BI Use Case**: `powerbi_use_case`, `use_case`, `bi_needs`, `powerbi_needs`, `project_needs`
- **Priority**: `lead_priority`, `priority` (`High`, `Medium`, `Low`)
- **Status**: `status`, `lead_status` (`Not Contacted`, etc.)
- **Follow-up Date**: `follow_up_date`, `followup_date`, `next_followup` (`YYYY-MM-DD`)
- **Notes**: `notes`, `internal_notes`, `comments`, `description`

### 3.2 Sample CSV Format

```csv
company_name,contact_person,email,phone,industry,location,linkedin,powerbi_use_case,lead_priority,status,follow_up_date,notes
"Apex Logistics Ltd","Marcus Vance","m.vance@apexlogistics.io","+1 (312) 555-0199","Supply Chain & Logistics","Chicago, IL","https://linkedin.com/in/marcusvance","Fleet Telematics & Warehouse KPI Dashboard","High","Not Contacted","2026-09-01","Met at Midwest Supply Chain Summit"
"Beacon Financial Group","Elena Rostova","elena@beaconfg.com","+1 (212) 555-0144","Financial Services","New York, NY","https://linkedin.com/in/elenarostova","Executive Cash Flow & P&L Variance Visualizer","High","Not Contacted","2026-09-05","Needs automated DAX financial modeling"
"Starlight Healthcare","David Chen","dchen@starlighthealth.org","+1 (415) 555-0188","Healthcare & Hospitals","San Francisco, CA","https://linkedin.com/in/davidchen","Patient Flow & Hospital Resource Utilization","Medium","Not Contacted","2026-09-10","Requires HIPAA-compliant data pipeline"
```

---

## 4. Lead Outreach Campaigns (`/admin` -> Lead Outreach & CRM -> Lead Outreach Campaigns)

One-time broadcast campaigns allow administrators to target custom segments of CRM leads with announcements, case studies, or service offers.

### 4.1 Campaign Workflow

1. **Create Campaign**: Define Campaign Name, Email Subject, Preheader Preview Text, and HTML content.
2. **Recipient Selection**: Filter leads by Status (e.g. `Not Contacted`, `Contacted`) or Priority (`High`, `Medium`, `Low`), or select specific leads directly from the CRM.
3. **Safety Verification**: System automatically excludes `Do Not Contact`, `Bounced`, or invalid email leads.
4. **Pre-flight Test Email**: Dispatch a live test message to an authorized admin address to inspect visual styling and personalization before broadcasting.
5. **Dispatch Broadcast**: Server asynchronously iterates through eligible recipients, replaces personalized tags, transmits via Gmail SMTP, and logs delivery timestamps in `public.campaign_leads`.

---

## 5. Automated Multi-Step Email Sequences (`/admin` -> Lead Outreach & CRM -> Email Sequences)

Automated Email Sequences provide hands-free, multi-touch drip outreach campaigns over configurable day/hour intervals.

### 5.1 Campaign vs. Sequence Comparison

| Attribute | One-Time Outreach Campaign | Automated Email Sequence |
| :--- | :--- | :--- |
| **Touchpoints** | Single blast (1 email) | Multi-step journey (e.g., Step 1 -> Step 2 -> Step 3) |
| **Timing** | Immediate or single scheduled time | Relative intervals (e.g., Send Step 1 now, Step 2 after 3 days, Step 3 after 4 days) |
| **Enrollment** | Bulk audience filter | **Selective lead enrollment** via checkboxes in Lead CRM |
| **Execution** | Immediate server dispatch loop | Continuous background worker (every 60s) checking `next_send_at` |
| **Stop Conditions** | N/A (single send) | **Automatic stop** on Reply, Interest, Demo, Conversion, Bounce, or Opt-out |

### 5.2 Sequence Multi-Step Structure Example

- **Step 1 (Immediate / Delay 0 Days)**:
  - *Subject*: `Modernizing {{company_name}}'s reporting with Power BI`
  - *Content*: Introduction to ProBitian's enterprise Power BI dashboard architecture, addressing `{{powerbi_use_case}}`.
- **Step 2 (Delay 3 Days)**:
  - *Subject*: `Quick follow-up regarding BI efficiency for {{company_name}}`
  - *Content*: Relevant case study demonstrating 85% time savings in automated reporting for the `{{industry}}` sector.
- **Step 3 (Delay 4 Days)**:
  - *Subject*: `Final thought on {{company_name}}'s analytics roadmap`
  - *Content*: Invitation for a no-obligation 20-minute live dashboard walkthrough.

---

## 6. Selective Lead Enrollment Workflow

> 🚨 **CRITICAL DESIGN MANDATE**: The sequence system does **NOT** blindly blast the entire database. Administrators have granular control over exactly which prospects enter automated sequences.

```
1. Open B2B Leads CRM (/admin -> Lead Outreach & CRM -> B2B Leads CRM)
       │
2. Filter & Search targeted prospects (e.g., High Priority in "Financial Services")
       │
3. Check checkboxes for specific leads:
   [✓] Company A (contact@companya.com)
   [✓] Company C (contact@companyc.com)
   [✓] Company F (contact@companyf.com)
       │
4. Batch Action Toolbar appears: Click [ Start Email Sequence ]
       │
5. Sequence Enrollment Modal opens:
   - Select Target Sequence (e.g., "Enterprise Power BI Outbound (3 Steps)")
   - Preview selected 3 leads
   - Review duplicate and safety protection terms
       │
6. Click [ Enroll 3 Leads ]
       │
7. Server stores enrollments in Supabase:
   - Sets Step 1 `next_send_at` = NOW()
   - Status = 'Active'
       │
8. Background worker picks up eligible leads within 60 seconds and dispatches Step 1.
```

---

## 7. Dynamic Email Personalization Tags

All campaign and sequence templates support rich curly-brace tags. When emails are rendered, tags are replaced with clean prospect data or safe defaults:

| Dynamic Tag | Alternate Tag | Output Example | Fallback Value |
| :--- | :--- | :--- | :--- |
| `{{company_name}}` | `{{Company Name}}` | `Acme Retail Solutions` | `your company` |
| `{{contact_person}}` | `{{Contact Person}}` | `Sarah Jenkins` | `Valued Partner` |
| `{{first_name}}` | `{{First Name}}` | `Sarah` | `there` |
| `{{industry}}` | `{{Industry}}` | `E-Commerce & Retail` | `your industry` |
| `{{location}}` | `{{Location}}` | `Chicago, IL` | `your region` |
| `{{powerbi_use_case}}`| `{{Power BI Use Case}}`| `Executive Sales Margin Dashboard`| `reporting and analytics` |
| `{{phone}}` | `{{Phone}}` | `+1 (555) 234-5678` | `(blank)` |
| `{{linkedin}}` | `{{LinkedIn}}` | `https://linkedin.com/in/...` | `(blank)` |
| `{{lead_priority}}` | `{{Lead Priority}}` | `High` | `Standard` |

### Personalization Example

**Template**:
```html
<p>Hello {{contact_person}},</p>
<p>We noticed that {{company_name}} operates within the {{industry}} sector in {{location}}. Many organizations face hurdles when scaling {{powerbi_use_case}}.</p>
<p>At ProBitian, we specialize in building scalable DAX models and executive Power BI dashboards.</p>
```

**Rendered Output**:
```html
<p>Hello Sarah Jenkins,</p>
<p>We noticed that Acme Retail Solutions operates within the E-Commerce & Retail sector in Chicago, IL. Many organizations face hurdles when scaling Executive Sales Margin Dashboard.</p>
<p>At ProBitian, we specialize in building scalable DAX models and executive Power BI dashboards.</p>
```

---

## 8. Sequence Worker Engine & Manual Trigger

### 8.1 Automated Cron Execution
- The server initializes an automatic worker running every **60 seconds** (`setInterval`).
- Inspects all active sequence enrollments where `next_send_at <= now()`.
- Verifies lead is not in a terminal stop status.
- Dispatches due step email via Gmail SMTP.
- Records delivery status in `deliveries` and `public.campaign_leads`.
- Calculates next send date (`now + delay_days * 86400000`) and advances `current_step`.
- When all steps are sent, marks enrollment as `Completed`.

### 8.2 "Process Due Steps Now"
Administrators can click the **Process Due Steps Now** button in the *Email Sequences* module to immediately trigger a sequence check cycle without waiting for the 60-second timer.

---

## 9. Sequence Safety & Automatic Termination Rules

Automated sequences automatically stop outreach to prevent awkward communications once a prospect responds or opts out:

```
                  ┌──────────────────────────────────────────────┐
                  │          Worker Inspects Lead Status         │
                  └──────────────────────┬───────────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
[ Terminal Status Reached ]                                     [ Normal Status ]
- Replied                                                       - Not Contacted
- Interested                                                    - Contacted
- Demo Requested                                                - Opened
- Converted                                                               │
- Do Not Contact                                                          ▼
- Bounced                                                      [ Dispatch Due Step ]
- Not Interested
        │
        ▼
[ Sequence Automatically STOPPED for this Lead ]
[ Logged Stop Reason: 'Replied' / 'Interested' / etc. ]
[ No further automated emails sent ]
```

### Lead Drawer Inspection & Manual Stop
Clicking any lead in the CRM opens the **Lead Details Drawer**:
- Lists all currently enrolled automated sequences.
- Displays current step progress (e.g. `Step 1 / 3`) and next scheduled send date/time.
- Provides a direct **Stop** button allowing admins to manually halt a sequence for that specific lead at any time.

---

## 10. Supabase Database Schema Reference

All CRM, campaign, and sequence data resides permanently in Supabase PostgreSQL:

```sql
-- 1. Leads Table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT DEFAULT '',
  location TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  powerbi_use_case TEXT DEFAULT '',
  lead_priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Not Contacted',
  follow_up_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Lead Outreach Campaigns
CREATE TABLE public.lead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'lead_outreach',
  subject TEXT NOT NULL,
  preheader TEXT DEFAULT '',
  html_content TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  total_recipients INT DEFAULT 0,
  successful_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Campaign & Sequence Recipients Delivery Log
CREATE TABLE public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_email TEXT NOT NULL,
  lead_company TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
```

---

*Documentation maintained by Shivam Singh — ProBitian.*
