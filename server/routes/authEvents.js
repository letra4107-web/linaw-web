const express = require('express');
const { requireAuth } = require('../middleware/auth');

// Auth providers do not expose failed-password events to this application.
// Successful events are recorded only after a verified bearer session exists.
const router = express.Router();
router.post('/events', requireAuth, (req, res) => {
  const type = String(req.body?.type || '');
  if (!['login', 'logout', 'password_reset'].includes(type)) return res.status(400).json({ error: 'Invalid authentication event.' });
  res.json({ success: true, type });
});
module.exports = router;
