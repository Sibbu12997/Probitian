# ProBitian — Official Documentation Index

Welcome to the official technical, administrative, and operational documentation index for ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 📚 Documentation Directory

### 📖 User & Administration Guides
- 👤 **[ProBitian Website User Guide](PROBITIAN_USER_GUIDE.md)**  
  Comprehensive user guide for public learners navigating courses, portfolio projects, technical articles, and enquiry forms.
- 🛠 **[Admin Control Center User Guide](PROBITIAN_ADMIN_CONTROL_CENTER_USER_GUIDE.md)**  
  Administrator manual covering all 17 CMS modules, home page editing, message handling, branding, and GA4 analytics.

### 🗄 Database & Storage Architecture
- 🏛 **[Database Architecture Specification](DATABASE_ARCHITECTURE.md)**  
  Detailed specification of Supabase PostgreSQL as the single authoritative production database and table schema references.
- 🔄 **[Database Migrations & Schema Management](DATABASE_MIGRATIONS.md)**  
  Sequential migration log (`0001` to `0006`), non-destructive schema rules, and migration execution procedures.
- 🖼 **[Media Library & Supabase Storage Specification](MEDIA_LIBRARY.md)**  
  Supabase Storage (`probitian-media` bucket) architecture, folder organization, upload API, and SVG DOMPurify sanitization.

### ✉️ Email & Newsletter Workflows
- 📬 **[Newsletter Subscription Workflow](NEWSLETTER_WORKFLOW.md)**  
  Step-by-step pipeline for newsletter subscriptions, database persistence gating, and welcome email delivery.
- 📢 **[Email Campaign Broadcast Engine Workflow](EMAIL_CAMPAIGN_WORKFLOW.md)**  
  Campaign creation, draft saving, test emails, bulk subscriber dispatches, and recipient delivery tracking.
- 🔐 **[Email Configuration & Gmail SMTP Security](EMAIL_CONFIGURATION.md)**  
  Nodemailer over Gmail SMTP setup, sender configuration, and credential isolation standards.

### 📊 Analytics & Security
- 📈 **[Google Analytics 4 (GA4) Specification](ANALYTICS.md)**  
  GA4 frontend event measurement, conversion tracking, and Admin GA4 Command Center proxy architecture.
- 🛡 **[Security & Secret Isolation Architecture](SECURITY.md)**  
  Passkey authentication, Row Level Security (RLS) enforcement, service role isolation, and input sanitization.

### 🚀 Operations & Deployment
- 🔄 **[Production Deployment Workflow](DEPLOYMENT_WORKFLOW.md)**  
  Step-by-step deployment pipeline, pre-release verification, and non-destructive deployment mandates.
- ✅ **[Production Release Checklist](PRODUCTION_RELEASE_CHECKLIST.md)**  
  Pre-launch verification checklist across database, email, storage, security, and build readiness.
- 🔧 **[Operational Troubleshooting Manual](TROUBLESHOOTING.md)**  
  Resolution procedures for common issues, error codes, database permissions, email delivery, and media uploads.

---

*Documentation maintained by Shivam Singh — ProBitian.*
