import express from 'express';
import crypto from 'node:crypto';
import { requireAuth, requirePermission } from '../auth/rbac';
import { Permission } from '../auth/types';
import { feedbackLimiter } from '../middleware/rateLimiters';
import { serverSupabase } from '../services/supabase';
import { escapeHtml } from '../security/sanitizer';
import { recordAuditLog } from '../services/audit';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory test store only for non-production environments when Supabase is not configured
let memoryFeedbackStore: any[] = [];

// ==============================================================================
// PUBLIC ENDPOINTS
// ==============================================================================

/**
 * POST /api/feedback
 * Public submission of visitor feedback/testimonials.
 * Rate limited and sanitized.
 * Submissions always default to status = 'pending' and featured = false.
 */
router.post('/feedback', feedbackLimiter, async (req, res) => {
  const {
    name,
    email,
    role,
    company,
    rating,
    feedback,
    service,
    consent_public
  } = req.body;

  // 1. Mandatory Validations
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const cleanName = name.trim();
  if (cleanName.length > 100) {
    return res.status(400).json({ error: 'Name must not exceed 100 characters' });
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail.length > 255 || !EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
    return res.status(400).json({ error: 'Feedback is required' });
  }

  const cleanFeedback = feedback.trim();
  if (cleanFeedback.length < 5) {
    return res.status(400).json({ error: 'Feedback must be at least 5 characters long' });
  }
  if (cleanFeedback.length > 2000) {
    return res.status(400).json({ error: 'Feedback must not exceed 2000 characters' });
  }

  if (consent_public !== true) {
    return res.status(400).json({ error: 'Consent to display feedback publicly is required' });
  }

  const cleanRole = typeof role === 'string' ? role.trim().slice(0, 100) : null;
  const cleanCompany = typeof company === 'string' ? company.trim().slice(0, 100) : null;
  const cleanService = typeof service === 'string' ? service.trim().slice(0, 100) : null;

  // 2. Build Safe Record (Status always 'pending', featured always false)
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const record = {
    id,
    name: escapeHtml(cleanName),
    email: cleanEmail,
    role: cleanRole ? escapeHtml(cleanRole) : null,
    company: cleanCompany ? escapeHtml(cleanCompany) : null,
    rating: numRating,
    feedback: escapeHtml(cleanFeedback),
    service: cleanService ? escapeHtml(cleanService) : null,
    consent_public: true,
    status: 'pending',
    featured: false,
    created_at: now,
    updated_at: now
  };

  // 3. Database Persistence (Primary: public.feedback)
  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('feedback').insert(record);
      if (error) {
        console.error('[Feedback Submission Error]', {
          errorCode: error.code,
          errorMessage: error.message
        });
        return res.status(500).json({ error: 'Failed to submit feedback. Please try again later.' });
      }
    } catch (err: any) {
      console.error('[Feedback Submission Exception]', err?.message || err);
      return res.status(500).json({ error: 'Failed to submit feedback. Please try again later.' });
    }
  } else {
    // Non-production memory store fallback
    memoryFeedbackStore.unshift(record);
  }

  return res.status(201).json({
    success: true,
    message: 'Thank you for sharing your feedback. Your response has been submitted for review.'
  });
});

/**
 * GET /api/feedback
 * Public retrieval of approved testimonials.
 * Returns only approved feedback, ordered by featured DESC, created_at DESC.
 * NEVER exposes email or private moderation details.
 */
router.get('/feedback', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('feedback')
        .select('id, name, role, company, rating, feedback, service, featured, created_at')
        .eq('status', 'approved')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Public Feedback Query Error]', {
          errorCode: error.code,
          errorMessage: error.message
        });
        return res.status(500).json({ error: 'Failed to load testimonials' });
      }

      return res.json(data || []);
    } catch (err: any) {
      console.error('[Public Feedback Query Exception]', err?.message || err);
      return res.status(500).json({ error: 'Failed to load testimonials' });
    }
  }

  // Non-production memory store fallback
  const approved = memoryFeedbackStore
    .filter(f => f.status === 'approved')
    .sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .map(f => ({
      id: f.id,
      name: f.name,
      role: f.role,
      company: f.company,
      rating: f.rating,
      feedback: f.feedback,
      service: f.service,
      featured: Boolean(f.featured),
      created_at: f.created_at
    }));

  return res.json(approved);
});

// ==============================================================================
// ADMIN MODERATION ENDPOINTS (Protected with RBAC)
// ==============================================================================

/**
 * GET /api/admin/feedback
 * List feedback with optional status and search filters.
 */
