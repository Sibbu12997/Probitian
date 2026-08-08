# ProBitian Admin Control Center — User Guide

Official Administrative Management Guide for Authorized ProBitian Portal Administrators.

## 1. Introduction & Security Responsibilities
The ProBitian Admin Control Center is a secure, single-pane management dashboard designed for authorized administrators to manage site content, monitor GA4 analytics, track contact inquiries, review subscribers, and update branding assets.

### Security Responsibilities
- Confidentiality: Never share the Admin Passkey or login URL.
- Key Isolation: API credentials, GA4 private keys, and service account tokens are stored server-side only.
- Session Hygiene: Always log out when completing administrative tasks.

## 2. Admin Authentication & Access Control
### Accessing the Admin Portal
- URL: Append #/admin to the website address (e.g., https://probitian.ai.studio/#/admin).
- Passkey Screen: Enter the authorized Admin Passkey.
- Navigation Controls:
  - "Back to Website": Instantly returns to the public site without ending session.
  - "Logout": Clears admin session token and returns to login screen.

## 3. Admin Dashboard Overview
Upon authenticating, administrators are greeted with the Command Center overview:
- KPI Metrics Cards:
  - Active Users Now (Real-Time GA4 data).
  - Total Visitors Today, Last 7 Days, and Last 30 Days.
  - Pending Contact Messages.
  - Active Newsletter Subscribers.
- Quick Launchpad: One-click shortcuts to Add Blog, Manage Courses, Branding Settings, and GA4 Analytics.

## 4. CMS Content Management Workflow
ProBitian utilizes a unified CMS model for managing site content.

### Content Lifecycle
1. Draft Mode: Content is stored in the system but hidden from public views.
2. Published Mode: Instantly visible across the live website.
3. Edit / Archive: Modify existing items or toggle visibility instantly.

## 5. Projects Management Module
- Add New Project: Enter Title, Category, Short Summary, Detailed Description, and Tools Used.
- Link Attachments: Add Live Demo URL, GitHub Repository, YouTube Tutorial link, and Dataset download link.
- Featured Toggle: Mark key projects to appear on the Home page hero grid.

## 6. Blog Management Module
- Article Editor: Configure Title, Slug, Excerpt, Full Content, Read Time, and Tags.
- Visual Assets: Attach Cover Image URL and optional YouTube Walkthrough URL.
- Publishing Status: Toggle between Draft and Published.

## 7. Courses & Learn Management Module
- Course Profile: Set Title, Subtitle, Category (Power BI, SQL, etc.), Level, and Duration.
- Resource Links: Attach YouTube Video IDs, PDF Documentation links, and Dataset URLs.

## 8. Contact Messages & Inbox Management
- Viewing Inquiries: Real-time table displaying sender Name, Email, Phone, Course Interest, and Timestamp.
- Status Badges: Mark messages as Unread, Read, or Replied.
- One-Click Email Reply: Click "Reply via Email" to open your native email client with pre-filled recipient address.
- Admin Notes: Attach private internal notes to individual messages.

## 9. Newsletter Subscribers Module
- Subscriber Roster: View full list of subscriber emails and signup timestamps.
- Search & Export: Search subscribers by domain or date.

## 10. Website Branding Management
- Custom SVG Upload: Upload custom Logo SVG and Banner SVG files.
- Security Sanitization: Automated backend sanitizer strips inline scripts and dangerous XML constructs prior to storage.
- Real-Time Live Preview: Inspect new logo and banner assets side-by-side before committing.
- Reset to Default: One-click restoration of factory ProBitian branding assets.

## 11. Analytics Command Center (GA4 Integration)
Real-time integration with Google Analytics 4 Data API and Realtime API.

### Tracked Analytics Metrics
- Active Users Now: Live active sessions from GA4 Realtime API.
- Historical Visitors: Breakdown by Today, 7 Days, and 30 Days.
- Engagement Metrics: Page Views, Total Sessions, Engagement Rate (%), Average Engagement Time.
- Deduplicated Top Pages Report: Aggregates duplicate dimension paths into unique page rows.
- Traffic Sources & Geographic Demographics: Referrers, Devices, Browsers, and Visitor Countries.
- Custom Event Conversion Cards:
  - youtube_click
  - instagram_click
  - facebook_click
  - github_click
  - course_click
  - project_click
  - blog_click
  - contact_click
  - contact_form_submit

## 12. General Settings & Navigation Management
- General Settings: Edit Site Name, Tagline, Contact Email, and Footer Copyright.
- Navigation Links: Toggle header and footer link visibility and custom display order.
- Social Links: Manage external URLs for YouTube, Instagram, Facebook, and GitHub.

## 13. Light / Dark Theme Support
Switch between Light and Dark mode using the sun/moon icon in the Admin portal top header bar.

## 14. Admin Troubleshooting & FAQ
- Q: I uploaded a logo SVG but it looks cut off.
  - A: Ensure your SVG uses a viewBox aspect ratio suitable for header display (e.g. 200x50px).
- Q: How do I refresh GA4 Analytics?
  - A: Click the "Refresh Analytics" button in the Analytics Command Center header.
- Q: What happens when I click "Reset to Default" branding?
  - A: The system immediately restores the default ProBitian logo and banner assets on both development and production servers.
