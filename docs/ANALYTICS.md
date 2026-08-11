# ProBitian — Google Analytics 4 (GA4) Integration Documentation

Official Specification for Visitor Analytics in ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  

---

## 1. Overview & Purpose

ProBitian uses **Google Analytics 4 (GA4)** to monitor website traffic, user engagement, page performance, and custom conversion events.

- **Frontend Measurement ID**: Configured via `VITE_GA4_MEASUREMENT_ID`.
- **Primary Objective**: Measure visitor trends, popular courses, dashboard dataset downloads, and enquiry conversions.

---

## 2. Analytics Scope & Boundaries

> 🚨 **IMPORTANT STRUCTURAL BOUNDARY**:
> GA4 is strictly an **analytics and reporting tool**. GA4 is **NOT**:
> - The database
> - CMS content storage
> - Subscriber list storage
> - Contact inquiry storage
> - Campaign execution engine
> - Media asset storage
>
> **Supabase PostgreSQL** remains the single authoritative source of truth for all application data, content, and state.

---

## 3. Client Event Tracking

The frontend application (`src/lib/analytics.ts`) automatically emits standard page view events and custom conversion events to GA4:

- `page_view`: Fired on hash-route page changes (`#/`, `#/learn`, `#/projects`, `#/blog`, `#/contact`).
- `contact_form_submit`: Fired when a visitor submits an enquiry.
- `newsletter_subscribe`: Fired when a visitor subscribes to the newsletter.
- `dataset_download_click`: Fired when a learner clicks to download a sample CSV/XLSX dataset.
- `course_modal_open`: Fired when a learner opens a course curriculum modal.
- `project_demo_click`: Fired when a visitor launches a live BI project demo.

---

## 4. Admin GA4 Command Center Dashboard

The Admin Control Center (`#/admin`) includes an integrated GA4 Analytics Command Center module (`/api/admin/ga4/*`):

- **Real-Time Active Visitors**: Live active session count.
- **Audience Metrics**: Total users, new users, sessions, average engagement time, and bounce rate.
- **Date Range Selectors**: Filter metrics by 7 Days, 30 Days, 90 Days, or Custom ranges.
- **Top Pages Report**: Most visited routes and courses.
- **Geographic Distribution**: Visitor traffic by country.
- **Conversion Counters**: Track total dataset downloads and subscriber growth.

---

## 5. Security & Privacy

- GA4 scripts run anonymously in accordance with website Privacy Policy guidelines.
- No personal identifiable information (PII) or passwords are transmitted to GA4.
- Measurement IDs are public, while server-side API query credentials remain isolated in the server environment.

---

*Documentation maintained by Shivam Singh — ProBitian.*
