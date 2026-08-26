import { FeatureCardItem, WhyCardItem, ProjectItem, BlogArticle, YouTubeVideo, LearnTopic } from '../types';

export const FEATURE_CARDS: FeatureCardItem[] = [
  {
    id: 'f-1',
    title: 'Power BI Mastery',
    shortDescription: 'Build executive-ready reports with advanced DAX, calculation groups, dynamic parameters, and enterprise star schemas.',
    iconName: 'BarChart3',
    badge: 'Flagship Track',
    color: 'amber'
  },
  {
    id: 'f-2',
    title: 'SQL for Analytics',
    shortDescription: 'Master complex joins, subqueries, CTEs, and window functions on real-world transactional databases.',
    iconName: 'Database',
    badge: 'Core Skill',
    color: 'purple'
  },
  {
    id: 'f-3',
    title: 'Advanced Excel & Power Query',
    shortDescription: 'Transform messy dataflows with automated Power Query M transformations and dynamic matrix modeling.',
    iconName: 'Table',
    badge: 'Productivity',
    color: 'emerald'
  },
  {
    id: 'f-4',
    title: 'ETL & Data Pipeline Design',
    shortDescription: 'Design scalable ETL architectures, query folding transformations, and automated refresh schedules.',
    iconName: 'Filter',
    badge: 'Data Pipeline',
    color: 'purple'
  },
  {
    id: 'f-5',
    title: 'AI-Powered BI Workflows',
    shortDescription: 'Integrate generative AI prompts, automated report summaries, and Copilot capabilities into your BI pipeline.',
    iconName: 'BrainCircuit',
    badge: 'Modern Tech',
    color: 'blue'
  },
  {
    id: 'f-6',
    title: 'Career & Portfolio Mentorship',
    shortDescription: 'Step-by-step guidance to construct a standout GitHub and Power BI portfolio that lands senior analyst interviews.',
    iconName: 'GraduationCap',
    badge: 'Career Growth',
    color: 'indigo'
  }
];

export const WHY_PROBITIAN_CARDS: WhyCardItem[] = [
  {
    id: 'why-1',
    title: 'Hands-On Real Projects',
    description: 'Learn through production-grade datasets and actual business scenarios rather than abstract syntax drills.',
    iconName: 'Briefcase'
  },
  {
    id: 'why-2',
    title: 'Production Design Focus',
    description: 'Understand UI/UX principles for dashboards that executives and business stakeholders actually use and love.',
    iconName: 'BarChart3'
  },
  {
    id: 'why-3',
    title: 'Full Analytics Pipeline',
    description: 'Master the complete journey from raw SQL data extraction and Power Query ETL to DAX metrics and visual storytelling.',
    iconName: 'TrendingUp'
  },
  {
    id: 'why-4',
    title: 'Career & Portfolio Mentorship',
    description: 'Direct step-by-step guidance on creating a standout GitHub and Power BI portfolio to accelerate your analytics career.',
    iconName: 'GraduationCap'
  }
];

