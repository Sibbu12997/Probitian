import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { requireAuth, requirePermission } from '../auth/rbac';
import { Permission } from '../auth/types';
import { isValidId, isValidUuid, PROBITIAN_MEDIA_BUCKET, DEFAULT_HOME_CONFIG, DEFAULT_FOUNDER_MESSAGE } from '../config/constants';
import { contactLimiter, uploadLimiter } from '../middleware/rateLimiters';
import { serverSupabase, readCmsData, writeCmsData } from '../services/supabase';
import { sanitizeSvgString, validateFileSignature } from '../security/sanitizer';
import { emailService } from '../../src/services/emailService';

const router = express.Router();

// ==================== POWER BI DEMO CONFIGURATION ====================
const DEFAULT_POWER_BI_DEMO_URL = 'https://app.powerbi.com/view?r=eyJrIjoiNzUyNDk1ZjgtNTA1OS00MDUxLTgyNmEtMjVhYmM2NTlkOGJjIiwidCI6ImU2YmVkMTFkLWM2YzMtNDFkMC05NzU3LTkxNWQwZjIzZmQ4NyJ9';

// GET /api/config/power-bi-demo & /api/cms/config/power-bi-demo (Public)
const getPowerBiDemoConfig = (req: express.Request, res: express.Response) => {
  const customUrl = process.env.POWERBI_DEMO_URL?.trim();
  const url = customUrl || DEFAULT_POWER_BI_DEMO_URL;
  return res.json({ url });
};

router.get('/config/power-bi-demo', getPowerBiDemoConfig);
router.get('/cms/config/power-bi-demo', getPowerBiDemoConfig);

// ==================== PROJECTS ====================

// GET /api/cms/projects (Public)
router.get('/cms/projects', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('projects').select('*').order('display_order', { ascending: true });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  try {
    const data = readCmsData();
    return res.json(data.projects || []);
  } catch {
    return res.json([]);
  }
});

// POST /api/cms/projects (Protected: Editor / Admin)
router.post('/cms/projects', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const project = req.body;
  if (!project || !project.title) {
    return res.status(400).json({ error: 'Invalid project payload' });
  }

  let savedProject = { ...project };

  if (serverSupabase) {
    try {
      const dbPayload: any = {
        title: project.title,
        category: project.category || 'General',
        description: project.description || '',
        full_description: project.full_description || project.fullDescription || project.description || '',
        tools_used: project.tools_used || project.toolsUsed || [],
        image_url: project.image_url || project.imagePlaceholder || '',
        gallery_urls: project.gallery_urls || project.galleryUrls || [],
        kpis: Array.isArray(project.kpis) ? project.kpis : [],
        featured: Boolean(project.featured),
        published: project.published !== false,
        github_url: project.github_url || project.githubUrl || null,
        live_demo_url: project.live_demo_url || project.liveDemoUrl || null,
        youtube_url: project.youtube_url || project.youtubeUrl || null,
        tags: project.tags || [],
        display_order: project.display_order ?? project.displayOrder ?? 0,
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(project.id)) {
        dbPayload.id = project.id;
      }

      const { data, error } = await serverSupabase.from('projects').upsert(dbPayload).select().single();
      if (error) {
        return res.status(500).json({ error: 'Failed to save project' });
      }
      if (data) {
        savedProject = { ...project, id: data.id };
      }
      return res.json({ success: true, project: savedProject });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save project' });
    }
  }

  if (!savedProject.id) savedProject.id = 'proj-' + Date.now();
  const data = readCmsData();
  data.projects = data.projects || [];
  const idx = data.projects.findIndex((p: any) => p.id === savedProject.id);
  if (idx >= 0) {
    data.projects[idx] = savedProject;
  } else {
    data.projects.unshift(savedProject);
  }
  writeCmsData(data);

  return res.json({ success: true, project: savedProject });
});

