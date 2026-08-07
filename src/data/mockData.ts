import { FeatureCardItem, ProjectItem, BlogArticle, YouTubeVideo, LearnTopic, WhyCardItem } from '../types';

export const FEATURE_CARDS: FeatureCardItem[] = [
  {
    id: 'power-bi',
    title: 'Power BI',
    shortDescription: 'Build interactive, executive-grade dashboards, data models, and automated reporting systems.',
    iconName: 'BarChart3',
    badge: 'Popular',
    color: '#F59E0B'
  },
  {
    id: 'sql',
    title: 'SQL',
    shortDescription: 'Master complex queries, joins, window functions, and database query optimization for fast insights.',
    iconName: 'Database',
    badge: 'Core Skill',
    color: '#3B82F6'
  },
  {
    id: 'excel',
    title: 'Excel',
    shortDescription: 'Go beyond basics with advanced lookup formulas, dynamic array functions, and financial modeling.',
    iconName: 'Table',
    badge: 'Essential',
    color: '#10B981'
  },
  {
    id: 'power-query',
    title: 'Power Query',
    shortDescription: 'Automate data extraction, cleaning, and complex ETL transformations without writing complex code.',
    iconName: 'Filter',
    badge: 'ETL Power',
    color: '#8B5CF6'
  },
  {
    id: 'ai-tools',
    title: 'AI Tools',
    shortDescription: 'Leverage ChatGPT, Copilot, and AI assistants to speed up DAX generation, SQL writing, and narrative reports.',
    iconName: 'BrainCircuit',
    badge: 'Next Gen',
    color: '#EC4899'
  },
  {
    id: 'career-guidance',
    title: 'Career Guidance',
    shortDescription: 'Resume teardowns, portfolio building, mock interviews, and actionable tips to land high-paying BI roles.',
    iconName: 'GraduationCap',
    badge: 'Career Boost',
    color: '#6C63FF'
  }
];

