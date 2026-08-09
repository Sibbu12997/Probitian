import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

// Ensure public/docs directory exists
const docsDir = path.join(process.cwd(), 'public', 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Helper to wrap and write text with simple pagination in jsPDF
function createPdfFromMarkdown(title, subtitle, content, outputPath) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxLineWidth = pageWidth - (margin * 2);

  let y = 50;

  // Header Banner
  doc.setFillColor(109, 40, 217); // Purple theme #6d28d9
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(title, margin, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(subtitle, margin, 60);

  y = 110;

  const lines = content.split('\n');

  lines.forEach((line) => {
    // Check page overflow
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 50;
      
      // Top header rule for page > 1
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 35, pageWidth - margin, 35);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${title} — Page ${doc.internal.pages.length - 1}`, margin, 30);
    }

    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(trimmed.replace('# ', ''), margin, y);
      y += 8;
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(1.5);
      doc.line(margin, y, margin + 120, y);
      y += 14;
    } else if (trimmed.startsWith('## ')) {
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(trimmed.replace('## ', ''), margin, y);
      y += 12;
    } else if (trimmed.startsWith('### ')) {
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(trimmed.replace('### ', ''), margin, y);
      y += 10;
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const bulletText = '• ' + trimmed.substring(2);
      const wrapped = doc.splitTextToSize(bulletText, maxLineWidth - 10);
      doc.text(wrapped, margin + 8, y);
      y += (wrapped.length * 13) + 2;
    } else if (/^\d+\.\s/.test(trimmed)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const wrapped = doc.splitTextToSize(trimmed, maxLineWidth - 10);
      doc.text(wrapped, margin + 8, y);
      y += (wrapped.length * 13) + 2;
    } else if (trimmed.length === 0) {
      y += 6;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const wrapped = doc.splitTextToSize(trimmed, maxLineWidth);
      doc.text(wrapped, margin, y);
      y += (wrapped.length * 13) + 2;
    }
  });

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`ProBitian Platform Documentation — Official User Guide`, margin, pageHeight - 20);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 40, pageHeight - 20);
  }

  doc.save(outputPath);
  console.log(`Generated PDF: ${outputPath}`);
}

// Build Guide 1 Content: Public Website User Guide
const websiteGuideMd = `# ProBitian Website — User Guide

Official User & Learner Guide for the ProBitian Business Intelligence & Data Analytics Platform.

## 1. Introduction & Platform Overview
ProBitian is a premium, end-to-end Business Intelligence and Data Analytics learning ecosystem founded by **Shivam Baghel**. The platform is designed to help students, data analysts, BI developers, and technology enthusiasts master practical skills in Power BI, SQL, Python, Advanced Excel, Financial Modeling, and AI-assisted analytics.

### Core Objectives
- **Hands-On Learning**: Access interactive skill modules, video tutorials, and real-world project portfolios.
- **Portfolio Building**: Download raw dataset files (CSV, XLSX) allowing learners to build verified resume projects.
- **Industry Insights**: Read in-depth technical articles on DAX formulas, SQL optimization, and data engineering.
- **Direct Engagement**: Connect directly via contact forms and newsletter subscription channels.

## 2. Getting Started & Website Navigation
The ProBitian website features a single-page application (SPA) architecture with hash-based route navigation (#/, #/learn, #/projects, etc.) for instantaneous page transitions.

### Header Navigation Bar
- **ProBitian Logo**: Click anytime to return to the Home page.
- **Navigation Links**: Home, Learn, Projects, Blog, YouTube, About, Contact.
- **Theme Switcher**: Sun/Moon icon in the top header bar toggles between Light Mode and Dark Mode.
- **Responsive Mobile Menu**: On mobile screens (<768px), a hamburger icon opens a full-screen mobile menu.

### Public Website Pages & Routes
- **Home (#/)**: Platform overview, hero statistics, core features, top courses, featured portfolio projects, and YouTube highlights.
- **Learn (#/learn)**: Complete course catalog with filter tabs, skill level badges, video lessons, PDF cheat sheets, and dataset downloads.
- **Projects (#/projects)**: Portfolio gallery of real-world Power BI & SQL dashboards featuring problem statements, live interactive demos, GitHub repos, and raw sample dataset downloads.
- **Blog (#/blog)**: Technical articles, DAX optimization guides, and BI career frameworks with code snippets and video walk-throughs.
- **YouTube (#/youtube)**: Curated repository of video tutorials, playlists, and channel subscription highlights.
- **About (#/about)**: Founder profile (Shivam Baghel), platform mission statement, impact metrics, and learning roadmap.
- **Contact (#/contact)**: Direct message portal for course inquiries, mentorship, or project collaborations, plus official ProBitian Community Hub location.
- **Terms of Service (#/terms)**: Platform usage terms, intellectual property, and learner guidelines.
- **Privacy Policy (#/privacy-policy / #/privacy)**: Data handling practices, cookie policies, user rights, and privacy controls.

## 3. Home Page Guide
The Home page serves as the entry point to the ProBitian ecosystem.

### Key Sections & Interactions
1. **Hero Banner**: Features primary headline, tagline, "Start Learning" CTA (#/learn), and "Explore Projects" CTA (#/projects).
2. **Value Proposition Cards**: Highlights core skill pillars—Power BI Mastery, SQL Querying, Advanced Excel, and AI Tools for Data Professionals.
3. **Featured Course Cards**: Direct buttons opening detailed course curriculum modals.
4. **Featured Project Showcase**: Interactive cards displaying project badges, tools used, and direct modal popups.
5. **Latest Blog Articles**: Quick-read summaries with direct links to full technical posts.
6. **YouTube Community Highlights**: Direct links to video tutorials and channel subscription links.
7. **Footer & Newsletter**: Instant subscription box for receiving weekly dataset drops and tips.

## 4. Learn Page Guide
The Learn page hosts structured learning paths for data professionals.

### Course Directory Features
- **Category Tabs**: Filter courses by All, Power BI, SQL, Excel, Python, or AI.
- **Skill Level Indicators**: Marked as Beginner, Intermediate, or Advanced.
- **Interactive Course Modals**: Click any course card to open the curriculum modal containing:
  - Full course overview & learning outcomes.
  - Video lesson links and YouTube tutorials.
  - PDF downloadable guides and cheat sheets.
  - Practice dataset download buttons.

## 5. Projects Page Guide
The Projects page offers production-grade portfolio projects designed for resume enhancement.

### Project Gallery Features
- **Filter Options**: Power BI, SQL, Python, Financial Dashboards, Executive Analytics.
- **Project Modal Views**:
  - Problem Statement & Business Solution.
  - Tools & Technologies Used (Power BI Desktop, DAX, PostgreSQL, Python, etc.).
  - Action Buttons:
    - **Live Interactive Demo**: Launches embedded or hosted web dashboard.
    - **GitHub Repository**: Inspect clean SQL queries and Python scripts.
    - **YouTube Tutorial**: Step-by-step video walkthrough.
    - **Dataset Download**: Instant access to sample raw data files.

## 6. Blog Page Guide
The Blog section contains technical tutorials and industry insights.

### Article Reader Experience
- **Category & Tag Filters**: DAX, Data Modeling, SQL Optimization, AI Tools.
- **Article Modals**: Clean typography with code snippets, key takeaways, and embedded YouTube video walkthroughs.

## 7. Contact Page Guide & Community Hub Location
Get in touch with Shivam Baghel or the ProBitian support team.

### How to Submit an Enquiry
1. Navigate to **Contact** (#/contact).
2. Enter your **Full Name**, **Email Address**, and optional **Phone Number**.
3. Select your **Subject or Interested Course** (e.g., Power BI Mastery, SQL Bootcamp).
4. Type your message in the text box.
5. Click **Send Message**.
6. Receive immediate on-screen confirmation. Your message is saved securely to Supabase and dispatches an automated notification email via server-side Gmail SMTP / Nodemailer. Expect a reply within 24-48 hours.

### Official Community Hub Location
- **Name**: ProBitian Community Hub
- **Address**: M93M+688, Salaiya, Madhya Pradesh 486440, India
- **Plus Code**: M93M+688 Salaiya, Madhya Pradesh
- **Latitude / Longitude**: 24.6030, 81.2833 (informational)
- **Google Maps Share URL**: https://maps.app.goo.gl/T4426JADcNHHFPqb7
- **Action**: Click "View on Google Maps ->" to open the location in a new browser tab (target="_blank" rel="noopener noreferrer").

## 8. Newsletter Subscription
- Located in the global website footer on every page.
- Enter your email address and click **Subscribe**.
- Immediate on-screen confirmation without full page reloads.

## 9. Legal & Policy Pages
- **Terms of Service (#/terms)**: Outlines user conduct, intellectual property, course access, and liability limits.
- **Privacy Policy (#/privacy-policy)**: Explains data collection, cookie usage, email communication preferences, and security measures.

## 10. Light / Dark Theme & Mobile Experience
- **Theme Support**: Seamlessly toggle between Light Mode and Dark Mode using the sun/moon button in the top navigation bar. Theme choice persists across sessions.
- **Mobile Responsiveness**: Designed with responsive layouts and touch targets exceeding 44px for effortless mobile browsing.

## 11. FAQ & Troubleshooting
- **Q: How do I download sample datasets?**
  - **A**: Click "Download Dataset" inside any Project or Course modal.
- **Q: Are all learning resources free?**
  - **A**: Yes, ProBitian provides free public access to course curriculum guides, video links, and sample datasets.
- **Q: How do I open the Community Hub location on Google Maps?**
  - **A**: Go to the Contact page (#/contact) and click "View on Google Maps ->" on the Community Hub card.
`;

// Build Guide 2 Content: Admin Control Center User Guide
const adminGuideMd = `# ProBitian Admin Control Center — User Guide

Official Administrative Management Guide for Authorized ProBitian Portal Administrators.

## 1. Introduction & Security Guidance
The ProBitian Admin Control Center (#/admin) is a secure management portal for authorized administrators to control website content, analyze GA4 traffic, manage contact inquiries, send email responses, maintain subscribers, and configure brand settings.

### Critical Security Instructions
- **Never Share Credentials**: Do not share the Admin Passkey or login URL.
- **Server-Side Secret Isolation**: Secret environment variables (ADMIN_PASSKEY, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, GMAIL_APP_PASSWORD, GEMINI_API_KEY) must remain strictly server-side.
- **No Client Secrets**: Never place server secrets in frontend code, git commits, README files, or public documentation.

## 2. Admin Authentication & Access Control
### Accessing the Admin Portal
1. Append #/admin to the website URL (e.g., https://probitian.com/#/admin).
2. Enter the authorized **Admin Passkey**.
3. Click **Unlock Admin Portal**.
4. The server validates the passkey via POST /api/admin/verify-passkey against process.env.ADMIN_PASSKEY and issues an authenticated session token.

### Navigation Controls
- **Back to Website**: Returns to the public site without terminating the session.
- **Logout**: Instantly clears the admin session token and redirects to the login screen.

## 3. Comprehensive Admin Modules Guide
The Admin Portal contains **17 integrated management modules**:

### 1. Dashboard Overview
- **Function**: Command center summary and quick launchpad.
- **Features**: KPI metrics (Active Users Now, Today's Visitors, Pending Inquiries, Total Subscribers), quick shortcuts to core CMS actions, and recent activity logs.

### 2. GA4 Analytics Command Center
- **Function**: Real-time traffic, audience engagement, and conversion tracking via Google Analytics 4 API.
- **Features**: Active visitors count, date range filters (7D, 30D, 90D, Custom), total page views, average session duration, top pages report, traffic referral sources, device types, visitor country map, and event conversion counters (contact_form_submit, newsletter_subscribe, dataset_download_click, etc.).

### 3. Home Page Editor
- **Function**: Edit hero section, headlines, statistics, and value proposition cards on the public Home page.
- **Workflow**:
  - Edit hero headline, subheadline, CTA text, and CTA links.
  - Modify platform key stats (e.g. "10K+ Learners", "50+ Dashboards").
  - Update feature cards and value pillars.
  - Click **Save Changes** -> Persists to Supabase and reflects immediately on the live Home page.

### 4. Projects Portfolio Manager
- **Function**: Create, edit, publish, order, and tag portfolio projects.
- **Workflow**:
  - Click **Add New Project** or select an existing project to edit.
  - Set Title, Category, Summary, Full Description, and Tools Used.
  - Attach Live Demo URL, GitHub Repository, YouTube Tutorial link, and Dataset download link.
  - Toggle **Featured** to display on the Home page grid.
  - Click **Save Project** -> Updates Supabase and reflects instantly on #/projects.

### 5. Blog & Articles Manager
- **Function**: Draft, schedule, publish, or edit technical articles and guides.
- **Workflow**:
  - Set Article Title, URL Slug, Category, Read Time, and Tags.
  - Enter Excerpt and full Markdown content.
  - Attach Cover Image URL and optional YouTube video walkthrough link.
  - Set status to **Draft** or **Published**.
  - Click **Save Article** -> Updates Supabase and reflects on #/blog.

### 6. Learn & Courses Manager
- **Function**: Manage skill paths, course modules, video links, PDFs, and dataset resources.
- **Workflow**:
  - Set Course Title, Subtitle, Category (Power BI, SQL, Excel, Python, AI), Skill Level, and Duration.
  - Attach YouTube Video IDs, PDF Documentation links, and raw dataset download URLs.
  - Click **Save Course** -> Updates Supabase and reflects on #/learn.

### 7. YouTube Showcase Manager
- **Function**: Organize YouTube video tutorials, playlists, and channel highlights.
- **Workflow**:
  - Add Video Title, YouTube URL, Thumbnail URL, Category, Description, and Duration.
  - Edit or delete existing videos.
  - Click **Save** -> Updates Supabase and reflects on #/youtube.

### 8. Media Library Engine
- **Function**: Asset manager for site graphics, logos, banners, thumbnails, and PDF files.
- **Workflow**:
  - Upload media files (PNG, JPG, SVG, WebP, PDF).
  - SVG files undergo automated server-side **DOMPurify sanitization** before saving to eliminate script injection.
  - Preview media items, copy URLs, or **select existing media assets** directly when editing Branding, Projects, Blog, or Courses.
  - **Asset Reuse**: Re-use existing Media Library items instead of uploading duplicate files.

### 9. Contact Messages & Inbox Manager
- **Function**: Review visitor inquiries, organize status, and send email replies via Gmail SMTP / Nodemailer.
- **Workflow**:
  - View inbox table with sender Name, Email, Phone, Course Interest, Message, and Timestamp.
  - Update status badges (**Unread**, **Read**, **Replied**, **Archived**).
  - Add internal **Admin Notes** for team reference.
  - Click **Reply via Email**: Sends an email response directly from the portal via server-side **Gmail SMTP / Nodemailer** (GMAIL_USER and GMAIL_APP_PASSWORD).

### 10. Subscribers Manager
- **Function**: Manage newsletter email subscriptions.
- **Workflow**:
  - View full subscriber email roster and signup timestamps.
  - Search subscribers by domain or date.
  - Export subscriber lists to CSV format for email campaigns.

### 11. Website Branding Manager
- **Function**: Configure site logos, banners, theme colors, and brand identity.
- **Workflow**:
  - **Choose Logo & Banner from Media Library** or upload custom SVG assets.
  - Set Site Name, Tagline, and Theme Accents.
  - Preview new assets side-by-side before publishing.
  - Click **Reset to Factory Default** to restore original ProBitian branding assets if needed.

### 12. Social Links Manager
- **Function**: Control social profiles displayed across header and footer.
- **Workflow**:
  - Manage links for YouTube, Instagram, Facebook, GitHub, LinkedIn, etc.
  - Toggle active status and adjust display order.
  - Click **Save Social Links** -> Updates Supabase and reflects globally.

### 13. Navigation Menu Manager
- **Function**: Customize top navigation links, paths, icons, and visibility.
- **Workflow**:
  - Toggle navigation link visibility (e.g. show/hide Learn or YouTube).
  - Adjust order of menu items.
  - Click **Save Navigation** -> Updates Supabase and reflects in header.

### 14. SEO & Meta Tags Manager
- **Function**: Configure search engine optimization settings and social share tags.
- **Workflow**:
  - Edit Meta Title, Meta Description, Keywords, and Canonical URL.
  - Set Open Graph (OG) Title, OG Description, and OG Image URL.
  - Configure Twitter Handle and robots.txt indexing directives.
  - Click **Save SEO Settings** -> Updates Supabase and injects meta tags into index.html.

### 15. Website Settings (Including Community Hub Location)
- **Function**: Manage global site parameters and official physical location details.
- **Workflow**:
  - Edit Site Name, Tagline, Official Contact Email, and Footer Copyright.
  - **Community Hub Location Settings**:
    - **Community Hub Name**: Default ProBitian Community Hub
    - **Hub Physical Address**: Default M93M+688, Salaiya, Madhya Pradesh 486440, India
    - **Google Maps URL**: Default https://maps.app.goo.gl/T4426JADcNHHFPqb7
  - Click **Save Settings** -> Updates Supabase. Changes immediately update the Contact page (#/contact).

### 16. Backup & Restore Manager
- **Function**: Full CMS database backup and disaster recovery.
- **Workflow**:
  - Click **Export JSON Backup** to download a complete, time-stamped JSON snapshot of all CMS tables, settings, messages, and subscribers.
  - Click **Restore Database** to upload a backup JSON file and restore CMS state on demand.

### 17. Legal & Policies Manager
- **Function**: Edit Terms of Service and Privacy Policy pages.
- **Workflow**:
  - Edit Terms of Service and Privacy Policy text sections.
  - Set Effective Date, Contact Address, and Governing Jurisdiction clauses.
  - Click **Save Legal Settings** -> Updates Supabase. Public pages #/terms and #/privacy-policy update in real time.

## 4. Multi-Tier Data Persistence Architecture
ProBitian uses a high-availability, multi-tiered data storage model:
1. **Supabase PostgreSQL (Production Source of Truth)**: Primary cloud database storing all CMS tables, settings, messages, subscribers, and legal documents.
2. **data/cms_settings.json (Server-Side Fallback)**: Persistent file-based store ensuring continuity during cloud network disruptions.
3. **localStorage (Client-Side Cache)**: Caches theme preferences and general settings for instant rendering without layout shift.
4. **mockData (Seed Defaults)**: Baseline fallback data used during brand initialization or factory resets.

## 5. Email System Architecture (Gmail SMTP / Nodemailer)
Contact enquiries and admin email replies pass through server-side Express routes using **Nodemailer** over **Gmail SMTP**:
- Outgoing contact alerts and subscriber welcome emails.
- Admin reply dispatch directly from the Messages Inbox modal.
- Configured via server environment variables (GMAIL_USER and GMAIL_APP_PASSWORD).

## 6. Admin Troubleshooting & FAQ
- **Issue: Changes made in Admin are not appearing on the public site.**
  - **Solution**: Verify you clicked "Save". Check Supabase connection in browser dev tools console. Refresh the public page.
- **Issue: Uploaded image or logo is not displaying.**
  - **Solution**: Ensure the file was uploaded into the Media Library. Verify the media URL in Branding or content settings. Click "Save".
- **Issue: Contact reply email is failing to send.**
  - **Solution**: Verify server environment variables GMAIL_USER and GMAIL_APP_PASSWORD are valid. Check server log output.
- **Issue: Admin login failed.**
  - **Solution**: Confirm the passkey entered matches ADMIN_PASSKEY configured in the server environment.
`;

// Save Markdown files in public/docs and root
fs.writeFileSync(path.join(docsDir, 'ProBitian_Website_User_Guide.md'), websiteGuideMd);
fs.writeFileSync(path.join(docsDir, 'ProBitian_Admin_Control_Center_User_Guide.md'), adminGuideMd);

fs.writeFileSync(path.join(process.cwd(), 'ProBitian_Website_User_Guide.md'), websiteGuideMd);
fs.writeFileSync(path.join(process.cwd(), 'ProBitian_Admin_Control_Center_User_Guide.md'), adminGuideMd);

console.log('Saved Markdown files successfully.');

// Generate PDFs in public/docs
createPdfFromMarkdown(
  'ProBitian Website',
  'User & Learner Guide',
  websiteGuideMd,
  path.join(docsDir, 'ProBitian_Website_User_Guide.pdf')
);

createPdfFromMarkdown(
  'ProBitian Admin Control Center',
  'Administrator Management Guide',
  adminGuideMd,
  path.join(docsDir, 'ProBitian_Admin_Control_Center_User_Guide.pdf')
);

console.log('PDF Generation Complete!');
