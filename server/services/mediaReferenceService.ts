import { serverSupabase, readCmsData } from './supabase';

export class MediaReferenceCheckError extends Error {
  constructor(message: string, public readonly cause?: any) {
    super(message);
    this.name = 'MediaReferenceCheckError';
  }
}

export interface MediaReference {
  location: string;
  type: string;
  details: string;
}

export interface MediaItemLike {
  id: string;
  filename?: string;
  storage_path?: string;
  public_url?: string;
  url?: string;
}

/**
 * Extracts distinct, high-fidelity search tokens for matching references
 */
export function getMediaSearchTokens(media: MediaItemLike): string[] {
  const tokens = new Set<string>();

  if (media.public_url && media.public_url.trim().length > 3) {
    tokens.add(media.public_url.trim());
  }
  if (media.url && media.url.trim().length > 3) {
    tokens.add(media.url.trim());
  }
  if (media.storage_path && media.storage_path.trim().length > 3) {
    tokens.add(media.storage_path.trim());
    // Also extract uniquely prefixed filename from storage path (e.g. 1725519200_abc123_dashboard.png)
    const segments = media.storage_path.split('/');
    const basename = segments[segments.length - 1];
    if (basename && basename.length > 5) {
      tokens.add(basename);
    }
  }

  // Exact ID match for CMS blocks referencing media by ID
  if (media.id && media.id.trim().length > 5) {
    tokens.add(media.id.trim());
  }

  return Array.from(tokens);
}

/**
 * Checks if target string or serialized JSON contains any of the search tokens
 */
function containsAnyToken(target: any, tokens: string[]): boolean {
  if (!target || tokens.length === 0) return false;
  let text = '';
  if (typeof target === 'string') {
    text = target;
  } else if (typeof target === 'object') {
    try {
      text = JSON.stringify(target);
    } catch {
      return false;
    }
  } else {
    text = String(target);
  }

  for (const token of tokens) {
    if (text.includes(token)) {
      return true;
    }
  }
  return false;
}

/**
 * Scans all database tables and content models for references to a media item.
 * Supports both PostgreSQL Supabase and local dev/test fallback (readCmsData).
 */