// DELETE /api/cms/projects/:id (Protected: Editor / Admin)
router.delete('/cms/projects/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid project ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('projects').delete().eq('id', id);
      if (error) {
        return res.status(500).json({ error: 'Failed to delete project' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  const data = readCmsData();
  if (data.projects) {
    data.projects = data.projects.filter((p: any) => p.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

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
  try {
    const data = readCmsData();
    return res.json(data.blogs || []);
  } catch {
    return res.json([]);
  }
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
  try {
    const data = readCmsData();
    return res.json(data.courses || []);
  } catch {
    return res.json([]);
  }
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
  try {
    const data = readCmsData();
    return res.json(data.videos || []);
  } catch {
    return res.json([]);
  }
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
  try {
    const data = readCmsData();
    return res.json(data.categories || []);
  } catch {
    return res.json([]);
  }
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
  try {
    const data = readCmsData();
    return res.json(data.messages || []);
  } catch {
    return res.json([]);
  }
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

// PATCH /api/cms/messages/:id/status (Protected: Editor / Admin)
router.patch('/cms/messages/:id/status', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  if (serverSupabase) {
    try {
      const updates: any = { status };
      if (adminNotes !== undefined) updates.admin_notes = adminNotes;
      const { error } = await serverSupabase.from('messages').update(updates).eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to update message status' });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update message status' });
    }
  }

  const data = readCmsData();
  if (data.messages) {
    const msg = data.messages.find((m: any) => m.id === id);
    if (msg) {
      msg.status = status;
      if (adminNotes !== undefined) msg.admin_notes = adminNotes;
      writeCmsData(data);
    }
  }
  return res.json({ success: true });
});

// POST /api/cms/messages/:id/reply (Protected: Editor / Admin)
router.post('/cms/messages/:id/reply', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  const { id } = req.params;
  const { replyText, replySubject } = req.body;

  if (!replyText || !replyText.trim()) {
    return res.status(400).json({ success: false, message: 'Reply message text is required' });
  }

  let recipientEmail = '';
  let originalSubject = 'Inquiry Reply';

  if (serverSupabase) {
    try {
      const { data: msgRow } = await serverSupabase.from('messages').select('*').eq('id', id).maybeSingle();
      if (msgRow) {
        recipientEmail = msgRow.email;
        originalSubject = msgRow.subject || originalSubject;
      }
    } catch (e) {
      // continue
    }
  } else {
    const data = readCmsData();
    const msgRow = (data.messages || []).find((m: any) => m.id === id);
    if (msgRow) {
      recipientEmail = msgRow.email;
      originalSubject = msgRow.subject || originalSubject;
    }
  }

  if (recipientEmail) {
    const subjectToSend = replySubject || `Re: ${originalSubject}`;
    const emailRes = await emailService.sendAdminReply(recipientEmail, subjectToSend, replyText);

    const now = new Date().toISOString();
    if (serverSupabase) {
      await serverSupabase.from('messages').update({
        status: 'replied',
        reply_message: replyText,
        replied_at: now,
        reply_status: 'sent'
      }).eq('id', id);
    } else {
      const data = readCmsData();
      if (data.messages) {
        const m = data.messages.find((item: any) => item.id === id);
        if (m) {
          m.status = 'replied';
          m.reply_message = replyText;
          m.replied_at = now;
          m.reply_status = 'sent';
          writeCmsData(data);
        }
      }
    }

    return res.json({ success: true, message: emailRes.message || 'Reply processed successfully' });
  }

  return res.status(404).json({ success: false, message: 'Message record not found' });
});

// DELETE /api/cms/messages/:id (Protected: Admin)
router.delete('/cms/messages/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid message ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('messages').delete().eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to delete message' });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete message' });
    }
  }

  const data = readCmsData();
  if (data.messages) {
    data.messages = data.messages.filter((m: any) => m.id !== id);
    writeCmsData(data);
  }
  return res.json({ success: true });
});

// ==================== SUBSCRIBERS ====================

// GET /api/cms/subscribers (Protected: Editor / Admin)
router.get('/cms/subscribers', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('newsletter').select('*').order('created_at', { ascending: false });
      if (error) return res.status(503).json({ error: 'Database service unavailable' });
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  try {
    const data = readCmsData();
    return res.json(data.subscribers || []);
  } catch {
    return res.json([]);
  }
});

// DELETE /api/cms/subscribers/:id (Protected: Admin)
router.delete('/cms/subscribers/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid subscriber ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('newsletter').delete().eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to delete subscriber' });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete subscriber' });
    }
  }

  const data = readCmsData();
  if (data.subscribers) {
    data.subscribers = data.subscribers.filter((s: any) => s.id !== id);
    writeCmsData(data);
  }
  return res.json({ success: true });
});

