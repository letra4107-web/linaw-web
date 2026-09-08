const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { notificationBelongsTo } = require('../services/authorization');
const { validateUuidParam } = require('../lib/validation');

const router = express.Router();
router.use(requireAuth);

// Rows can target a user three different ways depending on who/what they're
// about (mirrors mobile's backend/routes/notifications.js union): a direct
// user_id, a parent_id (for parent-facing rows), or a student_id/child auth_uid
// for a parent's own children. RLS on `notifications` only recognizes
// user_id=auth.uid(), so this has to run with the service-role client.
async function fetchNotificationsForUser(userId) {
  const orParts = [`parent_id.eq.${userId}`, `user_id.eq.${userId}`];

  const { data: children, error: childrenErr } = await supabaseAdmin
    .from('children')
    .select('id, auth_uid')
    .eq('parent_id', userId);
  if (childrenErr) throw childrenErr;

  const childIds = (children || []).map((c) => c.id).filter(Boolean);
  const childAuthUids = (children || []).map((c) => c.auth_uid).filter(Boolean);
  if (childIds.length) orParts.push(`student_id.in.(${childIds.join(',')})`);
  if (childAuthUids.length) orParts.push(`user_id.in.(${childAuthUids.join(',')})`);

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id, title, body, message, type, is_read, read, created_at')
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

async function canAccessNotification(userId, notificationId) {
  const [{ data: notification, error: notificationError }, { data: children, error: childrenError }] = await Promise.all([
    supabaseAdmin.from('notifications').select('id, user_id, parent_id, student_id').eq('id', notificationId).maybeSingle(),
    supabaseAdmin.from('children').select('id, auth_uid').eq('parent_id', userId),
  ]);
  if (notificationError) throw notificationError;
  if (childrenError) throw childrenError;
  return notificationBelongsTo(notification, userId, children || []);
}

router.get('/', async (req, res) => {
  try {
    const notifications = await fetchNotificationsForUser(req.user.id);
    res.json({ notifications });
  } catch (err) {
    console.error('[notifications list]', err);
    res.status(500).json({ error: 'Unable to load notifications.' });
  }
});

router.post('/:id/read', validateUuidParam('id'), async (req, res) => {
  try {
    if (!await canAccessNotification(req.user.id, req.params.id)) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read: true })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[notifications mark-read]', err);
    res.status(500).json({ error: 'Unable to update the notification.' });
  }
});

router.post('/read-all', async (req, res) => {
  try {
    const notifications = await fetchNotificationsForUser(req.user.id);
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true, read: true })
        .in('id', unreadIds);
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[notifications mark-all-read]', err);
    res.status(500).json({ error: 'Unable to update notifications.' });
  }
});

module.exports = router;