export async function findMediaReferences(media: MediaItemLike): Promise<MediaReference[]> {
  const references: MediaReference[] = [];
  const tokens = getMediaSearchTokens(media);

  if (tokens.length === 0) {
    return references;
  }

  // 1. SUPABASE DATABASE AUTHORITATIVE CHECK (when configured)
  if (serverSupabase) {
    try {
      // Check Blogs / Articles
      const { data: blogs, error: blogsErr } = await serverSupabase
        .from('blogs')
        .select('id, title, featured_image, content, excerpt');
      if (blogsErr) {
        throw new MediaReferenceCheckError(`Database error checking blogs: ${blogsErr.message}`, blogsErr);
      }
      if (Array.isArray(blogs)) {
        for (const blog of blogs) {
          if (containsAnyToken(blog.featured_image, tokens)) {
            references.push({
              location: `Blog Post: "${blog.title || 'Untitled'}"`,
              type: 'blog_cover',
              details: 'Used as featured cover image'
            });
          } else if (containsAnyToken(blog.content, tokens)) {
            references.push({
              location: `Blog Post: "${blog.title || 'Untitled'}"`,
              type: 'blog_content',
              details: 'Referenced inside article content'
            });
          } else if (containsAnyToken(blog.excerpt, tokens)) {
            references.push({
              location: `Blog Post: "${blog.title || 'Untitled'}"`,
              type: 'blog_excerpt',
              details: 'Referenced inside article excerpt'
            });
          }
        }
      }

      // Check Projects
      const { data: projects, error: projectsErr } = await serverSupabase
        .from('projects')
        .select('id, title, image_url, gallery_urls, description, full_description');
      if (projectsErr) {
        throw new MediaReferenceCheckError(`Database error checking projects: ${projectsErr.message}`, projectsErr);
      }
      if (Array.isArray(projects)) {
        for (const project of projects) {
          if (containsAnyToken(project.image_url, tokens)) {
            references.push({
              location: `Project: "${project.title || 'Untitled'}"`,
              type: 'project_cover',
              details: 'Used as primary project image'
            });
          } else if (containsAnyToken(project.gallery_urls, tokens)) {
            references.push({
              location: `Project: "${project.title || 'Untitled'}"`,
              type: 'project_gallery',
              details: 'Included in project image gallery'
            });
          } else if (containsAnyToken(project.full_description || project.description, tokens)) {
            references.push({
              location: `Project: "${project.title || 'Untitled'}"`,
              type: 'project_content',
              details: 'Referenced inside project description'
            });
          }
        }
      }

      // Check Courses
      const { data: courses, error: coursesErr } = await serverSupabase
        .from('courses')
        .select('id, title, thumbnail, description, video_url, pdf_url');
      if (coursesErr) {
        throw new MediaReferenceCheckError(`Database error checking courses: ${coursesErr.message}`, coursesErr);
      }
      if (Array.isArray(courses)) {
        for (const course of courses) {
          if (containsAnyToken(course.thumbnail, tokens)) {
            references.push({
              location: `Course: "${course.title || 'Untitled'}"`,
              type: 'course_thumbnail',
              details: 'Used as course thumbnail'
            });
          } else if (containsAnyToken(course.video_url || course.pdf_url, tokens)) {
            references.push({
              location: `Course: "${course.title || 'Untitled'}"`,
              type: 'course_media',
              details: 'Used as course video or PDF resource'
            });
          } else if (containsAnyToken(course.description, tokens)) {
            references.push({
              location: `Course: "${course.title || 'Untitled'}"`,
              type: 'course_content',
              details: 'Referenced inside course description'
            });
          }
        }
      }

      // Check Videos
      const { data: videos, error: videosErr } = await serverSupabase
        .from('videos')
        .select('id, title, thumbnail, youtube_url, description');
      if (videosErr) {
        throw new MediaReferenceCheckError(`Database error checking videos: ${videosErr.message}`, videosErr);
      }
      if (Array.isArray(videos)) {
        for (const video of videos) {
          if (containsAnyToken(video.thumbnail, tokens)) {
            references.push({
              location: `Video: "${video.title || 'Untitled'}"`,
              type: 'video_thumbnail',
              details: 'Used as video thumbnail asset'
            });
          } else if (containsAnyToken(video.youtube_url, tokens)) {
            references.push({
              location: `Video: "${video.title || 'Untitled'}"`,
              type: 'video_url',
              details: 'Referenced in video URL'
            });
          }
        }
      }

      // Check Settings (home, founder_message, navigation, social_links, etc.)
      const { data: settings, error: settingsErr } = await serverSupabase
        .from('settings')
        .select('key, value');
      if (settingsErr) {
        throw new MediaReferenceCheckError(`Database error checking settings: ${settingsErr.message}`, settingsErr);
      }
      if (Array.isArray(settings)) {
        for (const setting of settings) {
          if (containsAnyToken(setting.value, tokens)) {
            let desc = `CMS Setting "${setting.key}"`;
            let type = 'cms_setting';
            if (setting.key === 'founder_message' || setting.key === 'founder') {
              desc = 'Founder Profile & Message Section';
              type = 'founder_content';
            } else if (setting.key === 'home') {
              desc = 'Homepage Banner & Hero Configuration';
              type = 'home_setting';
            } else if (setting.key === 'site_branding' || setting.key === 'branding') {
              desc = 'Site Branding & Logo Configuration';
              type = 'site_branding';
            }
            references.push({
              location: desc,
              type,
              details: `Active in ${setting.key} configuration`
            });
          }
        }
      }

      // Check Pages
      const { data: pages, error: pagesErr } = await serverSupabase
        .from('pages')
        .select('id, page_key, title, banner_url, feature_cards, testimonials, cta');
      if (pagesErr) {
        throw new MediaReferenceCheckError(`Database error checking pages: ${pagesErr.message}`, pagesErr);
      }
      if (Array.isArray(pages)) {
        for (const page of pages) {
          if (containsAnyToken(page.banner_url, tokens)) {
            references.push({
              location: `Page: "${page.title || page.page_key || 'Custom Page'}"`,
              type: 'page_banner',
              details: 'Used as page banner image'
            });
          } else if (containsAnyToken(page.feature_cards || page.testimonials || page.cta, tokens)) {
            references.push({
              location: `Page: "${page.title || page.page_key || 'Custom Page'}"`,
              type: 'page_content',
              details: 'Used in page dynamic components or content layout'
            });
          }
        }
      }

    } catch (err: any) {
      if (err instanceof MediaReferenceCheckError) {
        throw err;
      }
      throw new MediaReferenceCheckError(`Database exception during media reference scan: ${err?.message || String(err)}`, err);
    }
  }

  // 2. CMS DATA CHECK (Local cache / Test fixtures)
  try {
    const data = readCmsData();

    // Check Blogs
    if (Array.isArray(data.blogs)) {
      for (const blog of data.blogs) {
        if (containsAnyToken(blog.featured_image, tokens)) {
          references.push({
            location: `Blog Post: "${blog.title || 'Untitled'}"`,
            type: 'blog_cover',
            details: 'Used as featured cover image'
          });
        } else if (containsAnyToken(blog.content, tokens)) {
          references.push({
            location: `Blog Post: "${blog.title || 'Untitled'}"`,
            type: 'blog_content',
            details: 'Referenced inside article content'
          });
        }
      }
    }

    // Check Projects
    if (Array.isArray(data.projects)) {
      for (const project of data.projects) {
        if (containsAnyToken(project.image_url, tokens)) {
          references.push({
            location: `Project: "${project.title || 'Untitled'}"`,
            type: 'project_cover',
            details: 'Used as primary project image'
          });
        } else if (containsAnyToken(project.gallery_urls, tokens)) {
          references.push({
            location: `Project: "${project.title || 'Untitled'}"`,
            type: 'project_gallery',
            details: 'Included in project image gallery'
          });
        } else if (containsAnyToken(project.description || project.full_description, tokens)) {
          references.push({
            location: `Project: "${project.title || 'Untitled'}"`,
            type: 'project_content',
            details: 'Referenced inside project description'
          });
        }
      }
    }

    // Check Courses
    if (Array.isArray(data.courses)) {
      for (const course of data.courses) {
        if (containsAnyToken(course.thumbnail_url || course.image_url || course.description, tokens)) {
          references.push({
            location: `Course: "${course.title || 'Untitled'}"`,
            type: 'course_media',
            details: 'Used in course details or thumbnail'
          });
        }
      }
    }

    // Check Videos
    if (Array.isArray(data.videos)) {
      for (const video of data.videos) {
        if (containsAnyToken(video.thumbnail_url || video.video_url, tokens)) {
          references.push({
            location: `Video: "${video.title || 'Untitled'}"`,
            type: 'video_media',
            details: 'Used as video thumbnail or asset'
          });
        }
      }
    }

    // Check Home & Founder config in settings
    if (data.home && containsAnyToken(data.home, tokens)) {
      references.push({
        location: 'Homepage Configuration',
        type: 'home_setting',
        details: 'Active in homepage hero or sections'
      });
    }

    if (data.founder_message && containsAnyToken(data.founder_message, tokens)) {
      references.push({
        location: 'Founder Profile & Message Section',
        type: 'founder_content',
        details: 'Active in founder photo or content'
      });
    }

    if (data.settings && typeof data.settings === 'object') {
      for (const [key, val] of Object.entries(data.settings)) {
        if (containsAnyToken(val, tokens)) {
          references.push({
            location: `CMS Setting "${key}"`,
            type: 'cms_setting',
            details: `Active in ${key} configuration`
          });
        }
      }
    }

    // Check Pages
    if (Array.isArray(data.pages)) {
      for (const page of data.pages) {
        if (containsAnyToken(page.sections || page.content, tokens)) {
          references.push({
            location: `Page: "${page.title || page.slug || 'Custom Page'}"`,
            type: 'page_content',
            details: 'Used in page sections or content layout'
          });
        }
      }
    }
  } catch (err) {
    console.warn('[mediaReferenceService] Local fallback scan error:', err);
  }

  // Deduplicate references
  const seenKeys = new Set<string>();
  const uniqueReferences: MediaReference[] = [];
  for (const ref of references) {
    const key = `${ref.type}:${ref.location}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueReferences.push(ref);
    }
  }

  return uniqueReferences;
}
