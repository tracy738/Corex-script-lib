const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'scripts.db');
const rawDb = new DatabaseSync(dbPath);

const db = {
  exec: (sql) => rawDb.exec(sql),
  prepare: (sql) => {
    const stmt = rawDb.prepare(sql);
    return {
      run: (...args) => stmt.run(...args),
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args)
    };
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    game TEXT,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'lua',
    youtube_url TEXT,
    thumbnail_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    views INTEGER DEFAULT 0
  )
`);

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

function thumbnailFromYouTubeUrl(url, quality = 'hqdefault') {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

module.exports = db;
module.exports.extractYouTubeId = extractYouTubeId;
module.exports.thumbnailFromYouTubeUrl = thumbnailFromYouTubeUrl;
