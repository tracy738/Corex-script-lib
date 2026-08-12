const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET / -> homepage with all scripts
router.get('/', (req, res) => {
  const search = (req.query.q || '').trim();
  let scripts;
  if (search) {
    const like = `%${search}%`;
    scripts = db.prepare(`
      SELECT * FROM scripts
      WHERE title LIKE ? OR game LIKE ? OR description LIKE ?
      ORDER BY created_at DESC
    `).all(like, like, like);
  } else {
    scripts = db.prepare('SELECT * FROM scripts ORDER BY created_at DESC').all();
  }
  res.render('index', { scripts, search });
});

// GET /script/:id -> single script view
router.get('/script/:id', (req, res) => {
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
  if (!script) return res.status(404).render('404');

  db.prepare('UPDATE scripts SET views = views + 1 WHERE id = ?').run(req.params.id);
  script.views += 1;

  res.render('script', { script });
});

// GET /script/:id/raw -> plain text raw script (handy for loadstring/raw fetch)
router.get('/script/:id/raw', (req, res) => {
  const script = db.prepare('SELECT content FROM scripts WHERE id = ?').get(req.params.id);
  if (!script) return res.status(404).send('Not found');
  res.type('text/plain').send(script.content);
});

module.exports = router;
