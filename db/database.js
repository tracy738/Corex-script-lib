const Database = require('better-sqlite3');
const path = require('path');

// On Render, use a persistent disk mounted at /var/data if available,
// otherwise fall back to local file (fine for dev, but will reset on redeploy without a disk).
const dbPath = process.env.DB_PATH || path.join(__dirname, 'scripts.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

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

// Helper: turn a YouTube URL (watch, youtu.be, shorts, embed) into its video ID
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

// Highest-quality thumbnail that YouTube always generates (maxresdefault
// isn't guaranteed for every video, so hqdefault is the safe universal default)
function thumbnailFromYouTubeUrl(url, quality = 'hqdefault') {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

module.exports = db;
module.exports.extractYouTubeId = extractYouTubeId;
module.exports.thumbnailFromYouTubeUrl = thumbnailFromYouTubeUrl;