// ==================== SOCIAL LINKS ====================

// GET /api/cms/social (Public)
router.get('/cms/social', async (req, res) => {
  if (serverSupabase) {
    try {
      // 1. Try settings table with key 'social_links'
      const { data: settingRow, error: settingErr } = await serverSupabase.from('settings').select('value').eq('key', 'social_links').maybeSingle();
      if (!settingErr && settingRow && Array.isArray(settingRow.value) && settingRow.value.length > 0) {
        return res.json(settingRow.value);
      }

      // 2. Try dedicated social_links table
      const { data: links, error: linksErr } = await serverSupabase.from('social_links').select('*').order('display_order', { ascending: true });
      if (!linksErr && Array.isArray(links) && links.length > 0) {
        return res.json(links);
      }

      // 3. If settings row exists or queries succeeded without DB connection failure
      if (!settingErr || !linksErr) {
        return res.json(Array.isArray(settingRow?.value) ? settingRow.value : []);
      }

      return res.status(503).json({ error: 'Database service unavailable' });
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }

  try {
    const data = readCmsData();
    const social = data.social || data.social_links || (data.settings && data.settings.social_links) || [];
    return res.json(Array.isArray(social) ? social : []);
  } catch {
    return res.json([]);
  }
});

// POST /api/cms/social (Protected: Admin)
router.post('/cms/social', requireAuth, requirePermission(Permission.MANAGE_SYSTEM), async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Array of social links required' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').upsert({
        key: 'social_links',
        value: items,
        updated_at: new Date().toISOString()
      });
      if (error) return res.status(500).json({ error: 'Failed to save social links' });
      return res.json({ success: true, social: items });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save social links' });
    }
  }

  const data = readCmsData();
  data.social = items;
  writeCmsData(data);
  return res.json({ success: true, social: items });
});

// ==================== NAVIGATION ====================

// GET /api/cms/navigation (Public)
router.get('/cms/navigation', async (req, res) => {
  if (serverSupabase) {
    try {
      // 1. Try settings table with key 'navigation_items'
      const { data: settingRow, error: settingErr } = await serverSupabase.from('settings').select('value').eq('key', 'navigation_items').maybeSingle();
      if (!settingErr && settingRow && Array.isArray(settingRow.value) && settingRow.value.length > 0) {
        return res.json(settingRow.value);
      }

      // 2. Try dedicated navigation table
      const { data: navItems, error: navErr } = await serverSupabase.from('navigation').select('*').order('display_order', { ascending: true });
      if (!navErr && Array.isArray(navItems) && navItems.length > 0) {
        return res.json(navItems);
      }

      // 3. If settings row exists or queries succeeded without DB connection failure
      if (!settingErr || !navErr) {
        return res.json(Array.isArray(settingRow?.value) ? settingRow.value : []);
      }

      return res.status(503).json({ error: 'Database service unavailable' });
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }

  try {
    const data = readCmsData();
    const nav = data.navigation || (data.settings && data.settings.navigation_items) || [];
    return res.json(Array.isArray(nav) ? nav : []);
  } catch {
    return res.json([]);
  }
});

// POST /api/cms/navigation (Protected: Admin)
router.post('/cms/navigation', requireAuth, requirePermission(Permission.MANAGE_SYSTEM), async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Array of navigation items required' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').upsert({
        key: 'navigation_items',
        value: items,
        updated_at: new Date().toISOString()
      });
      if (error) return res.status(500).json({ error: 'Failed to save navigation' });
      return res.json({ success: true, navigation: items });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save navigation' });
    }
  }

  const data = readCmsData();
  data.navigation = items;
  writeCmsData(data);
  return res.json({ success: true, navigation: items });
});

// ==================== MEDIA LIBRARY ====================

// GET /api/cms/media (Public / Protected)
router.get('/cms/media', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('media').select('*').order('created_at', { ascending: false });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(Array.isArray(data) ? data : []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }

  try {
    const data = readCmsData();
    return res.json(data.media || []);
  } catch {
    return res.json([]);
  }
});

