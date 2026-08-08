import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

// Ensure directories exist
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
  doc.setFontSize(22);
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
      doc.setTextColor(15, 23, 42); // slate-900
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
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(trimmed.replace('## ', ''), margin, y);
      y += 12;
    } else if (trimmed.startsWith('### ')) {
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105); // slate-600
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
    doc.text(`ProBitian Platform Documentation — Generated Official User Guide`, margin, pageHeight - 20);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 40, pageHeight - 20);
  }

  doc.save(outputPath);
  console.log(`Generated PDF: ${outputPath}`);
}

// Build Guide 1 Content
const websiteGuideMd = `# ProBitian Website — User Guide

Official User & Learner Guide for the ProBitian Business Intelligence & Data Analytics Platform.

## 1. Introduction & Platform Overview
ProBitian is a premium, end-to-end Business Intelligence and Data Analytics learning ecosystem founded by Shivam Baghel. The platform is designed to help students, data analysts, BI developers, and technology enthusiasts master practical skills in Power BI, SQL, Python, Excel, Financial Modeling, and AI-assisted analytics.

### Core Objectives
- Hands-On Learning: Interactive access to skill modules, video tutorials, and real-world project portfolios.
- Portfolio Building: Downloadable dataset files (CSV, XLSX) allowing learners to build verified resume projects.
- Industry Insights: In-depth blog articles on DAX formulas, data engineering, and career growth strategies.
- Direct Engagement: Seamless contact forms and newsletter channels for personalized career guidance.

## 2. Website Navigation & Layout
The ProBitian website features an intuitive single-page application (SPA) architecture with hash-based route navigation for instantaneous page transitions.

### Header Navigation Bar
- ProBitian Logo: Click anytime to return to the Home page.
- Navigation Links: Home, Learn, Projects, Blog, About, Contact.
- Theme Switcher: Sun/Moon icon in the top right toggles between Light Mode and Dark Mode.
- Responsive Mobile Menu: On mobile devices, a hamburger icon opens a full-screen mobile menu.

### Navigation Routes
- Home (#/): Platform overview, hero stats, top courses, featured portfolio projects, and YouTube highlights.
- Learn (#/learn): Complete course catalog, categorised skill paths, and interactive curriculum modals.
- Projects (#/projects): Interactive gallery of real-world Power BI & SQL dashboards with live demos and dataset links.
- Blog (#/blog): Technical articles, DAX optimization guides, and BI career frameworks.
- About (#/about): Mission statement, founder bio, business impact metrics, and learning roadmap.
- Contact (#/contact): Direct message portal for course inquiries, mentorship, or project collaborations.

## 3. Home Page Guide
The Home page serves as the entry point to the ProBitian ecosystem.

### Key Sections & Interactions
1. Hero Banner: Displays core tagline, interactive "Start Learning" button (navigates to #/learn) and "Explore Projects" button (navigates to #/projects).
2. Value Proposition Cards: Highlights key pillars—Master Power BI, SQL Querying, Advanced Excel, and AI integration.
3. Featured Course Cards: Direct enrollment buttons opening detailed course curriculum modals.
4. Featured Project Showcase: Interactive cards displaying project badges, tools used, and direct modal popups.
5. Latest Blog Articles: Quick-read summaries with direct links to full technical posts.
6. YouTube Community Highlights: Direct links to video tutorials and channel subscription links.
7. Footer & Newsletter: Instant subscription box for receiving weekly dataset drops and tips.

## 4. Learn Page Guide
The Learn page hosts the structured curriculum for data professionals.

### Course Directory Features
- Category Tabs: Filter by All, Power BI, SQL, Excel, Python, or AI.
- Skill Level Indicators: Clearly marked as Beginner, Intermediate, or Advanced.
- Interactive Course Modals: Click any course card to open the modal containing:
  - Full course overview & learning outcomes.
  - Video lesson links and YouTube tutorials.
  - PDF downloadable guides and cheat sheets.
  - Practice dataset download buttons.

## 5. Projects Page Guide
The Projects page offers production-grade portfolio projects designed for resume enhancement.

### Project Gallery Features
- Filter Options: Power BI, SQL, Python, Financial Dashboards, Executive Analytics.
- Project Modal Views:
  - Problem Statement & Business Solution.
  - Tools & Technologies Used (e.g. Power BI Desktop, DAX, PostgreSQL, Python).
  - External Action Buttons:
    - Live Interactive Demo: Launches embedded or hosted web dashboard.
    - GitHub Repository: Inspect clean SQL queries and Python scripts.
    - YouTube Tutorial: Step-by-step video walkthrough.
    - Dataset Download: Instant access to sample raw data.

## 6. Blog Page Guide
The Blog section contains technical tutorials and industry insights.

### Article Reader Experience
- Category & Tag Filters: DAX, Data Modeling, SQL Optimization, AI Tools.
- Article Modals: Clean typography with code snippets, key takeaways, and embedded YouTube video links.

## 7. About Page Guide
Learn about the driving force behind ProBitian.

### Highlights
- Founder Profile: Shivam Baghel's background in Business Intelligence and Data Engineering.
- Impact Metrics: Over 10,000+ learners reached, 50+ projects created, 100+ articles published.
- Mission: Democratizing high-quality, practical data education.

## 8. Contact Page Guide
Get in touch with Shivam Baghel or the ProBitian support team.

### How to Submit an Inquiry
1. Fill in your Full Name, Email Address, and optional Phone Number.
2. Select your Subject or Interested Course (e.g., Power BI Mastery, SQL Bootcamp).
3. Type your Message in the message box.
4. Click "Send Message".
5. Receive immediate on-screen confirmation.

## 9. Newsletter Subscription
- Located in the global website footer.
- Enter your email address and click "Subscribe".
- Receive immediate confirmation without page reloads.

## 10. Social Channels & Community
- YouTube: Direct links to @probitian for free full-length courses.
- Instagram: Quick DAX tips, infographic summaries, and Q&A sessions.
- Facebook & GitHub: Community discussions and open-source project code.

## 11. Mobile Experience
- Responsive Breakpoints: Optimized for all screens from mobile phones (320px+) to 4K displays.
- Touch Targets: Minimum 44px touch areas for error-free mobile navigation.

## 12. Troubleshooting & FAQ
- Q: How do I download sample datasets?
  - A: Click the "Download Dataset" button inside any Project or Course modal. If blocked, check pop-up settings.
- Q: Are all courses free?
  - A: Yes, ProBitian offers free access to public video modules and downloadable datasets.
- Q: How do I toggle Dark Mode?
  - A: Click the Sun/Moon icon in the top navigation bar at any time.

## 13. Privacy Statement
ProBitian respects visitor privacy. Anonymous website analytics are tracked strictly to improve user experience. Personal contact information is kept confidential and never shared with third parties.
`;

// Build Guide 2 Content
const adminGuideMd = `# ProBitian Admin Control Center — User Guide

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
`;

// Save Markdown files
fs.writeFileSync(path.join(docsDir, 'ProBitian_Website_User_Guide.md'), websiteGuideMd);
fs.writeFileSync(path.join(docsDir, 'ProBitian_Admin_Control_Center_User_Guide.md'), adminGuideMd);

fs.writeFileSync(path.join(process.cwd(), 'ProBitian_Website_User_Guide.md'), websiteGuideMd);
fs.writeFileSync(path.join(process.cwd(), 'ProBitian_Admin_Control_Center_User_Guide.md'), adminGuideMd);

console.log('Saved Markdown files');

// Generate PDFs
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
