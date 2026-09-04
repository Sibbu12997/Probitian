import { OutreachTemplate, VariableTag } from './types';
import { Lead } from '../../../../types';

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: 'executive_powerbi',
    name: 'Executive Power BI Analytics Proposal',
    subject: 'Transforming {{company_name}}\'s Data into Real-Time Power BI Dashboards',
    preheader: 'Tailored Business Intelligence & automated KPI dashboards for {{company_name}}',
    content: `<p>Hi {{contact_person}},</p>
<p>I hope this email finds you well at <strong>{{company_name}}</strong>.</p>
<p>I have been following your growth in the <strong>{{industry}}</strong> sector and noticed there is a significant opportunity to streamline your reporting and executive decision-making.</p>
<h2>🎯 Tailored Power BI Solution for {{company_name}}</h2>
<p>We specialize in building enterprise-grade Microsoft Power BI ecosystems designed specifically for challenges like:</p>
<div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 6px;">
  <p style="margin: 0; font-weight: 600; color: #1e293b;">Targeted Scope: {{powerbi_use_case}}</p>
</div>
<ul>
  <li><strong>Automated Data Pipelines:</strong> Connect SAP, SQL Server, Excel, and CRM into one unified single source of truth.</li>
  <li><strong>Executive KPI Dashboards:</strong> Real-time visibility into operational efficiency, revenue metrics, and scrap/downtime costs.</li>
  <li><strong>Mobile & Desktop Access:</strong> Secure, role-based dashboards accessible anytime by leadership.</li>
</ul>
<p>Would you or your analytics team be open to a brief 15-minute introductory call this week to review a live demo relevant to {{company_name}}?</p>
<p style="text-align: center; margin: 30px 0;">
  <a href="https://probitian.ai.studio/contact" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Schedule 15-Min Power BI Discovery Call &rarr;</a>
</p>
<p>Best regards,<br />
<strong>Shivam & The ProBitian Business Intelligence Team</strong><br />
<span style="color: #64748b; font-size: 13px;">Microsoft Power BI Specialists & Enterprise Analytics Consultants</span><br />
<a href="https://probitian.ai.studio/" style="color: #7c3aed; font-size: 13px;">probitian.ai.studio</a></p>`
  },
  {
    id: 'manufacturing_oee',
    name: 'Manufacturing Plant OEE & Scrap Costing Audit',
    subject: 'Optimizing Plant OEE & Scrap Reduction at {{company_name}}',
    preheader: 'Eliminate manual Excel MIS reports with automated Power BI dashboards',
    content: `<p>Dear {{contact_person}},</p>
<p>Reaching out to you regarding plant operations and production intelligence at <strong>{{company_name}}</strong> in {{location}}.</p>
<p>Manufacturing leaders in {{industry}} frequently spend hours reconciling manual shift logs and daily Excel MIS spreadsheets. We help operations heads automate this entire workflow directly in Power BI.</p>
<h2>⚙️ Real-Time Plant Analytics Scope:</h2>
<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 6px;">
  <p style="margin: 0; font-weight: 600; color: #14532d;">Focus Area: {{powerbi_use_case}}</p>
</div>
<ul>
  <li><strong>Hourly Machine OEE & Downtime Tracking:</strong> Identify bottlenecks before they hurt weekly output.</li>
  <li><strong>Scrap & Rework Cost Analytics:</strong> Track batch variance and defect root causes in real-time.</li>
  <li><strong>Shop Floor Power BI Display:</strong> Live TV dashboards on the plant floor for shift supervisors.</li>
</ul>
<p>I would love to share a 5-minute interactive video demo showing how similar manufacturing plants automated their MIS.</p>
<p style="text-align: center; margin: 28px 0;">
  <a href="https://probitian.ai.studio/projects" style="background-color: #0f172a; color: #f59e0b; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; border: 1px solid #f59e0b;">View Manufacturing Case Studies &rarr;</a>
</p>
<p>Warm regards,<br />
<strong>Shivam</strong><br />
Lead Power BI Architect | ProBitian<br />
<span style="color: #64748b; font-size: 13px;">Direct: <a href="https://probitian.ai.studio/contact" style="color: #7c3aed;">Contact Us</a> | <a href="https://probitian.ai.studio/" style="color: #7c3aed;">probitian.ai.studio</a></span></p>`
  },
  {
    id: 'cfo_financial_deck',
    name: 'CFO & Financial BI Reporting Automation',
    subject: 'Financial Performance & Cash Flow Intelligence for {{company_name}}',
    preheader: 'Automated P&L, Working Capital & Variance Analysis in Microsoft Power BI',
    content: `<p>Hi {{contact_person}},</p>
<p>As {{company_name}} continues to scale within {{industry}}, getting instant answers on cash flows, EBITDA margins, and budget variances is crucial.</p>
<p>We partner with financial directors and CFOs to replace month-end spreadsheet fatigue with dynamic, boardroom-ready Power BI reporting.</p>
<h2>📊 What We Deliver for {{company_name}}:</h2>
<div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 16px; margin: 20px 0; border-radius: 6px;">
  <p style="margin: 0; font-weight: 600; color: #713f12;">Requirement: {{powerbi_use_case}}</p>
</div>
<ul>
  <li><strong>Dynamic P&L and Balance Sheet:</strong> Drill down from high-level EBITDA to individual GL line items in 2 clicks.</li>
  <li><strong>Working Capital & Aging Analysis:</strong> Live overdue receivables and payable schedules with automated alerts.</li>
  <li><strong>Zero-Manual Reconciliation:</strong> Seamless connection with Tally, SAP, or QuickBooks.</li>
</ul>
<p>Could we set up a 10-minute introduction next Tuesday or Wednesday?</p>
<p style="text-align: center; margin: 28px 0;">
  <a href="https://probitian.ai.studio/contact" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Request Financial BI Demo &rarr;</a>
</p>
<p>Best regards,<br />
<strong>ProBitian BI Solutions Team</strong><br />
<a href="https://probitian.ai.studio/" style="color: #7c3aed;">probitian.ai.studio</a></p>`
  }
];

export const VARIABLE_TAGS: VariableTag[] = [
  { tag: '{{company_name}}', label: 'Company Name', desc: 'Target company name' },
  { tag: '{{contact_person}}', label: 'Contact Person', desc: 'Full name or greeting' },
  { tag: '{{industry}}', label: 'Industry', desc: 'Business domain' },
  { tag: '{{location}}', label: 'Location', desc: 'City or state' },
  { tag: '{{powerbi_use_case}}', label: 'Power BI Use Case', desc: 'Specific analytics need' },
  { tag: '{{phone}}', label: 'Phone', desc: 'Contact phone' },
  { tag: '{{linkedin}}', label: 'LinkedIn', desc: 'LinkedIn URL' }
];

export const DEFAULT_SAMPLE_LEAD: Partial<Lead> = {
  company_name: 'Tata Motors Commercial Vehicles',
  industry: 'Automotive Manufacturing',
  location: 'Pune, Maharashtra',
  contact_person: 'Amit Deshmukh',
  email: 'amit.deshmukh@tatamotors.com',
  phone: '+91 98220 11223',
  linkedin: 'https://linkedin.com/in/amit-deshmukh',
  powerbi_use_case: 'Plant Assembly Line OEE, Downtime Analysis & Scrap Costing Dashboard',
  lead_priority: 'High'
};