router.get('/admin/feedback', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { status, featured, search } = req.query;

  if (serverSupabase) {
    try {
      let query = serverSupabase.from('feedback').select('*').order('created_at', { ascending: false });

      if (status && typeof status === 'string' && status !== 'all') {
        query = query.eq('status', status);
      }

      if (featured && typeof featured === 'string' && featured !== 'all') {
        query = query.eq('featured', featured === 'true');
      }

      if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim();
        query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%,role.ilike.%${s}%,feedback.ilike.%${s}%,service.ilike.%${s}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[Admin Feedback Query Error]', error);
        return res.status(500).json({ error: 'Database service unavailable' });
      }

      return res.json(data || []);
    } catch (err: any) {
      console.error('[Admin Feedback Query Exception]', err?.message || err);
      return res.status(500).json({ error: 'Database service unavailable' });
    }
  }

  // Memory fallback
  let list = [...memoryFeedbackStore];
  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter(f => f.status === status);
  }
  if (featured && typeof featured === 'string' && featured !== 'all') {
    list = list.filter(f => Boolean(f.featured) === (featured === 'true'));
  }
  if (search && typeof search === 'string' && search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter(f =>
      (f.name || '').toLowerCase().includes(s) ||
      (f.email || '').toLowerCase().includes(s) ||
      (f.company || '').toLowerCase().includes(s) ||
      (f.role || '').toLowerCase().includes(s) ||
      (f.service || '').toLowerCase().includes(s) ||
      (f.feedback || '').toLowerCase().includes(s)
    );
  }
  return res.json(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

/**
 * GET /api/admin/feedback/:id
 * Retrieve a specific feedback submission.
 */
router.get('/admin/feedback/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('feedback')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || String(error.message || '').includes('0 rows')) {
          return res.status(404).json({ error: 'Feedback record not found' });
        }
        return res.status(500).json({ error: 'Database service unavailable' });
      }

      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Database service unavailable' });
    }
  }

  const item = memoryFeedbackStore.find(f => f.id === id);
  if (!item) return res.status(404).json({ error: 'Feedback record not found' });
  return res.json(item);
});

/**
 * PATCH /api/admin/feedback/:id
 * Moderate feedback: update status, featured flag, or edit content.
 * Enforces:
 * - status must be one of: 'pending', 'approved', 'rejected'
 * - featuring is strictly allowed only for approved feedback
 * - rejecting/pending resets featured to false
 */
router.patch('/admin/feedback/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;
  const { status, featured, name, role, company, rating, feedback, service } = req.body;

  let currentRecord: any = null;

  if (serverSupabase) {
    const { data: existing, error: fetchErr } = await serverSupabase
      .from('feedback')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }
    currentRecord = existing;
  } else {
    currentRecord = memoryFeedbackStore.find(f => f.id === id);
    if (!currentRecord) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  // Determine effective status
  let nextStatus = currentRecord.status;
  if (status !== undefined) {
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, approved, or rejected' });
    }
    nextStatus = status;
    updates.status = status;
  }

  // Determine effective featured flag
  if (featured !== undefined) {
    const nextFeatured = Boolean(featured);
    // Domain rule: featuring is only allowed for approved feedback
    if (nextFeatured && nextStatus !== 'approved') {
      return res.status(400).json({ error: 'Only approved feedback can be featured' });
    }
    updates.featured = nextFeatured;
  } else if (nextStatus !== 'approved') {
    updates.featured = false;
  }

  // Optional content edits
  if (name !== undefined) {
    const n = String(name).trim();
    if (!n) return res.status(400).json({ error: 'Name cannot be empty' });
    updates.name = escapeHtml(n.slice(0, 100));
  }
  if (role !== undefined) {
    updates.role = role ? escapeHtml(String(role).trim().slice(0, 100)) : null;
  }
  if (company !== undefined) {
    updates.company = company ? escapeHtml(String(company).trim().slice(0, 100)) : null;
  }
  if (service !== undefined) {
    updates.service = service ? escapeHtml(String(service).trim().slice(0, 100)) : null;
  }
  if (rating !== undefined) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }
    updates.rating = r;
  }
  if (feedback !== undefined) {
    const fb = String(feedback).trim();
    if (fb.length < 5) {
      return res.status(400).json({ error: 'Feedback must be at least 5 characters' });
    }
    updates.feedback = escapeHtml(fb.slice(0, 2000));
  }

  let finalUpdatedRecord = { ...currentRecord, ...updates };

  if (serverSupabase) {
    const { data: updated, error: updateErr } = await serverSupabase
      .from('feedback')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('[Admin Feedback Update Error]', updateErr);
      return res.status(500).json({ error: 'Failed to update feedback' });
    }
    finalUpdatedRecord = updated;
  } else {
    const idx = memoryFeedbackStore.findIndex(f => f.id === id);
    if (idx >= 0) {
      memoryFeedbackStore[idx] = finalUpdatedRecord;
    }
  }

  await recordAuditLog(req, {
    actor: (req as any).adminSession?.email || 'admin',
    role: (req as any).adminSession?.role || 'admin',
    action: 'UPDATE_FEEDBACK',
    resource: 'feedback',
    resource_id: id,
    metadata: updates
  });

  return res.json({ success: true, feedback: finalUpdatedRecord });
});

/**
 * DELETE /api/admin/feedback/:id
 * Delete feedback record with audit logging.
 */
router.delete('/admin/feedback/:id', requireAuth, requirePermission(Permission.EDIT_CONTENT), async (req, res) => {
  const { id } = req.params;

  if (serverSupabase) {
    const { error } = await serverSupabase.from('feedback').delete().eq('id', id);
    if (error) {
      console.error('[Admin Feedback Delete Error]', error);
      return res.status(500).json({ error: 'Failed to delete feedback record' });
    }
  } else {
    memoryFeedbackStore = memoryFeedbackStore.filter(f => f.id !== id);
  }

  await recordAuditLog(req, {
    actor: (req as any).adminSession?.email || 'admin',
    role: (req as any).adminSession?.role || 'admin',
    action: 'DELETE_FEEDBACK',
    resource: 'feedback',
    resource_id: id
  });

  return res.json({ success: true });
});

export default router;