export const PROJECTS: ProjectItem[] = [
  {
    id: 'proj-1',
    title: 'Executive Sales & Revenue Cockpit',
    category: 'Power BI & DAX',
    description: 'Enterprise-grade executive sales intelligence dashboard featuring dynamic currency switching, calculation groups, and cohort churn analytics.',
    fullDescription: 'A full-scale Business Intelligence solution built for multi-regional retail enterprises. It connects to transactional SQL tables, implements a certified Kimball dimensional model, and leverages DAX time-intelligence calculation groups to compare YoY, MoM, and YTD performance across 10,000+ SKU combinations in sub-second response times.',
    toolsUsed: ['Power BI', 'DAX Studio', 'SQL Server', 'Tabular Editor'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Annual Revenue', value: '$48.2M', change: '+14.6% YoY' },
      { label: 'Gross Margin', value: '41.8%', change: '+2.4 bps' },
      { label: 'Active Customers', value: '184.2K', change: '+8.1%' }
    ],
    featured: true,
    published: true,
    githubUrl: 'https://github.com/probitian/sales-intelligence-powerbi',
    liveDemoUrl: 'https://app.powerbi.com/view?r=eyJrIjoiMDY0Mzg4Y2MtYWY4Ny00M2ExLTk5MDAtOGU1ODhiODJjNzZlIiwidCI6IjQzNWU4NTIzLWVkMDQtNDU0OC04NDYyLTgzYzYyMjU1MGQwMyJ9',
    youtubeUrl: 'https://youtube.com/@probitian'
  },
  {
    id: 'proj-2',
    title: 'Supply Chain Logistics & Warehouse Optimization',
    category: 'SQL & Power BI',
    description: 'Real-time operational dashboard monitoring OTIF (On-Time In-Full) delivery rates, freight costs, and inventory turnover metrics.',
    fullDescription: 'Designed to eliminate operational blind spots across global supply chains. Connects to ERP databases via optimized SQL queries and calculates safety stock levels, reorder triggers, supplier lead-time variances, and route cost efficiencies.',
    toolsUsed: ['PostgreSQL', 'Power BI', 'Power Query', 'Python'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'OTIF Fulfillment', value: '96.4%', change: '+3.2%' },
      { label: 'Inventory Holding', value: '$12.4M', change: '-8.5%' },
      { label: 'Avg Lead Time', value: '4.2 Days', change: '-1.1 Days' }
    ],
    featured: true,
    published: true,
    githubUrl: 'https://github.com/probitian/supply-chain-analytics-bi',
    liveDemoUrl: 'https://app.powerbi.com/view?r=eyJrIjoiMDY0Mzg4Y2MtYWY4Ny00M2ExLTk5MDAtOGU1ODhiODJjNzZlIiwidCI6IjQzNWU4NTIzLWVkMDQtNDU0OC04NDYyLTgzYzYyMjU1MGQwMyJ9'
  },
  {
    id: 'proj-3',
    title: 'Customer Lifetime Value & RFM Segmentation',
    category: 'SQL & DAX',
    description: 'Behavioral customer analytics model calculating Recency, Frequency, and Monetary scores to identify churn-risk cohorts.',
    fullDescription: 'Utilizes advanced SQL window functions (NTILE, DENSE_RANK) to categorize customer segments into Champions, Loyalists, At Risk, and Hibernating tiers. Visualized in Power BI with dynamic heatmaps and automated retention suggestions.',
    toolsUsed: ['SQL Server', 'Power BI', 'DAX', 'Excel'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Avg Order Value', value: '$142.50', change: '+12.3%' },
      { label: 'Repeat Rate', value: '58.2%', change: '+4.5%' },
      { label: 'Churn Prevention', value: '+$340K', change: '+19.8%' }
    ],
    featured: true,
    published: true,
    githubUrl: 'https://github.com/probitian/customer-rfm-analytics'
  },
  {
    id: 'proj-4',
    title: 'Financial Variance & P&L Statement Model',
    category: 'Power BI & Excel',
    description: 'Interactive financial P&L dashboard with automated budget-vs-actual variance waterfalls and drill-through general ledger audits.',
    fullDescription: 'Replaces static financial spreadsheets with a dynamic tabular model. Features custom matrix layouts, expandable chart of accounts, and automated DAX calculations for EBITDA, Operating Margin, and OPEX ratios.',
    toolsUsed: ['Power BI', 'Tabular Editor', 'DAX', 'Excel'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Operating Profit', value: '$8.6M', change: '+9.4% vs Budget' },
      { label: 'OPEX Ratio', value: '26.1%', change: '-1.8 bps' },
      { label: 'EBITDA Margin', value: '22.4%', change: '+3.1%' }
    ],
    featured: false,
    published: true,
    githubUrl: 'https://github.com/probitian/financial-pnl-powerbi'
  },
  {
    id: 'proj-5',
    title: 'HR Talent Acquisition & Workforce Attrition',
    category: 'Power BI & AI',
    description: 'Predictive people analytics dashboard tracking headcount trends, time-to-hire velocity, compensation equity, and attrition risks.',
    fullDescription: 'Enables People Operations leaders to analyze retention drivers, performance ratings distributions, salary benchmarking by department, and recruitment funnel bottlenecks across global teams.',
    toolsUsed: ['Power BI', 'Power Query', 'DAX', 'Python'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Annual Attrition', value: '7.8%', change: '-2.4%' },
      { label: 'Time to Hire', value: '28 Days', change: '-6 Days' },
      { label: 'Employee NPS', value: '74 / 100', change: '+8 pts' }
    ],
    featured: false,
    published: true,
    githubUrl: 'https://github.com/probitian/hr-analytics-dashboard'
  },
  {
    id: 'proj-6',
    title: 'Hospital Patient Flow & Clinical Bed Occupancy',
    category: 'SQL & Power BI',
    description: 'Healthcare operations command center tracking emergency room wait times, bed turnover rates, and clinical staffing ratios.',
    fullDescription: 'HIPAA-compliant reporting architecture processing daily hospital admissions, patient discharge velocities, department load factors, and readmission rates for clinical directors.',
    toolsUsed: ['SQL Server', 'Power BI', 'DAX Studio'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Bed Occupancy', value: '84.2%', change: 'Optimal Range' },
      { label: 'Avg ER Wait', value: '18 Mins', change: '-12 Mins' },
      { label: 'Readmit Rate', value: '4.1%', change: '-0.9%' }
    ],
    featured: false,
    published: true,
    githubUrl: 'https://github.com/probitian/healthcare-bi-dashboard'
  }
];

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'blog-1',
    title: 'Mastering Advanced DAX Calculation Groups in Power BI Desktop',
    slug: 'mastering-advanced-dax-calculation-groups',
    excerpt: 'Eliminate redundant measures and dynamically apply time-intelligence formulas (YoY, MoM, YTD) across all your Power BI model metrics with Calculation Groups and Tabular Editor.',
    content: `Calculation Groups in Power BI are one of the most powerful modeling capabilities introduced to the VertiPaq engine. Rather than writing dozens of nearly identical measures for every base metric (such as Total Sales YTD, Total Cost YTD, Total Margin YTD, Total Quantity YTD), Calculation Groups allow you to define the transformation logic once using SELECTEDMEASURE() and apply it dynamically across all existing measures.

## Why Calculation Groups Matter
In large enterprise models with 50+ base metrics, calculating time intelligence (CY, PY, YoY %, MoM %, YTD, MTD) traditionally meant writing 300+ separate measures. This caused:
- Model bloat and high maintenance overhead
- Inconsistent calculation rules across teams
- Cluttered field lists for report consumers

With Calculation Groups, you create a single dimension table containing Calculation Items. When a report user places this Calculation Item on a matrix column or slicer, the engine intercepts the measure evaluation and wraps it in your specified DAX calculation.

## Setting Up Calculation Groups with Tabular Editor
1. Open your Power BI model in **Tabular Editor 2 or 3**.
2. Navigate to **Tables**, right-click and select **Create New > Calculation Group**.
3. Name your Calculation Group (e.g., *Time Intelligence*).
4. Add Calculation Items:
   - **Current Period**: \`SELECTEDMEASURE()\`
   - **Prior Year (PY)**: \`CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Calendar'[Date]))\`
   - **YoY Growth**: \`VAR CurrentVal = SELECTEDMEASURE() VAR PriorVal = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Calendar'[Date])) RETURN CurrentVal - PriorVal\`
   - **YoY %**: \`VAR CurrentVal = SELECTEDMEASURE() VAR PriorVal = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Calendar'[Date])) RETURN DIVIDE(CurrentVal - PriorVal, PriorVal, 0)\`
5. Set the **Format String Expression** for percentage items to \`"0.0%"\`.
6. Save changes back to Power BI Desktop and click **Refresh Now**.

## Key Takeaway
Calculation Groups drastically reduce model footprint, improve DAX maintainability, and empower self-service BI users with clean, flexible reporting interfaces.`,
    category: 'DAX',
    date: 'August 15, 2026',
    readTime: '6 min read',
    author: 'Shivam Singh',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    tags: ['Power BI', 'DAX', 'Calculation Groups', 'Tabular Editor', 'Data Modeling'],
    status: 'published',
    metaTitle: 'Mastering Advanced DAX Calculation Groups in Power BI | ProBItian',
    metaDescription: 'Step-by-step tutorial on creating DAX calculation groups in Power BI with Tabular Editor to eliminate duplicate time intelligence measures.'
  },
  {
    id: 'blog-2',
    title: 'Essential SQL Window Functions Every Business Intelligence Analyst Must Know',
    slug: 'essential-sql-window-functions-bi-analysts',
    excerpt: 'Master ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, and rolling aggregate windows to perform advanced transactional analysis right in the database layer.',
    content: `Window functions are among the most essential tools in any data analyst's SQL toolkit. Unlike traditional GROUP BY aggregate queries that collapse multiple rows into a single summary row, window functions calculate values across a set of rows while preserving each individual row's identity.

## Core Window Function Categories
1. **Ranking Functions**: \`ROW_NUMBER()\`, \`RANK()\`, \`DENSE_RANK()\`, \`NTILE()\`
2. **Value Functions**: \`LAG()\`, \`LEAD()\`, \`FIRST_VALUE()\`, \`LAST_VALUE()\`
3. **Aggregate Window Functions**: \`SUM() OVER (...)\`, \`AVG() OVER (...)\`, \`COUNT() OVER (...)\`

## 1. Comparing MoM Performance with LAG()
To calculate month-over-month revenue variance directly in SQL:
\`\`\`sql
SELECT 
    order_month,
    monthly_revenue,
    LAG(monthly_revenue, 1) OVER (ORDER BY order_month) AS prev_month_revenue,
    ROUND(
        (monthly_revenue - LAG(monthly_revenue, 1) OVER (ORDER BY order_month)) * 100.0 / 
        LAG(monthly_revenue, 1) OVER (ORDER BY order_month), 
        2
    ) AS mom_growth_pct
FROM monthly_sales_summary;
\`\`\`

## 2. Segmenting Top Customers with DENSE_RANK() & NTILE()
\`\`\`sql
WITH customer_spending AS (
    SELECT 
        customer_id,
        SUM(order_total) AS lifetime_spend,
        NTILE(4) OVER (ORDER BY SUM(order_total) DESC) AS spend_quartile
    FROM orders
    GROUP BY customer_id
)
SELECT * FROM customer_spending WHERE spend_quartile = 1;
\`\`\`

## Summary
Performing these complex calculations at the database tier optimizes Power BI data ingestion speeds and keeps your BI data models lean and fast.`,
    category: 'SQL',
    date: 'August 10, 2026',
    readTime: '8 min read',
    author: 'Shivam Singh',
    imageUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
    tags: ['SQL', 'Window Functions', 'Data Analytics', 'PostgreSQL', 'Query Optimization'],
    status: 'published',
    metaTitle: 'Essential SQL Window Functions for BI Analysts | ProBItian',
    metaDescription: 'Learn how to use SQL window functions like ROW_NUMBER, LAG, LEAD, and NTILE to perform powerful analytical calculations on transactional data.'
  },
  {
    id: 'blog-3',
    title: 'Power Query M Optimization: 7 Best Practices for Fast Dataflows & Datasets',
    slug: 'power-query-m-optimization-dataflows',
    excerpt: 'Speed up slow Power Query refreshes, protect Query Folding, eliminate redundant steps, and optimize memory buffers for high-volume ETL pipelines.',
    content: `Slow Power Query refreshes are the #1 bottleneck for Business Intelligence developers. When data transformation steps prevent Query Folding, Power BI is forced to pull millions of raw rows across the network and execute transformations in memory on your local machine.

## 7 Rules for High-Performance Power Query
1. **Preserve Query Folding at all costs**: Perform filters, column selections, joins, and group-bys before non-folding steps (like custom column indexing or text transforms).
2. **Remove unused columns at the very first step**: Never carry 80 columns into memory when your visual only requires 8.
3. **Avoid referencing full tables inside Table.AddColumn()**: Use buffered record lookups or native SQL joins instead.
4. **Buffer small reference dimensions**: Wrap lookup tables in \`Table.Buffer()\` when executing repeated loops.
5. **Use DateTime instead of separate Date and Time columns in relational sources** to preserve index seek capabilities.
6. **Disable background data preview loading** in Power BI Desktop options during report authoring.
7. **Perform complex multi-table ETL transformations in Dataflows** so they can be reused across multiple downstream datasets.

## Verification Technique
Always right-click transformation steps in the Applied Steps list and check if **View Native Query** is active. If it is active, the engine has folded the step into a clean SQL query!`,
    category: 'Power Query',
    date: 'August 4, 2026',
    readTime: '7 min read',
    author: 'Shivam Singh',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    tags: ['Power Query', 'ETL', 'Power BI', 'M Language', 'Performance Tuning'],
    status: 'published',
    metaTitle: 'Power Query M Optimization & Query Folding Guide | ProBItian',
    metaDescription: 'Discover the top 7 best practices for optimizing Power Query M transformations, ensuring query folding, and speeding up dataset refresh times.'
  },
  {
    id: 'blog-4',
    title: 'Designing Executive BI Dashboards: Visual Hierarchy & Cognitive Load Principles',
    slug: 'designing-executive-bi-dashboards-visual-hierarchy',
    excerpt: 'How to structure business intelligence dashboards using the Z-pattern, consistent grid geometry, neutral color palettes, and focused KPI cards.',
    content: `The difference between a dashboard that gets ignored and one that drives strategic decisions comes down to visual hierarchy and cognitive load. Business stakeholders have only 5 seconds to extract meaning from your report.

## The 5 Rules of Executive BI UI Design
- **Top-to-Bottom, Left-to-Right (Z-Pattern)**: Place high-level headline KPIs in the top row, key operational trends in the center, and granular breakdown tables at the bottom.
- **Strict Color Intentionality**: Use muted neutrals (grays and deep slates) for structural elements, and reserve bright accent colors (like purple, emerald, or amber) strictly for meaningful data highlights or variance alerts.
- **Consistent Grid Spacing**: Align all cards with 16px padding and unified corner radii.
- **Contextual Comparisons**: Never show a raw number without context (include YoY change, target budget, or sparklines).
- **Zero Chartjunk**: Remove unnecessary 3D effects, heavy gridlines, and repetitive axis titles.`,
    category: 'Power BI',
    date: 'July 28, 2026',
    readTime: '5 min read',
    author: 'Shivam Singh',
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
    tags: ['Dashboard Design', 'UI/UX', 'Power BI', 'Data Visualization', 'Executive Reporting'],
    status: 'published',
    metaTitle: 'Designing Executive BI Dashboards: Visual Hierarchy | ProBItian',
    metaDescription: 'Master the UI/UX design principles that transform complex datasets into clear, actionable executive Business Intelligence dashboards.'
  }
];