export const PROJECTS: ProjectItem[] = [
  {
    id: 'crm-dashboard',
    title: 'CRM Dashboard',
    category: 'Sales & Operations',
    description: 'Executive overview tracking lead conversion rates, sales pipelines, customer acquisition cost (CAC), and retention metrics.',
    fullDescription: 'This CRM Dashboard provides a 360-degree view of customer lifecycles. It connects SQL transaction logs with Power BI dataflows to track pipeline velocity, sales rep performance, stage-by-stage deal drops, and churn prediction models.',
    toolsUsed: ['Power BI', 'SQL', 'Power Query', 'DAX'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Pipeline Value', value: '$4.2M', change: '+18.4%' },
      { label: 'Win Rate', value: '32.6%', change: '+3.2%' },
      { label: 'Avg Deal Size', value: '$18.5K', change: '+5.1%' }
    ],
    featured: true
  },
  {
    id: 'sales-dashboard',
    title: 'Sales Dashboard',
    category: 'Retail & E-commerce',
    description: 'Real-time revenue monitoring with product category breakdown, regional heatmaps, and MoM growth trajectories.',
    fullDescription: 'A dynamic multi-page Sales Intelligence dashboard built for retail executives. Features drill-through capabilities from regional performance down to individual store SKUs, basket analysis, and target variance forecasting.',
    toolsUsed: ['Power BI', 'Excel', 'DAX', 'Power Query'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Total Revenue', value: '$24.8M', change: '+20.5%' },
      { label: 'Total Profit', value: '$4.3M', change: '+15.7%' },
      { label: 'Orders', value: '18,245', change: '+18.6%' }
    ],
    featured: true
  },
  {
    id: 'hr-dashboard',
    title: 'HR Analytics Dashboard',
    category: 'Human Resources',
    description: 'Workforce attrition forecasting, diversity analytics, recruitment funnel efficiency, and employee tenure trends.',
    fullDescription: 'Comprehensive People Analytics solution quantifying employee turnover drivers. Evaluates sentiment surveys, department attrition rates, time-to-hire metrics, and compensation benchmark ratios.',
    toolsUsed: ['Power BI', 'Excel', 'DAX'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Headcount', value: '1,420', change: '+8.2%' },
      { label: 'Attrition Rate', value: '7.4%', change: '-2.1%' },
      { label: 'Time to Hire', value: '24 Days', change: '-4 Days' }
    ],
    featured: true
  },
  {
    id: 'finance-dashboard',
    title: 'Finance Dashboard',
    category: 'Corporate Finance',
    description: 'P&L statement visualization, cash flow modeling, operational expense breakdowns, and EBITDA variance analysis.',
    fullDescription: 'Interactive Financial Statement dashboard that transforms flat trial balance sheets into dynamic P&L reports with waterfall charts, variance against budget, and working capital cash flow simulations.',
    toolsUsed: ['Power BI', 'SQL', 'DAX', 'Excel'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Net Profit Margin', value: '22.8%', change: '+1.8%' },
      { label: 'Operating Income', value: '$1.85M', change: '+12.3%' },
      { label: 'OpEx Ratio', value: '38.2%', change: '-2.5%' }
    ],
    featured: false
  },
  {
    id: 'marketing-dashboard',
    title: 'Marketing Dashboard',
    category: 'Digital Marketing',
    description: 'Multi-channel attribution modeling, ROAS tracking, campaign performance analysis, and web traffic funnels.',
    fullDescription: 'Unifies ad campaign data across Google Ads, Meta, and email marketing. Calculates true Customer Lifetime Value (LTV), blended Return on Ad Spend (ROAS), and cost-per-acquisition across digital channels.',
    toolsUsed: ['Power BI', 'Power Query', 'AI Tools', 'Excel'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Blended ROAS', value: '4.8x', change: '+0.6x' },
      { label: 'Ad Spend', value: '$120.5K', change: '+5.0%' },
      { label: 'Leads Generated', value: '3,840', change: '+24.1%' }
    ],
    featured: false
  },
  {
    id: 'inventory-dashboard',
    title: 'Inventory Dashboard',
    category: 'Supply Chain',
    description: 'Stock turn ratios, reorder point alerts, warehouse capacity utilization, and supplier lead-time optimization.',
    fullDescription: 'End-to-end Supply Chain and Stock Intelligence dashboard designed to minimize stockouts and holding costs. Implements ABC inventory classification and automated reorder triggers.',
    toolsUsed: ['Power BI', 'SQL', 'Power Query'],
    imagePlaceholder: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    kpis: [
      { label: 'Stock Turnover', value: '6.2x', change: '+0.8x' },
      { label: 'Stockout Frequency', value: '0.8%', change: '-1.4%' },
      { label: 'On-Time Delivery', value: '96.4%', change: '+2.1%' }
    ],
    featured: false
  }
];

