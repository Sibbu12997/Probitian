# ProBitian — Media Library & Storage Documentation

Official Specification for the Media Asset Management Architecture in ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  
Official X: [https://x.com/Probitian](https://x.com/Probitian) (@Probitian)  
Official LinkedIn: [https://www.linkedin.com/company/probitian/](https://www.linkedin.com/company/probitian/)  

---

## 1. Overview & Storage Engine

The ProBitian Media Library Engine manages all website images, logos, banners, blog cover photos, project screenshots, thumbnails, and downloadable PDF cheat sheets.

- **Primary Storage**: **Supabase Storage** bucket named `probitian-media` configured with public read access.
- **Metadata Database**: Supabase PostgreSQL table `public.media`.

---

## 2. Storage Folder Directory Structure

Assets in `probitian-media` are organized into categorical subfolders:

- `logos/`: Platform brand logos and header graphics.
- `banners/`: Site banners and hero background images.
- `blog/`: Cover images and inline graphics for technical articles.
- `projects/`: Screenshots and dataset previews for portfolio projects.
- `courses/`: Course cover graphics and downloadable PDF guides.
- `youtube/`: Video thumbnail assets.
- `general/`: General media assets.

---

## 3. Upload Workflow & Security Pipeline

```
ADMIN PORTAL (/admin → Media Library)
        ↓
Select File (PNG, JPG, WebP, SVG, PDF)
        ↓
POST /api/cms/media/upload (Express Upload API)
        ↓
Validation: File Size Check (Max 15MB) & Mime-Type Verification
        ↓
SVG Security Check: DOMPurify Sanitization (if SVG file)
        ↓
Filename Sanitization & Storage Path Generation
        ↓
Upload Buffer to Supabase Storage (`probitian-media` bucket)
        ↓
Retrieve Permanent Public Storage URL
        ↓
Insert Metadata Record into Supabase PostgreSQL `public.media`
        ↓
Return Asset Metadata & Public URL to Admin UI
```

---

## 4. Key Media Management Rules

1. **Maximum File Size**: 15 MB per file.
2. **Supported Mime Types**: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, `application/pdf`.
3. **Filename Sanitization**: Special characters, spaces, directory traversals (`../`), and non-ASCII characters are stripped or converted to safe snake_case identifiers.
4. **SVG DOMPurify Sanitization**: All uploaded SVG files are sanitized server-side prior to storage to strip `<script>` tags, inline `onload/onerror` JavaScript handlers, and malicious XML entities.
5. **Asset Reuse**: Media uploaded to the Media Library can be selected directly when editing Branding (Logo & Banner), Projects, Blog Articles, or Course Curriculum modules, avoiding duplicate file uploads.

---

## 5. Selection & Bulk Management Architecture

The Admin Media Library interface provides enterprise-grade asset curation with single and multiple selection controls:

- **Single & Multi-Select:** Clicking media cards or selection checkboxes dynamically adds/removes items from an active `selectedIds` state set.
- **Select All / Deselect All:** Header controls allow instant toggling of all currently filtered media items with an active counter (`X items selected`).
- **Bulk Action Bar:** When one or more items are selected, a floating/header action toolbar enables batch operations, including **Bulk Delete** and quick clearing of selections.
- **State Preservation on Error:** If any single deletion or bulk operation fails (e.g. network timeout or blocked by active references), the user's active selection is preserved non-destructively so the administrator does not lose their working context.

---

## 6. Pre-Deletion Referential Integrity & Usage Checks

To prevent broken images or missing downloads across the public website:
- **Reference Pre-Check (`GET /api/cms/media/:id/usage`):** Prior to deletion, the backend inspects all database tables and content columns for active URL or filename references:
  - **Site Settings & Branding:** `site_logo`, `site_banner`, `favicon_url`.
  - **Blog Articles:** `cover_image` and inline markdown/HTML content references.
  - **Portfolio Projects:** `cover_image`, `dataset_url`, live demo previews.
  - **Course Curriculum:** `cover_image`, `pdf_url`, practice dataset files.
  - **Founder & CEO Message:** `photo_url` and signature graphics.
  - **CMS Pages & Sections:** Content body URLs.
- **Deletion Prevention / Warning:** If an asset is actively referenced, the backend rejects deletion or presents a warning modal listing every referencing page/entity, requiring explicit confirmation or reference reassignment.
- **Bulk Deletion (`POST /api/cms/media/bulk-delete`):** Validates all selected media IDs in batch, checks referential usage, deletes unreferenced storage objects from `probitian-media`, deletes metadata records from `public.media`, and returns a detailed summary of successful and blocked items.

---

## 7. Single & Bulk Deletion Flow

```
Admin clicks "Delete" on single item OR selects multiple items & clicks "Bulk Delete"
        ↓
Frontend calls GET /api/cms/media/:id/usage (or batch usage check)
        ↓
Usage detected?
  ├── YES: Show confirmation modal with warning and list of referencing content
  └── NO: Show standard confirmation dialog
        ↓
Admin confirms deletion in modal dialog
        ↓
Server executes DELETE /api/cms/media/:id or POST /api/cms/media/bulk-delete
        ├── Storage removal: Removes file object from `probitian-media` bucket
        └── Database removal: Deletes metadata row from `public.media` table
        ↓
Success: Removes item(s) from UI and clears selection
Failure: Displays descriptive error alert; selection state remains intact
```

---

## 8. Server Environment Configuration

- **Bucket Name**: `probitian-media`
- **Public URL Format**: `https://{project-ref}.supabase.co/storage/v1/object/public/probitian-media/{category}/{filename}`
- **Credentials**: Handled server-side using `SUPABASE_SECRET_KEY` (never exposed in client code or public docs).

---

*Documentation maintained by Shivam Singh — ProBitian.*