export const YOUTUBE_VIDEOS: YouTubeVideo[] = [
  {
    id: 'yt-1',
    title: 'Complete Power BI Full Course 2026: From Zero to Executive Dashboard',
    description: 'Learn end-to-end Business Intelligence with Power BI Desktop, Power Query ETL, DAX formulas, Star Schema data modeling, and interactive visualization.',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    duration: '2h 45m',
    views: '42K views',
    url: 'https://youtube.com/@probitian',
    youtubeId: 'probitian-powerbi-full-course'
  },
  {
    id: 'yt-2',
    title: 'SQL for Data Analytics: Master Joins, Aggregations & Window Functions',
    description: 'Practical SQL tutorial solving real-world business queries with PostgreSQL, covering CTEs, window functions, and indexing strategies.',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80',
    duration: '1h 50m',
    views: '28K views',
    url: 'https://youtube.com/@probitian',
    youtubeId: 'probitian-sql-mastery'
  },
  {
    id: 'yt-3',
    title: 'Top 10 Advanced DAX Formulas Every Power BI Developer Must Know',
    description: 'Deep dive into CALCULATE filter context modifications, ALLSELECTED, KEEPFILTERS, USERELATIONSHIP, and dynamic time-intelligence patterns.',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    duration: '52m',
    views: '35K views',
    url: 'https://youtube.com/@probitian',
    youtubeId: 'probitian-advanced-dax'
  }
];

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: 'course-1',
    title: 'Power BI Enterprise Mastery',
    slug: 'power-bi-enterprise-mastery',
    icon: 'BarChart3',
    level: 'All Levels',
    description: 'Master enterprise Power BI development from data ingestion and star-schema dimensional modeling to advanced DAX, Calculation Groups, and Service governance.',
    modulesCount: 12,
    duration: '18 Hours',
    keyTakeaways: [
      'Build scalable Kimball Star Schema models',
      'Master CALCULATE filter context and time-intelligence DAX',
      'Create dynamic calculation groups with Tabular Editor',
      'Design modern, accessible executive dashboard interfaces',
      'Implement Row-Level Security (RLS) and Power BI Service workspaces'
    ],
    syllabus: [
      { title: 'Module 1: Introduction to Modern BI & VertiPaq Engine', duration: '1.5h', type: 'video' },
      { title: 'Module 2: Power Query ETL & Query Folding Best Practices', duration: '2.5h', type: 'video' },
      { title: 'Module 3: Star Schema Dimensional Modeling & Relationships', duration: '2h', type: 'video' },
      { title: 'Module 4: DAX Fundamentals & Filter Context Mastery', duration: '3h', type: 'video' },
      { title: 'Module 5: Calculation Groups & Advanced Time Intelligence', duration: '2.5h', type: 'video' },
      { title: 'Module 6: Capstone Executive Sales BI Dashboard Project', duration: '3.5h', type: 'project' },
      { title: 'Module 7: Power BI Service Deployment, RLS & Governance', duration: '3h', type: 'video' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://youtube.com/@probitian',
    category: 'Power BI',
    published: true
  },
  {
    id: 'course-2',
    title: 'SQL for Business Intelligence & Analytics',
    slug: 'sql-business-intelligence-analytics',
    icon: 'Database',
    level: 'All Levels',
    description: 'From relational schema design to complex analytical queries, master the database queries required to extract, aggregate, and transform business data.',
    modulesCount: 10,
    duration: '14 Hours',
    keyTakeaways: [
      'Write optimized multi-table JOINs and Subqueries',
      'Master Common Table Expressions (CTEs) for readable ETL logic',
      'Perform advanced window function calculations (RANK, LAG, NTILE)',
      'Analyze query execution plans and create optimal indexes',
      'Integrate SQL data pipelines directly into Power BI and Python'
    ],
    syllabus: [
      { title: 'Module 1: Relational Database Architecture & SQL Basics', duration: '1.5h', type: 'video' },
      { title: 'Module 2: Complex JOINs, Aggregations & Grouping Sets', duration: '2h', type: 'video' },
      { title: 'Module 3: CTEs, Subqueries & Temp Tables', duration: '2h', type: 'video' },
      { title: 'Module 4: SQL Window Functions Deep-Dive', duration: '3h', type: 'video' },
      { title: 'Module 5: Performance Tuning, Indexing & Query Execution Plans', duration: '2.5h', type: 'video' },
      { title: 'Module 6: Capstone Customer Retention & Cohort SQL Project', duration: '3h', type: 'project' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://youtube.com/@probitian',
    category: 'SQL',
    published: true
  },
  {
    id: 'course-3',
    title: 'Advanced Excel & Power Query Automation',
    slug: 'advanced-excel-power-query',
    icon: 'Table',
    level: 'Intermediate',
    description: 'Transform spreadsheet workflows with dynamic array formulas (XLOOKUP, FILTER, LAMBDA) and automated Power Query data pipelines.',
    modulesCount: 8,
    duration: '10 Hours',
    keyTakeaways: [
      'Master Dynamic Array formulas (FILTER, UNIQUE, SORT, SEQUENCE)',
      'Create reusable custom functions using LAMBDA and LET',
      'Automate repetitive file consolidation with Power Query',
      'Build dynamic financial matrix models and scenario sensitivity tables'
    ],
    syllabus: [
      { title: 'Module 1: Modern Excel Engine & Dynamic Arrays', duration: '1.5h', type: 'video' },
      { title: 'Module 2: Advanced Lookups & Matrix Calculations', duration: '2h', type: 'video' },
      { title: 'Module 3: Power Query ETL for Multi-Sheet Consolidation', duration: '2.5h', type: 'video' },
      { title: 'Module 4: Financial Statement Modeling Project', duration: '4h', type: 'project' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://youtube.com/@probitian',
    category: 'Excel',
    published: true
  },
  {
    id: 'course-4',
    title: 'Advanced DAX & Tabular Modeling Pro',
    slug: 'advanced-dax-tabular-modeling',
    icon: 'Cpu',
    level: 'Advanced',
    description: 'Deep dive into VertiPaq internal storage structures, advanced filter context modification, calculation groups, and performance tuning with DAX Studio.',
    modulesCount: 9,
    duration: '12 Hours',
    keyTakeaways: [
      'Master row context vs filter context transition mechanisms',
      'Optimize complex measures using DAX Studio and Server Timings',
      'Create enterprise calculation groups for dynamic measure formatting',
      'Implement semi-additive measures and custom financial calendars'
    ],
    syllabus: [
      { title: 'Module 1: VertiPaq Storage Engine & Relationship Internals', duration: '2h', type: 'video' },
      { title: 'Module 2: Advanced CALCULATE, ALLSELECTED & KEEPFILTERS', duration: '2.5h', type: 'video' },
      { title: 'Module 3: Calculation Groups & Tabular Editor Scripting', duration: '2h', type: 'video' },
      { title: 'Module 4: Performance Profiling with DAX Studio & SE Engine', duration: '2.5h', type: 'video' },
      { title: 'Module 5: Capstone Financial Reporting DAX Engine', duration: '3h', type: 'project' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://youtube.com/@probitian',
    category: 'DAX',
    published: true
  }
];
