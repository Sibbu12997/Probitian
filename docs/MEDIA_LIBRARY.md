# ProBitian — Media Library & Storage Documentation

Official Specification for the Media Asset Management Architecture in ProBitian.

Project Owner: **Shivam Singh**  
Official Website: [https://probitian.ai.studio/](https://probitian.ai.studio/)  
Official Communication Email: [probitianofficial@gmail.com](mailto:probitianofficial@gmail.com)  

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
ADMIN PORTAL (#/admin → Media Library)
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

## 5. Media Deletion Flow

When an admin deletes a media file:
1. Express receives `DELETE /api/cms/media/:id`.
2. Validates media ID syntax (`isValidId`) and sanitizes storage path to prevent directory traversal or bucket escape.
3. The server removes the file object from Supabase Storage (`probitian-media` bucket).
4. The server deletes the corresponding metadata record from `public.media` in Supabase PostgreSQL.
5. On-screen feedback confirms successful removal.

---

## 6. Server Environment Configuration

- **Bucket Name**: `probitian-media`
- **Public URL Format**: `https://{project-ref}.supabase.co/storage/v1/object/public/probitian-media/{category}/{filename}`
- **Credentials**: Handled server-side using `SUPABASE_SECRET_KEY` (never exposed in client code or public docs).

---

*Documentation maintained by Shivam Singh — ProBitian.*
