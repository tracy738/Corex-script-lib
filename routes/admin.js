const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { thumbnailFromYouTubeUrl, extractYouTubeId } = require('../db/database');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
// Password is stored as a bcrypt hash in env var ADMIN_PASSWORD_HASH.
// If not set, falls back to plain ADMIN_PASSWORD (dev only — set the hash in production).
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || null;
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || 'changeme';

// GET /admin -> dashboard (protected)
router.get('/', requireAuth, (req, res) => {
  const scripts = db.prepare('SELECT * FROM scripts ORDER BY created_at DESC').all();
  res.render('admin/dashboard', { scripts, error: null });
});

// GET /admin/login
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

// POST /admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const usernameOk = username === ADMIN_USERNAME;
  let passwordOk = false;

  if (ADMIN_PASSWORD_HASH) {
    passwordOk = await bcrypt.compare(password || '', ADMIN_PASSWORD_HASH);
  } else {
    passwordOk = password === ADMIN_PASSWORD_PLAIN;
  }

  if (usernameOk && passwordOk) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  res.render('admin/login', { error: 'Invalid username or password.' });
});

// POST /admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// GET /admin/upload -> upload form
router.get('/upload', requireAuth, (req, res) => {
  res.render('admin/upload', { error: null });
});

// POST /admin/upload
router.post('/upload', requireAuth, (req, res) => {
  const { title, description, game, content, language, youtube_url, thumbnail_override } = req.body;

  if (!title || !content) {
    return res.render('admin/upload', { error: 'Title and script content are required.' });
  }

  let thumbnailUrl = null;
  if (thumbnail_override && thumbnail_override.trim()) {
    thumbnailUrl = thumbnail_override.trim();
  } else if (youtube_url && youtube_url.trim()) {
    if (!extractYouTubeId(youtube_url.trim())) {
      return res.render('admin/upload', { error: 'That YouTube URL doesn\'t look valid. Paste a full watch/youtu.be link.' });
    }
    thumbnailUrl = thumbnailFromYouTubeUrl(youtube_url.trim());
  }

  db.prepare(`
    INSERT INTO scripts (title, description, game, content, language, youtube_url, thumbnail_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    (description || '').trim(),
    (game || '').trim(),
    content,
    (language || 'lua').trim(),
    (youtube_url || '').trim() || null,
    thumbnailUrl
  );

  res.redirect('/admin');
});

// GET /admin/edit/:id
router.get('/edit/:id', requireAuth, (req, res) => {
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!script) return res.redirect('/admin');
  res.render('admin/edit', { script, error: null });
});

// POST /admin/edit/:id
router.post('/edit/:id', requireAuth, (req, res) => {
  const { title, description, game, content, language, youtube_url, thumbnail_override } = req.body;
  const existing = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!existing) return res.redirect('/admin');

  if (!title || !content) {
    return res.render('admin/edit', { script: { ...existing, ...req.body }, error: 'Title and script content are required.' });
  }

  let thumbnailUrl = existing.thumbnail_url;
  if (thumbnail_override && thumbnail_override.trim()) {
    thumbnailUrl = thumbnail_override.trim();
  } else if (youtube_url && youtube_url.trim()) {
    if (!extractYouTubeId(youtube_url.trim())) {
      return res.render('admin/edit', { script: { ...existing, ...req.body }, error: 'That YouTube URL doesn\'t look valid.' });
    }
    thumbnailUrl = thumbnailFromYouTubeUrl(youtube_url.trim());
  } else if (!youtube_url) {
    thumbnailUrl = null;
  }

  db.prepare(`
    UPDATE scripts SET title = ?, description = ?, game = ?, content = ?, language = ?, youtube_url = ?, thumbnail_url = ?
    WHERE id = ?
  `).run(
    title.trim(),
    (description || '').trim(),
    (game || '').trim(),
    content,
    (language || 'lua').trim(),
    (youtube_url || '').trim() || null,
    thumbnailUrl,
    req.params.id
  );

  res.redirect('/admin');
});

// POST /admin/delete/:id
router.post('/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM scripts WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

module.exports = router;
