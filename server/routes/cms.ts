import express from 'express';
import crypto from 'crypto';
import { requireAuth, requirePermission } from '../auth/rbac';
import { Permission } from '../auth/types';
import { isValidId, isValidUuid, PROBITIAN_MEDIA_BUCKET } from '../config/constants';
import { contactLimiter, uploadLimiter } from '../middleware/rateLimiters';
import { serverSupabase, readCmsData, writeCmsData } from '../services/supabase';
import { sanitizeSvgString, validateFileSignature } from '../security/sanitizer';

const router = express.Router();

// ==================== BLOGS ====================

// GET /api/cms/blogs (Public)
router.get('/cms/blogs', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('blogs').select('*').order('created_at', { ascending: false });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.blogs || []);
});

// POST /api/cms/blogs (Protected: Editor / Admin)
router.post('/cms/blogs', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const blog = req.body;
  if (!blog || !blog.title) {
    return res.status(400).json({ error: 'Invalid blog payload' });
  }

  let savedBlog = { ...blog };

  if (serverSupabase) {
    try {
      const slug = blog.slug || blog.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const dbPayload: any = {
        title: blog.title,
        slug,
        category: blog.category || 'General',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        image_url: blog.image_url || blog.imageUrl || '',
        author: blog.author || 'Shivam Singh',
        read_time: blog.read_time || blog.readTime || '5 min read',
        featured: Boolean(blog.featured),
        status: blog.status || 'published',
        tags: blog.tags || [],
        views_count: blog.views_count || blog.viewsCount || 0,
        likes_count: blog.likes_count || blog.likesCount || 0,
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(blog.id)) {
        dbPayload.id = blog.id;
      }

      const { data, error } = await serverSupabase.from('blogs').upsert(dbPayload).select().single();
      if (error) {
        return res.status(500).json({ error: 'Failed to save blog' });
      }
      if (data) {
        savedBlog = { ...blog, id: data.id };
      }
      return res.json({ success: true, blog: savedBlog });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save blog' });
    }
  }

  if (!savedBlog.id) savedBlog.id = 'blog-' + Date.now();
  const data = readCmsData();
  data.blogs = data.blogs || [];
  const idx = data.blogs.findIndex((b: any) => b.id === savedBlog.id);
  if (idx >= 0) {
    data.blogs[idx] = savedBlog;
  } else {
    data.blogs.unshift(savedBlog);
  }
  writeCmsData(data);

  return res.json({ success: true, blog: savedBlog });
});

