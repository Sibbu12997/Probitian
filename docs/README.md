# ProBitian — Official Documentation Index

Welcome to the official technical, administrative, and operational documentation index for ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official X: [https://x.com/Probitian](https://x.com/Probitian) (@Probitian)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 📚 Documentation Directory

### 📖 User & Administration Guides
- 👤 **[ProBitian Website User Guide](PROBITIAN_USER_GUIDE.md)**  
  Comprehensive user guide for public learners navigating courses, portfolio projects, technical articles, and enquiry forms.
- 🛠 **[Admin Control Center User Guide](PROBITIAN_ADMIN_CONTROL_CENTER_USER_GUIDE.md)**  
  Administrator manual covering all 20 CMS & CRM modules, B2B Lead CRM, Email Sequences, Lead Outreach Campaigns, home page editing, message handling, branding, and GA4 analytics.
- 🎯 **[B2B Lead CRM & Automated Email Sequences Workflow](LEAD_OUTREACH_AND_SEQUENCES_WORKFLOW.md)**  
  Complete operational specification for B2B Lead CRM, CSV Import pipeline, Outreach Campaigns, Multi-step Email Sequences, Selective Lead Enrollment, and Background Worker.

### 🗄 Database & Storage Architecture
- 🏛 **[Database Architecture Specification](DATABASE_ARCHITECTURE.md)**  
  Detailed specification of Supabase PostgreSQL as the single authoritative production database, table schema references (`leads`, `lead_campaigns`, `campaign_leads`), and RLS policies.
- 🔄 **[Database Migrations & Schema Management](DATABASE_MIGRATIONS.md)**  
  Sequential migration log (`0001` to `0010`), non-destructive schema rules, and migration execution procedures.
- 🖼 **[Media Library & Supabase Storage Specification](MEDIA_LIBRARY.md)**  
  Supabase Storage (`probitian-media` bucket) architecture, folder organization, upload API, and SVG DOMPurify sanitization.

### ✉️ Email, Outreach & Automated Sequences
- 📬 **[Newsletter Subscription Workflow](NEWSLETTER_WORKFLOW.md)**  
  Step-by-step pipeline for newsletter subscriptions, database persistence gating, and welcome email delivery.
- 📢 **[Email Campaign Broadcast Engine Workflow](EMAIL_CAMPAIGN_WORKFLOW.md)**  
  Newsletter broadcast engine, draft saving, test emails, bulk subscriber dispatches, and recipient delivery tracking.
- 🎯 **[Lead Outreach Campaigns & Automated Sequences](LEAD_OUTREACH_AND_SEQUENCES_WORKFLOW.md)**  
  B2B targeted outreach broadcasts, multi-step drip email sequences, dynamic variable tags, and automated stop triggers.
- 🔐 **[Email Configuration & Gmail SMTP Security](EMAIL_CONFIGURATION.md)**  
  Nodemailer over Gmail SMTP setup, sender configuration, and credential isolation standards.

### 📊 Analytics & Security
- 📈 **[Google Analytics 4 (GA4) Specification](ANALYTICS.md)**  
  GA4 frontend event measurement, conversion tracking, and Admin GA4 Command Center proxy architecture.
- 🔍 **[SEO Architecture & Implementation Specification](SEO_ARCHITECTURE.md)**  
  Path-based routing, dynamic metadata engine, canonical URL normalization, structured data schemas (JSON-LD), robots.txt, dynamic XML sitemaps, and HTTP 404 response architecture.
- 🧪 **[SEO User Acceptance Testing (UAT) Report](SEO_UAT.md)**  
  Comprehensive production verification report across 22 test checkpoints, production URL matrix, and post-deployment search console guide.
- 🛡 **[Security & Secret Isolation Architecture](SECURITY.md)**  
  Passkey authentication, Row Level Security (RLS) enforcement, service role isolation, and input sanitization.

### 🚀 Operations & Deployment
- 🔄 **[Production Deployment Workflow](DEPLOYMENT_WORKFLOW.md)**  
  Step-by-step deployment pipeline, pre-release verification, and non-destructive deployment mandates.
- ✅ **[Production Release Checklist](PRODUCTION_RELEASE_CHECKLIST.md)**  
  Pre-launch verification checklist across database, email, storage, security, and build readiness.
- 🔧 **[Operational Troubleshooting Manual](TROUBLESHOOTING.md)**  
  Resolution procedures for common issues, error codes, database permissions, email delivery, and media uploads.

### 👥 Community & Governance
- 📖 **[Contribution Guidelines](../CONTRIBUTING.md)**  
  Comprehensive guidelines for contributing code, BI educational content, documentation, and bug fixes.
- 🤝 **[Code of Conduct](../CODE_OF_CONDUCT.md)**  
  Community pledge, behavioral standards, and enforcement policies.
- 🛡️ **[Security Policy & Vulnerability Disclosure](../SECURITY.md)**  
  Responsible disclosure procedures, reporting channels, and vulnerability scope.
- ⚖️ **[License](../LICENSE)**  
  MIT License for software source code with reservation of ProBitian trademarks and educational content.

---

*Documentation maintained by Shivam Singh — ProBitian.*
