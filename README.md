# ProBitian — Master Business Intelligence & Data Analytics

> **ProBitian** is an end-to-end, full-stack learning and management platform designed for Data Analysts, BI Developers, and Business Intelligence enthusiasts. Founded by Shivam Baghel, ProBitian provides interactive course modules, real-world portfolio projects with downloadable datasets, technical blogs, and an advanced Admin Command Center with Google Analytics 4 (GA4) integration.

![ProBitian Banner](/banner.svg)

---

## 🌟 Platform Highlights

- **Learner Experience**: Interactive curriculum for Power BI, SQL, Python, Excel, and AI Tools with live dashboard demos and dataset downloads.
- **Portfolio Enhancer**: Downloadable raw datasets (CSV/XLSX) and GitHub repository links for learners to build resume projects.
- **Admin Control Center**: Single-pane management for website content, contact messages, subscribers, media library, and branding assets.
- **Analytics Engine**: Real-time and historical analytics powered directly by the Google Analytics 4 (GA4) Data & Realtime APIs.
- **Enterprise-Grade Security**: Server-side credential isolation, SVG XSS sanitization, and PII protection (zero contact form content sent to GA4).
- **Official Documentation**: Comprehensive PDF and Markdown user guides for public learners and portal administrators.

---

## 🚀 Public Website Features

1. **Home Page (`#/`)**:
   - Hero banner with quick enrollment and project exploration actions.
   - Featured skill modules, portfolio showcases, YouTube tutorials, and community highlights.
   - Footer newsletter subscription box.

2. **Learn & Courses (`#/learn`)**:
   - Categorized course directory (Power BI, SQL, Excel, Python, AI).
   - Skill level indicators (Beginner, Intermediate, Advanced).
   - Interactive modals with video lesson walkthroughs, downloadable PDF guides, and practice datasets.

3. **Portfolio Projects (`#/projects`)**:
   - Real-world BI dashboard showcases (Sales, Finance, HR, Executive Analytics).
   - Problem statements, tools used, live web demo links, GitHub code repositories, and raw dataset downloads.

4. **Blog & Knowledge Base (`#/blog`)**:
   - Searchable technical articles on DAX optimization, SQL querying, data modeling, and career growth.
   - Article modals with code snippets, key takeaways, and embedded video guides.

5. **About ProBitian (`#/about`)**:
   - Founder profile (Shivam Baghel), learning philosophy, business impact metrics (10,000+ learners, 50+ projects), and skill roadmap.

6. **Contact Portal (`#/contact`)**:
   - Direct inquiry form with instant client validation and automatic event conversion logging.

7. **Theme Engine**:
   - High-contrast Light & Dark modes accessible across all devices via the top navigation bar.

---

## 🔐 Admin Control Center (`#/admin`)

Authorized administrators gain access to a secure command center:

- **Passkey Authentication**: Server-side passkey verification protecting administrative actions.
- **Real-Time GA4 Command Center**:
  - **Active Users Now**: Powered by GA4 Realtime API.
  - **Historical Visitor Metrics**: Configurable date ranges (Today, Yesterday, 7 Days, 30 Days, 90 Days, Custom Range).
  - **Deduplicated Top Pages**: Automatically aggregates duplicate dimension paths to display 1 row per unique page path.
  - **Custom Event Tracking**: Monitors `youtube_click`, `instagram_click`, `facebook_click`, `github_click`, `course_click`, `project_click`, `blog_click`, `contact_click`, `contact_form_submit`, `newsletter_subscribe`, and `dataset_download_click`.
  - **Demographics & Devices**: Source referrers, device breakdown, browser analytics, and geographical origin.
- **Contact Inquiries Inbox**: Read, unread, and replied message tracking with 1-click email response and internal admin notes.
- **Subscriber Roster**: Complete roster management for newsletter signups with domain search and export capabilities.
- **Branding Manager**: Custom SVG logo and banner upload with backend security sanitization and 1-click factory reset.
- **CMS Management**: Live controls for Projects, Courses, Blog Posts, Video Modules, Social Links, and Navigation items.

---

## 📚 Official User Documentation

Comprehensive guides are generated and hosted directly within the application:

- 📖 **Learner Guide**: [`/docs/ProBitian_Website_User_Guide.pdf`](/docs/ProBitian_Website_User_Guide.pdf) ([Markdown](/docs/ProBitian_Website_User_Guide.md))
- 🛡️ **Admin Guide**: [`/docs/ProBitian_Admin_Control_Center_User_Guide.pdf`](/docs/ProBitian_Admin_Control_Center_User_Guide.pdf) ([Markdown](/docs/ProBitian_Admin_Control_Center_User_Guide.md))

---

## 🛠 Tech Stack & Architecture

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lucide React, Recharts.
- **Backend Server**: Express.js running on Node.js on port 3000 (ESM in dev, CJS bundled via `esbuild` for production).
- **Analytics**: Google Analytics 4 (Measurement ID: `G-G3WJXY6THP`, Property ID: `549083163`).
- **PDF Generation**: `jsPDF` for dynamic user guide publishing.

---

## 💻 Local Development & Deployment

### Prerequisites
- Node.js v18+ 
- npm v9+

### Commands

```bash
# Install dependencies
npm install

# Start local development server (Express + Vite on Port 3000)
npm run dev

# Run TypeScript linter
npm run lint

# Build full-stack bundle (Vite SPA + esbuild server.cjs)
npm run build

# Start production server
npm run start
```

Open `http://localhost:3000` in your browser.

---

© 2026 ProBitian. All Rights Reserved. Founded by Shivam Baghel.

