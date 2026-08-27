# ProBitian — SEO Architecture & Implementation Specification

This document details the search engine optimization (SEO) architecture, routing design, metadata engine, canonical URL strategy, structured data models, and crawler directives implemented in the ProBitian production application.

---

## 1. Production Domain & Canonical Strategy

The single authoritative production domain for all public indexing and canonical references is:

```
https://probitian.ai.studio/
```

### Canonical Normalization Rules
1. **Protocol & Host**: Every canonical URL strictly enforces `https://probitian.ai.studio`.
2. **Path Resolution**: Canonicals represent clean paths without trailing slashes (except root `/`), without URL parameters (`?utm_source=...`), and without URL hash fragments (`#`).
3. **Blog Article URLs**: Article canonicals resolve dynamically to `https://probitian.ai.studio/blog/<slug>`.
4. **Single Source of Truth**: The `<link rel="canonical">` element is updated dynamically via the `src/components/SEO.tsx` component and `src/lib/routing.ts` helper module.

---

## 2. Path-Based Routing Architecture

The client application operates using standard HTML5 Browser History (`pushState`/`popstate`) path routing instead of hash fragments (`/#/`).

### Public & Private Route Map
| Path | View Component | SEO Directives | Canonical URL |
|---|---|---|---|
| `/` | `src/pages/HomePage.tsx` | `index, follow` | `https://probitian.ai.studio/` |
| `/about` | `src/pages/AboutPage.tsx` | `index, follow` | `https://probitian.ai.studio/about` |
| `/projects` | `src/pages/ProjectsPage.tsx` | `index, follow` | `https://probitian.ai.studio/projects` |
| `/blog` | `src/pages/BlogPage.tsx` | `index, follow` | `https://probitian.ai.studio/blog` |
| `/blog/:slug` | `src/pages/BlogPage.tsx` / `BlogModal` | `index, follow` | `https://probitian.ai.studio/blog/:slug` |
| `/learn` | `src/pages/LearnPage.tsx` | `index, follow` | `https://probitian.ai.studio/learn` |
| `/contact` | `src/pages/ContactPage.tsx` | `index, follow` | `https://probitian.ai.studio/contact` |
| `/privacy` | `src/pages/PrivacyPage.tsx` | `index, follow` | `https://probitian.ai.studio/privacy` |
| `/terms` | `src/pages/TermsPage.tsx` | `index, follow` | `https://probitian.ai.studio/terms` |
| `/admin` | `src/pages/admin/*` | `noindex, nofollow` | Excluded from index |
| Nonexistent URLs | `src/pages/NotFoundPage.tsx` | `noindex, nofollow` (HTTP 404) | Excluded from index |

### Internal Link Discoverability
All internal navigation components (headers, footers, card previews, blog listings) use standard semantic `<a href="/path">` elements with client-side `e.preventDefault()` handlers. This allows web crawlers and Googlebot to discover and follow links naturally without requiring JavaScript execution.

---

## 3. Dynamic SEO Component Architecture (`src/components/SEO.tsx`)

The application employs a centralized `SEO.tsx` component that synchronizes all document head metadata on route changes:

### Key Managed Meta Tags
- **Document Title**: `<title>Page Title \| ProBItian</title>`
- **Meta Description**: `<meta name="description" content="..." />`
- **Robots Directives**: `<meta name="robots" content="index, follow" />` (switches to `noindex, nofollow` on `/admin` and 404 pages)
- **Canonical Link**: `<link rel="canonical" href="https://probitian.ai.studio/..." />`
- **Open Graph Protocol**:
  - `og:site_name`: `ProBItian`
  - `og:type`: `website` (or `article` for blog posts)
  - `og:title`: Contextual title
  - `og:description`: Contextual summary
  - `og:url`: Exact canonical URL
  - `og:image`: High-resolution preview image (with fallback)
- **Twitter / X Cards**:
  - `twitter:card`: `summary_large_image`
  - `twitter:title`: Contextual title
  - `twitter:description`: Contextual summary
  - `twitter:image`: Preview image URL

---

## 4. Structured Data (JSON-LD) Schemas

Dynamic JSON-LD scripts are embedded in the document `<head>` on relevant pages:

### 1. `EducationalOrganization` Schema (Global)
```json
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "ProBItian",
  "url": "https://probitian.ai.studio",
  "logo": "https://dlaehchzzkjsrarktfsf.supabase.co/storage/v1/object/public/probitian-media/general/1786857432327-d4d5d41a-probitian_logo.svg",
  "sameAs": [
    "https://youtube.com/@probitian",
    "https://instagram.com/probitian",
    "https://facebook.com/probitian",
    "https://github.com/probitian",
    "https://x.com/Probitian",
    "https://www.linkedin.com/company/probitian/"
  ],
  "description": "Enterprise Business Intelligence, Power BI, SQL, DAX, and Data Analytics education platform.",
  "founder": {
    "@type": "Person",
    "name": "Shivam Singh"
  }
}
```

### 2. `WebSite` Schema (Homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ProBItian",
  "url": "https://probitian.ai.studio",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://probitian.ai.studio/blog?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### 3. `BreadcrumbList` Schema (Navigated Pages)
Generates structured breadcrumb trails for sub-pages (`Home > Blog > Article Name`).

### 4. `BlogPosting` Schema (Blog Articles)
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Mastering Advanced DAX Calculation Groups in Power BI Desktop",
  "description": "Step-by-step tutorial on creating DAX calculation groups...",
  "image": "https://images.unsplash.com/...",
  "author": {
    "@type": "Person",
    "name": "Shivam Singh"
  },
  "publisher": {
    "@type": "Organization",
    "name": "ProBItian"
  },
  "datePublished": "2026-08-15",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://probitian.ai.studio/blog/mastering-advanced-dax-calculation-groups"
  }
}
```

---

## 5. Crawler Directives & Server Endpoints

### 1. `robots.txt` (`/robots.txt`)
Directly served via Express route:
```text
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://probitian.ai.studio/sitemap.xml
```

### 2. Dynamic XML Sitemap (`/sitemap.xml`)
Served via Express endpoint (`/sitemap.xml`), dynamically pulling published articles from the Supabase `blogs` table with fallback to verified core published articles:
- Excludes `/admin` and internal `/api/*` endpoints.
- Excludes draft/unpublished content (`status != 'published'`).
- Assigns priority `1.0` to Homepage, `0.9` to Course & Project hubs, `0.8` to Published Articles, and `0.4` to Legal policies.

---

## 6. HTTP 404 Status Handling & Soft-404 Prevention

To avoid search engine soft-404 penalties, Express validates requested pathnames against known SPA routes. 

1. **Valid Routes** (`/`, `/about`, `/projects`, `/blog`, `/blog/:slug`, `/learn`, `/contact`, `/privacy`, `/terms`, `/admin`):
   - Server returns **`HTTP 200 OK`** + `index.html`.
2. **Invalid Routes** (`/this-page-does-not-exist`):
   - Server returns **`HTTP 404 Not Found`** + `index.html`.
   - React mounts `NotFoundPage.tsx` and applies `<meta name="robots" content="noindex, nofollow" />`.