// POST /api/cms/media (Protected: Editor / Admin)
router.post('/cms/media', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const item = req.body;
  if (!item || (!item.public_url && !item.url)) {
    return res.status(400).json({ error: 'Media payload with public URL is required' });
  }

  const mediaRecord = {
    id: item.id && isValidUuid(item.id) ? item.id : crypto.randomUUID(),
    filename: item.filename || item.original_filename || 'asset',
    storage_path: item.storage_path || '',
    public_url: item.public_url || item.url,
    size_bytes: item.size_bytes || item.file_size || 0,
    mime_type: item.mime_type || 'image/png',
    alt_text: item.alt_text || item.filename || '',
    category: item.category || item.folder || 'general',
    uploaded_at: item.uploaded_at || new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('media').upsert(mediaRecord).select().single();
      if (!error && data) {
        return res.json({ success: true, media: data });
      }
    } catch (e) {
      // fallback
    }
  }

  const data = readCmsData();
  data.media = data.media || [];
  data.media.unshift(mediaRecord);
  writeCmsData(data);
  return res.json({ success: true, media: mediaRecord });
});

// DELETE /api/cms/media/:id (Protected: Editor / Admin)
router.delete('/cms/media/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid media ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('media').delete().eq('id', id);
      if (!error) return res.json({ success: true });
    } catch (e) {
      // fallback
    }
  }

  const data = readCmsData();
  if (data.media) {
    data.media = data.media.filter((m: any) => m.id !== id);
    writeCmsData(data);
  }
  return res.json({ success: true });
});

// ==================== SETTINGS (BY KEY & GENERAL) ====================

// GET /api/cms/settings/:key (Public)
router.get('/cms/settings/:key', async (req, res) => {
  const { key } = req.params;

  const getDefaultSetting = (settingKey: string) => {
    if (settingKey === 'home') return DEFAULT_HOME_CONFIG;
    if (settingKey === 'founder_message' || settingKey === 'founder') return DEFAULT_FOUNDER_MESSAGE;
    return null;
  };

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('settings').select('*').eq('key', key).maybeSingle();
      if (error) {
        // If database error, return default fallback if available or 503
        const fallback = getDefaultSetting(key);
        if (fallback !== null) {
          return res.json(fallback);
        }
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      if (data && data.value !== undefined && data.value !== null) {
        return res.json(data.value);
      }
      if (data && typeof data === 'object' && Object.keys(data).length > 0 && data.value === undefined) {
        return res.json(data);
      }
      const fallback = getDefaultSetting(key);
      return res.json(fallback);
    } catch (err: any) {
      const fallback = getDefaultSetting(key);
      if (fallback !== null) {
        return res.json(fallback);
      }
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }

  try {
    const data = readCmsData();
    const settings = data.settings;
    if (settings && typeof settings === 'object') {
      if (!Array.isArray(settings) && settings[key] !== undefined && settings[key] !== null) {
        return res.json(settings[key]);
      }
      if (Array.isArray(settings)) {
        const match = settings.find((s: any) => s.key === key);
        if (match) {
          return res.json(match.value !== undefined ? match.value : match);
        }
      }
    }
    const fallback = getDefaultSetting(key);
    return res.json(fallback);
  } catch {
    const fallback = getDefaultSetting(key);
    return res.json(fallback);
  }
});

// POST /api/cms/settings/:key (Protected: Editor / Admin)
router.post('/cms/settings/:key', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { key } = req.params;
  const payload = req.body;

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').upsert({
        key,
        value: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      if (error) {
        return res.status(500).json({ error: 'Failed to save setting' });
      }
      return res.json({ success: true, setting: payload });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save setting' });
    }
  }

  const data = readCmsData();
  data.settings = data.settings || {};
  if (Array.isArray(data.settings)) {
    const idx = data.settings.findIndex((s: any) => s.key === key);
    if (idx >= 0) {
      data.settings[idx] = { key, value: payload, updated_at: new Date().toISOString() };
    } else {
      data.settings.push({ key, value: payload, updated_at: new Date().toISOString() });
    }
  } else {
    data.settings[key] = payload;
  }
  writeCmsData(data);

  return res.json({ success: true, setting: payload });
});

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
  try {
    const data = readCmsData();
    return res.json(data.settings || []);
  } catch {
    return res.json([]);
  }
});