export const YOUTUBE_VIDEOS: YouTubeVideo[] = [
  {
    id: 'pbi-mastery',
    title: 'Power BI Full Course for Beginners 2026 | Build Real Dashboards Step-by-Step',
    description: 'Learn Power BI from scratch! In this comprehensive tutorial, we cover data import, Power Query transformation, star schema modeling, essential DAX, and report design.',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    duration: '2h 15m',
    views: '45K views',
    url: 'https://youtube.com/@probitian'
  },
  {
    id: 'sql-joins-mastery',
    title: 'SQL Joins & Window Functions Explained with Real Business Examples',
    description: 'Stop guessing SQL joins! Master INNER, LEFT, RIGHT, FULL joins and CTEs alongside RANK(), DENSE_RANK(), and LAG/LEAD for data analyst interviews.',
    thumbnail: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80',
    duration: '45m',
    views: '32K views',
    url: 'https://youtube.com/@probitian'
  },
  {
    id: 'dax-time-intelligence',
    title: 'Master DAX Time Intelligence: YTD, YoY Growth, and Rolling Averages',
    description: 'Learn the most requested Power BI skill by employers. Build dynamic date tables, calculate Year-over-Year growth, and handle custom fiscal calendars.',
    thumbnail: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80',
    duration: '38m',
    views: '28K views',
    url: 'https://youtube.com/@probitian'
  }
];

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'top-10-dax-functions',
    title: 'Top 10 DAX Functions Every Data Analyst Must Master in 2026',
    excerpt: 'DAX is the muscle behind Power BI. Discover the 10 core DAX functions—including CALCULATE, ALL, SUMX, and SAMEPERIODLASTYEAR—with practical code snippets.',
    category: 'DAX',
    date: 'August 2, 2026',
    readTime: '6 min read',
    author: 'Shivam Baghel',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    content: `
# Top 10 DAX Functions Every Data Analyst Must Master in 2026

Data Analysis Expressions (DAX) is the formula language used in Power BI, Analysis Services, and Power Pivot. While there are hundreds of functions, mastering these 10 core DAX functions will handle 90% of business scenarios.

---

### 1. CALCULATE — The King of DAX
\`\`\`dax
Total Sales East = 
CALCULATE(
    SUM(Sales[Amount]),
    Customer[Region] == "East"
)
\`\`\`
\`CALCULATE\` evaluates an expression in a modified filter context. It is the single most essential function in Power BI.

---

### 2. ALL & ALLSELECTED — Overriding Filter Context
\`\`\`dax
% Contribution = 
DIVIDE(
    SUM(Sales[Amount]),
    CALCULATE(SUM(Sales[Amount]), ALL(Products))
)
\`\`\`
Use \`ALL\` to clear existing filters, allowing you to compute total benchmarks and percentage of totals cleanly.

---

### 3. SUMX — Iterating Table Expressions
\`\`\`dax
Total Revenue = 
SUMX(
    Sales,
    Sales[Quantity] * Sales[UnitPrice]
)
\`\`\`
Unlike simple \`SUM\`, \`SUMX\` evaluates the expression line-by-line across a table, ensuring accurate row-level calculations before aggregation.

---

### 4. SAMEPERIODLASTYEAR — YoY Calculations
\`\`\`dax
Sales Last Year = 
CALCULATE(
    [Total Revenue],
    SAMEPERIODLASTYEAR('Calendar'[Date])
)
\`\`\`
Effortlessly compute Year-over-Year benchmarks when paired with a contiguous Date table.

---

### Summary
Mastering these core functions transforms static reports into dynamic, intelligent business decisions. Keep practicing real dataset challenges on ProBItian!
    `
  },
  {
    id: 'sql-window-functions-guide',
    title: 'The Ultimate Guide to SQL Window Functions for Data Interviews',
    excerpt: 'Crack your next SQL interview! Master ROW_NUMBER(), RANK(), DENSE_RANK(), and NTILE() with clear diagrams and real query examples.',
    category: 'SQL',
    date: 'July 28, 2026',
    readTime: '8 min read',
    author: 'Shivam Baghel',
    imageUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80',
    content: `
# The Ultimate Guide to SQL Window Functions for Data Interviews

Window functions are heavily tested in SQL technical interviews at companies like Microsoft, Amazon, and Google. Unlike \`GROUP BY\`, window functions perform calculations across a set of table rows related to the current row without collapsing them into a single row.

---

### Syntax Overview
\`\`\`sql
SELECT 
    employee_id,
    department_id,
    salary,
    DENSE_RANK() OVER (
        PARTITION BY department_id 
        ORDER BY salary DESC
    ) AS salary_rank
FROM employees;
\`\`\`

---

### Key Window Functions to Know:
1. **ROW_NUMBER()**: Assigns a unique sequential integer to each row.
2. **RANK()**: Ranks rows with ties (skips numbers for ties).
3. **DENSE_RANK()**: Ranks rows with ties (does NOT skip numbers).
4. **LAG() & LEAD()**: Accesses data from preceding or following rows without self-joins.

Practicing window functions with partition clauses is essential for building robust analytics data pipelines.
    `
  },
  {
    id: 'power-query-etl-best-practices',
    title: 'Power Query Transformation Secrets: Clean Messy Data 10x Faster',
    excerpt: 'Stop cleaning Excel data manually. Learn M language tricks, unpivoting techniques, and custom columns to automate data preparation.',
    category: 'Power Query',
    date: 'July 15, 2026',
    readTime: '5 min read',
    author: 'Shivam Baghel',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    content: `
# Power Query Transformation Secrets: Clean Messy Data 10x Faster

Data cleaning consumes up to 80% of an analyst's time. Power Query is Microsoft's built-in ETL engine in Excel and Power BI designed to eliminate repetitive manual work.

---

### 1. Unpivot Columns Like a Pro
When data arrives in wide format (e.g. months across columns), select fixed identifier columns and choose **Unpivot Other Columns**. This creates clean, normalized tall tables instantly ready for star schemas.

---

### 2. Query Folding
Ensure your transformation steps (Filter, Select, Group By) push processing back to the SQL database server (Query Folding) rather than pulling raw millions of rows locally.

---

### 3. Buffer Tables for Performance
Use \`Table.Buffer()\` in M code when joining static reference tables repeatedly to dramatically speed up refresh times.
    `
  },
  {
    id: 'ai-tools-for-data-analysts',
    title: 'How to Use AI & ChatGPT as Your Personal Data Analytics Pair Programmer',
    excerpt: 'Boost your productivity as a data analyst. Write complex SQL CTEs, debug tricky DAX syntax, and generate presentation insights using AI.',
    category: 'AI',
    date: 'July 04, 2026',
    readTime: '7 min read',
    author: 'Shivam Baghel',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    content: `
# How to Use AI & ChatGPT as Your Personal Data Analytics Pair Programmer

AI is not replacing data analysts—data analysts who leverage AI are replacing those who don't. Learn how to prompt AI effectively for data workflows.

---

### Prompt Template for DAX Optimization
> *"Act as a Senior Power BI Developer. Review this DAX measure for performance bottlenecks. The model has 5 million rows in the Sales table..."*

### Automated Executive Summaries
Feed key aggregated KPI tables to AI models to generate structured executive bullet points, key takeaways, and strategic recommendations for presentation decks.
    `
  }
];

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: 'pbi-foundations',
    title: 'Power BI Masterclass: Zero to Hero',
    icon: 'BarChart3',
    level: 'Beginner',
    description: 'Complete hands-on pathway from connecting raw data sources to publishing polished executive reports.',
    modulesCount: 12,
    duration: '14 Hours',
    keyTakeaways: [
      'Understand Data Modeling & Star Schemas',
      'Master Power Query M Transformations',
      'Write Essential DAX Measures & Calculated Columns',
      'Design Apple & Linear inspired Dashboard Layouts'
    ],
    syllabus: [
      { title: 'Introduction to Business Intelligence & Power BI Desktop', duration: '45 mins', type: 'video' },
      { title: 'Connecting to Excel, SQL, and Web APIs', duration: '60 mins', type: 'video' },
      { title: 'Data Cleaning & Shaping in Power Query', duration: '90 mins', type: 'video' },
      { title: 'Data Modeling Principles & Star Schema Best Practices', duration: '90 mins', type: 'video' },
      { title: 'DAX Basics: SUM, CALCULATE, DIVIDE, and Filter Context', duration: '120 mins', type: 'video' },
      { title: 'Building Project 1: Executive Sales Dashboard', duration: '180 mins', type: 'project' }
    ]
  },
  {
    id: 'sql-analytics',
    title: 'SQL for Data Analytics & Business Intelligence',
    icon: 'Database',
    level: 'Intermediate',
    description: 'Master PostgreSQL and SQL Server queries, joins, aggregations, CTEs, and window functions.',
    modulesCount: 10,
    duration: '10 Hours',
    keyTakeaways: [
      'Write complex SELECT queries with multi-table JOINs',
      'Group and aggregate business data with HAVING clauses',
      'Master Common Table Expressions (CTEs) & Subqueries',
      'Apply Window Functions for cohort and YoY analyses'
    ],
    syllabus: [
      { title: 'SQL Fundamentals: SELECT, WHERE, ORDER BY, GROUP BY', duration: '60 mins', type: 'video' },
      { title: 'Multi-table JOINs: INNER, LEFT, RIGHT, and FULL OUTER', duration: '90 mins', type: 'video' },
      { title: 'Subqueries & CTEs for Complex Logic', duration: '120 mins', type: 'video' },
      { title: 'Window Functions: ROW_NUMBER, RANK, LAG, LEAD', duration: '120 mins', type: 'video' },
      { title: 'Building Project 2: Customer Churn SQL Analysis', duration: '150 mins', type: 'project' }
    ]
  },
  {
    id: 'excel-advanced',
    title: 'Advanced Excel & Financial Modeling',
    icon: 'Table',
    level: 'All Levels',
    description: 'Transform spreadsheets with XLOOKUP, INDEX/MATCH, Dynamic Arrays, and automated Pivot Tables.',
    modulesCount: 8,
    duration: '8 Hours',
    keyTakeaways: [
      'Replace VLOOKUP with resilient XLOOKUP and INDEX/MATCH',
      'Master Dynamic Array formulas (FILTER, UNIQUE, SORT)',
      'Build dynamic financial forecasting models',
      'Create interactive Excel dashboards with Slicers'
    ],
    syllabus: [
      { title: 'Modern Excel Lookup Functions & Formula Resiliency', duration: '60 mins', type: 'video' },
      { title: 'Dynamic Array Magic: FILTER, UNIQUE, SORT, SEQUENCE', duration: '90 mins', type: 'video' },
      { title: 'Pivot Tables, Calculated Fields, and Timeline Slicers', duration: '90 mins', type: 'video' },
      { title: 'Building Project 3: Dynamic Financial Statements Dashboard', duration: '120 mins', type: 'project' }
    ]
  },
  {
    id: 'dax-pro',
    title: 'DAX Deep Dive & Performance Optimization',
    icon: 'Cpu',
    level: 'Advanced',
    description: 'Conquer complex filter contexts, evaluation contexts, time intelligence, and DAX Studio tuning.',
    modulesCount: 9,
    duration: '9 Hours',
    keyTakeaways: [
      'Understand Row Context vs. Filter Context vs. Context Transition',
      'Master Advanced Time Intelligence functions',
      'Optimize slow measures using DAX Studio and VertiPaq Analyzer',
      'Implement Dynamic RLS (Row-Level Security)'
    ],
    syllabus: [
      { title: 'Deep Dive into CALCULATE & Context Transition', duration: '90 mins', type: 'video' },
      { title: 'Advanced Time Intelligence & Fiscal Calendars', duration: '120 mins', type: 'video' },
      { title: 'VertiPaq Engine & Memory Optimization', duration: '90 mins', type: 'video' },
      { title: 'Performance Tuning with DAX Studio', duration: '90 mins', type: 'project' }
    ]
  }
];

export const WHY_PROBITIAN_CARDS: WhyCardItem[] = [
  {
    id: 'practical-learning',
    title: 'Practical Learning',
    description: 'No boring theory. Every lesson is grounded in real-world business datasets and step-by-step problem solving.',
    iconName: 'Sparkles'
  },
  {
    id: 'industry-projects',
    title: 'Industry Projects',
    description: 'Build a impressive portfolio with end-to-end CRM, Sales, Finance, HR, and Supply Chain dashboard projects.',
    iconName: 'Briefcase'
  },
  {
    id: 'beginner-friendly',
    title: 'Beginner Friendly',
    description: 'Crystal-clear explanations, downloadable starter datasets, cheat sheets, and structured learning roadmaps.',
    iconName: 'HeartHandshake'
  },
  {
    id: 'career-focused',
    title: 'Career Focused',
    description: 'Resume advice, portfolio presentation, interview question breakdowns, and high-income skill development.',
    iconName: 'TrendingUp'
  }
];