// DELETE /api/cms/blogs/:id (Protected: Editor / Admin)
router.delete('/cms/blogs/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid blog ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('blogs').delete().eq('id', id);
      if (error) {
        return res.status(500).json({ error: 'Failed to delete blog' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete blog' });
    }
  }

  const data = readCmsData();
  if (data.blogs) {
    data.blogs = data.blogs.filter((b: any) => b.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// ==================== COURSES ====================

// GET /api/cms/courses (Public)
router.get('/cms/courses', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('courses').select('*').order('created_at', { ascending: false });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.courses || []);
});

// POST /api/cms/courses (Protected: Editor / Admin)
router.post('/cms/courses', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const course = req.body;
  if (!course || !course.title) {
    return res.status(400).json({ error: 'Invalid course payload' });
  }

  let savedCourse = { ...course };

  if (serverSupabase) {
    try {
      const slug = course.slug || course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const dbPayload: any = {
        title: course.title,
        slug,
        level: course.level || 'Intermediate',
        category: course.category || 'Data Analytics',
        description: course.description || '',
        thumbnail: course.thumbnail || course.thumbnail_url || '',
        duration: course.duration || '8 weeks',
        lessons_count: course.lessons_count || course.lessonsCount || 10,
        enrolled_count: course.enrolled_count || course.enrolledCount || 0,
        rating: course.rating || 5.0,
        instructor: course.instructor || 'Shivam Singh',
        featured: Boolean(course.featured),
        status: course.status || 'published',
        tags: course.tags || [],
        curriculum: course.curriculum || [],
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(course.id)) {
        dbPayload.id = course.id;
      }

      const { data, error } = await serverSupabase.from('courses').upsert(dbPayload).select().single();
      if (error) {
        return res.status(500).json({ error: 'Failed to save course' });
      }
      if (data) {
        savedCourse = { ...course, id: data.id };
      }
      return res.json({ success: true, course: savedCourse });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save course' });
    }
  }

  if (!savedCourse.id) savedCourse.id = 'course-' + Date.now();
  const data = readCmsData();
  data.courses = data.courses || [];
  const idx = data.courses.findIndex((c: any) => c.id === savedCourse.id);
  if (idx >= 0) {
    data.courses[idx] = savedCourse;
  } else {
    data.courses.unshift(savedCourse);
  }
  writeCmsData(data);

  return res.json({ success: true, course: savedCourse });
});

// DELETE /api/cms/courses/:id (Protected: Editor / Admin)
router.delete('/cms/courses/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid course ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('courses').delete().eq('id', id);
      if (error) {
        return res.status(500).json({ error: 'Failed to delete course' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete course' });
    }
  }

  const data = readCmsData();
  if (data.courses) {
    data.courses = data.courses.filter((c: any) => c.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// ==================== VIDEOS ====================

// GET /api/cms/videos (Public)
router.get('/cms/videos', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('videos').select('*').order('created_at', { ascending: false });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.videos || []);
});

// POST /api/cms/videos (Protected: Editor / Admin)
router.post('/cms/videos', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const video = req.body;
  if (!video || !video.title) {
    return res.status(400).json({ error: 'Invalid video payload' });
  }

  let savedVideo = { ...video };

  if (serverSupabase) {
    try {
      const dbPayload: any = {
        title: video.title,
        youtube_url: video.youtube_url || video.youtubeUrl || '',
        youtube_id: video.youtube_id || video.youtubeId || '',
        description: video.description || '',
        category: video.category || 'General',
        tags: video.tags || [],
        duration: video.duration || '10:00',
        featured: Boolean(video.featured),
        views_count: video.views_count || video.viewsCount || 0,
        likes_count: video.likes_count || video.likesCount || 0,
        published_at: video.published_at || video.publishedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(video.id)) {
        dbPayload.id = video.id;
      }

      const { data, error } = await serverSupabase.from('videos').upsert(dbPayload).select().single();
      if (error) {
        return res.status(500).json({ error: 'Failed to save video' });
      }
      if (data) {
        savedVideo = { ...video, id: data.id };
      }
      return res.json({ success: true, video: savedVideo });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save video' });
    }
  }

  if (!savedVideo.id) savedVideo.id = 'video-' + Date.now();
  const data = readCmsData();
  data.videos = data.videos || [];
  const idx = data.videos.findIndex((v: any) => v.id === savedVideo.id);
  if (idx >= 0) {
    data.videos[idx] = savedVideo;
  } else {
    data.videos.unshift(savedVideo);
  }
  writeCmsData(data);

  return res.json({ success: true, video: savedVideo });
});

// DELETE /api/cms/videos/:id (Protected: Editor / Admin)
router.delete('/cms/videos/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid video ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('videos').delete().eq('id', id);
      if (error) {
        return res.status(500).json({ error: 'Failed to delete video' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete video' });
    }
  }

  const data = readCmsData();
  if (data.videos) {
    data.videos = data.videos.filter((v: any) => v.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// ==================== CATEGORIES ====================

// GET /api/cms/categories (Public)
router.get('/cms/categories', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('categories').select('*').order('name', { ascending: true });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.categories || []);
});

// POST /api/cms/categories (Protected: Editor / Admin)
router.post('/cms/categories', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const cat = req.body;
  if (!cat || !cat.id) {
    return res.status(400).json({ error: 'Invalid category payload' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('categories').upsert(cat);
      if (error) {
        return res.status(500).json({ error: 'Failed to save category' });
      }
      return res.json({ success: true, category: cat });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save category' });
    }
  }

  const data = readCmsData();
  data.categories = data.categories || [];
  const idx = data.categories.findIndex((c: any) => c.id === cat.id);
  if (idx >= 0) {
    data.categories[idx] = cat;
  } else {
    data.categories.push(cat);
  }
  writeCmsData(data);

  return res.json({ success: true, category: cat });
});

// DELETE /api/cms/categories/:id (Protected: Editor / Admin)
router.delete('/cms/categories/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid category ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('categories').delete().eq('id', id);
      if (error) {
        return res.status(500).json({ error: 'Failed to delete category' });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete category' });
    }
  }

  const data = readCmsData();
  if (data.categories) {
    data.categories = data.categories.filter((c: any) => c.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// ==================== MESSAGES ====================

// GET /api/cms/messages (Protected: Editor / Admin)
router.get('/cms/messages', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('messages').select('*').order('created_at', { ascending: false });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.messages || []);
});

// POST /api/cms/messages (Public Contact Form)
router.post('/cms/messages', contactLimiter, async (req, res) => {
  const { name, email, phone, course_interested, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  let savedMsg: any = null;

  if (serverSupabase) {
    try {
      const dbPayload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: (phone || '').trim(),
        course_interested: (course_interested || '').trim(),
        subject: (subject || 'General Inquiry').trim(),
        message: message.trim(),
        status: 'unread',
        created_at: new Date().toISOString()
      };

      const { data, error } = await serverSupabase.from('messages').insert(dbPayload).select().single();
      if (error) {
        return res.status(500).json({ error: 'Failed to send message' });
      }
      savedMsg = data;
    } catch (err) {
      return res.status(500).json({ error: 'Failed to send message' });
    }
  } else {
    savedMsg = {
      id: 'msg-' + Date.now(),
      name,
      email,
      phone: phone || '',
      course_interested: course_interested || '',
      subject: subject || 'General Inquiry',
      message,
      status: 'unread',
      created_at: new Date().toISOString()
    };
    const data = readCmsData();
    data.messages = data.messages || [];
    data.messages.unshift(savedMsg);
    writeCmsData(data);
  }

  return res.json({ success: true, message: savedMsg });
});

// ==================== SETTINGS ====================

// GET /api/cms/settings (Public read / Protected write)
router.get('/cms/settings', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('settings').select('*');
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.settings || []);
});

// POST /api/cms/settings (Protected: Admin only)
router.post('/cms/settings', requireAuth, requirePermission(Permission.MANAGE_SYSTEM), async (req, res) => {
  const setting = req.body;
  if (!setting || !setting.key) {
    return res.status(400).json({ error: 'Invalid setting payload' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').upsert({
        ...setting,
        updated_at: new Date().toISOString()
      });
      if (error) {
        return res.status(500).json({ error: 'Failed to save setting' });
      }
      return res.json({ success: true, setting });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save setting' });
    }
  }

  const data = readCmsData();
  data.settings = data.settings || [];
  const idx = data.settings.findIndex((s: any) => s.key === setting.key);
  if (idx >= 0) {
    data.settings[idx] = setting;
  } else {
    data.settings.push(setting);
  }
  writeCmsData(data);

  return res.json({ success: true, setting });
});

// ==================== MEDIA UPLOADS ====================

// POST /api/cms/upload (Protected: Editor / Admin)
router.post('/cms/upload', requireAuth, requirePermission(Permission.EDIT_CONTENT), uploadLimiter, express.json({ limit: '15mb' }), async (req, res) => {
  const { fileData, fileName, contentType } = req.body;
  if (!fileData || !fileName || !contentType) {
    return res.status(400).json({ error: 'fileData (base64), fileName, and contentType are required' });
  }

  try {
    const rawBuffer = Buffer.from(fileData.replace(/^data:[^;]+;base64,/, ''), 'base64');
    let bufferToUpload = rawBuffer;

    if (contentType === 'image/svg+xml') {
      const cleanSvg = sanitizeSvgString(rawBuffer.toString('utf-8'));
      bufferToUpload = Buffer.from(cleanSvg, 'utf-8');
    } else {
      const validation = validateFileSignature(rawBuffer, contentType);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'File validation failed' });
      }
    }

    if (serverSupabase) {
      const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniquePath = `uploads/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${cleanName}`;

      const { data: uploadData, error: uploadErr } = await serverSupabase.storage
        .from(PROBITIAN_MEDIA_BUCKET)
        .upload(uniquePath, bufferToUpload, {
          contentType,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        return res.status(500).json({ error: `Upload failed: ${uploadErr.message}` });
      }

      const { data: publicUrlData } = serverSupabase.storage
        .from(PROBITIAN_MEDIA_BUCKET)
        .getPublicUrl(uploadData.path);

      return res.json({ success: true, url: publicUrlData.publicUrl });
    }

    // Dev fallback Data URL
    return res.json({ success: true, url: `data:${contentType};base64,${bufferToUpload.toString('base64')}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

export default router;