// POST /api/cms/settings (Protected: Editor / Admin)
router.post('/cms/settings', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const setting = req.body;
  if (!setting || !setting.key) {
    return res.status(400).json({ error: 'Invalid setting payload' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('settings').upsert({
        ...setting,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
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
  if (Array.isArray(data.settings)) {
    const idx = data.settings.findIndex((s: any) => s.key === setting.key);
    if (idx >= 0) {
      data.settings[idx] = setting;
    } else {
      data.settings.push(setting);
    }
  } else {
    data.settings[setting.key] = setting.value || setting;
  }
  writeCmsData(data);

  return res.json({ success: true, setting });
});

// ==================== MEDIA UPLOADS ====================

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

const handleUpload = async (req: express.Request, res: express.Response) => {
  const { fileData, fileName, filename, contentType, mimeType, category, folder, altText } = req.body;
  const rawFileName = fileName || filename;
  const rawContentType = contentType || mimeType;

  if (!fileData || !rawFileName) {
    return res.status(400).json({ error: 'fileData (base64) and fileName are required' });
  }

  try {
    const rawBuffer = Buffer.from(String(fileData).replace(/^data:[^;]+;base64,/, ''), 'base64');
    
    // 1. Enforce upload size limit
    if (rawBuffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: `File size exceeds the maximum limit of ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` });
    }

    if (rawBuffer.length === 0) {
      return res.status(400).json({ error: 'Uploaded file payload is empty.' });
    }

    // 2. Normalize and sanitize filename against path traversal
    const safeBaseName = path.basename(String(rawFileName)).trim();
    const ext = path.extname(safeBaseName).toLowerCase();
    const cleanName = safeBaseName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload';

    // 3. Binary & content signature validation
    const validation = validateFileSignature(rawBuffer, rawContentType || '', ext);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'File signature validation failed.' });
    }

    const effectiveMime = validation.detectedMime || rawContentType || 'image/png';
    let bufferToUpload = rawBuffer;

    // 4. SVG sanitization & validation
    if (effectiveMime === 'image/svg+xml' || ext === '.svg') {
      const cleanSvg = sanitizeSvgString(rawBuffer.toString('utf-8'));
      if (!cleanSvg || !cleanSvg.toLowerCase().includes('<svg') || (!cleanSvg.toLowerCase().includes('</svg>') && !cleanSvg.includes('/>'))) {
        return res.status(400).json({ error: 'SVG content is invalid or was stripped of prohibited active markup.' });
      }
      bufferToUpload = Buffer.from(cleanSvg, 'utf-8');
    }

    let publicUrl = '';
    const uniquePath = `uploads/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${cleanName}`;

    if (serverSupabase) {
      const { data: uploadData, error: uploadErr } = await serverSupabase.storage
        .from(PROBITIAN_MEDIA_BUCKET)
        .upload(uniquePath, bufferToUpload, {
          contentType: effectiveMime,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        return res.status(500).json({ error: `Upload failed: ${uploadErr.message}` });
      }

      const { data: publicUrlData } = serverSupabase.storage
        .from(PROBITIAN_MEDIA_BUCKET)
        .getPublicUrl(uploadData.path);

      publicUrl = publicUrlData.publicUrl;
    } else {
      publicUrl = `data:${effectiveMime};base64,${bufferToUpload.toString('base64')}`;
    }

    const mediaItem = {
      id: crypto.randomUUID(),
      filename: cleanName,
      original_filename: safeBaseName,
      storage_path: uniquePath,
      public_url: publicUrl,
      url: publicUrl,
      size_bytes: bufferToUpload.length,
      file_size: bufferToUpload.length,
      mime_type: effectiveMime,
      alt_text: altText || cleanName,
      category: category || folder || 'general',
      folder: folder || category || 'general',
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (serverSupabase) {
      try {
        await serverSupabase.from('media').upsert(mediaItem);
      } catch (e) {
        // continue
      }
    } else {
      const data = readCmsData();
      data.media = data.media || [];
      data.media.unshift(mediaItem);
      writeCmsData(data);
    }

    return res.json({ success: true, url: publicUrl, media: mediaItem });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
};

// POST /api/cms/upload & /api/cms/media/upload (Protected: Editor / Admin)
router.post('/cms/upload', requireAuth, requirePermission(Permission.EDIT_CONTENT), uploadLimiter, express.json({ limit: '15mb' }), handleUpload);
router.post('/cms/media/upload', requireAuth, requirePermission(Permission.EDIT_CONTENT), uploadLimiter, express.json({ limit: '15mb' }), handleUpload);

export default router;

