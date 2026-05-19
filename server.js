/* ============================================================
   Atlas — API Server (Express + SQLite)
   ============================================================ */

const express  = require('express');
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'atlas-jwt-secret-change-in-production';

// ── Uploads directory ─────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed.'));
  },
});

// ── Database ──────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'atlas.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    avatar     TEXT,
    bio        TEXT    DEFAULT '',
    plan       TEXT    DEFAULT 'Explorer',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url  TEXT    NOT NULL,
    caption    TEXT    NOT NULL DEFAULT '',
    road_name  TEXT    NOT NULL DEFAULT '',
    region     TEXT    NOT NULL DEFAULT '',
    likes      INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS post_likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));                      // serve static site
app.use('/uploads', express.static(UPLOADS_DIR));       // serve uploaded images

// ── Auth middleware ───────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), JWT_SECRET); } catch {}
  }
  next();
}

// ── Auth routes ───────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email address.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
  ).run(name.trim(), email.toLowerCase(), hash);

  const user = db.prepare('SELECT id, name, email, avatar, bio, plan, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

  const { password: _, ...safeUser } = user;
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: safeUser });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar, bio, plan, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

// ── Post routes ───────────────────────────────────────────────
app.get('/api/posts', optionalAuth, (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(24, parseInt(req.query.limit) || 12);
  const offset = (page - 1) * limit;

  const posts = db.prepare(`
    SELECT p.*, u.name AS user_name, u.avatar AS user_avatar
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) AS n FROM posts').get().n;

  // Attach liked flag for current user
  if (req.user) {
    const likedIds = new Set(
      db.prepare('SELECT post_id FROM post_likes WHERE user_id = ?').all(req.user.id).map(r => r.post_id)
    );
    posts.forEach(p => { p.liked = likedIds.has(p.id); });
  } else {
    posts.forEach(p => { p.liked = false; });
  }

  res.json({ posts, total, page, pages: Math.ceil(total / limit) });
});

app.post('/api/posts', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image is required.' });
  const { caption = '', road_name = '', region = '' } = req.body;

  const result = db.prepare(
    'INSERT INTO posts (user_id, image_url, caption, road_name, region) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, `/uploads/${req.file.filename}`, caption.trim(), road_name.trim(), region.trim());

  const post = db.prepare(`
    SELECT p.*, u.name AS user_name, u.avatar AS user_avatar
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  post.liked = false;
  res.status(201).json({ post });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Not your post.' });

  // Delete image file
  const filePath = path.join(__dirname, post.image_url);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;

  const existing = db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(userId, postId);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(userId, postId);
    db.prepare('UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?').run(postId);
  } else {
    db.prepare('INSERT OR IGNORE INTO post_likes (user_id, post_id) VALUES (?, ?)').run(userId, postId);
    db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(postId);
  }

  const { likes } = db.prepare('SELECT likes FROM posts WHERE id = ?').get(postId);
  res.json({ liked: !existing, likes });
});

// ── Comment routes ────────────────────────────────────────────
app.get('/api/posts/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name AS user_name, u.avatar AS user_avatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json({ comments });
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });

  const result = db.prepare(
    'INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)'
  ).run(req.params.id, req.user.id, body.trim());

  const comment = db.prepare(`
    SELECT c.*, u.name AS user_name, u.avatar AS user_avatar
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json({ comment });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'Not your comment.' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Seed demo posts if DB is empty ────────────────────────────
async function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  const hash = await bcrypt.hash('atlas123', 10);
  const uid = db.prepare("INSERT INTO users (name, email, password, bio) VALUES (?, ?, ?, ?)").run(
    'Atlas Team', 'team@atlas.app', hash, 'The official Atlas account. Follow for road inspiration.'
  ).lastInsertRowid;

  const demoPosts = [
    { image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800', caption: 'Tail of the Dragon — 318 curves in 11 miles. Nothing else comes close.', road_name: 'Tail of the Dragon (US-129)', region: 'Southeast' },
    { image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', caption: 'Beartooth Highway at sunrise. Worth every switchback.', road_name: 'Beartooth Highway (US-212)', region: 'Mountain West' },
    { image_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800', caption: 'Pacific Coast Highway. Windows down, ocean to the left.', road_name: 'Pacific Coast Highway (CA-1)', region: 'West Coast' },
    { image_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800', caption: 'Million Dollar Highway descending to Ouray. Colorado\'s finest.', road_name: 'Million Dollar Highway (US-550)', region: 'Mountain West' },
    { image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800', caption: 'Skyline Drive in the fall. The colours are unreal this time of year.', road_name: 'Skyline Drive', region: 'Northeast' },
    { image_url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800', caption: 'Going-to-the-Sun Road through Glacier NP. One of the greats.', road_name: 'Going-to-the-Sun Road', region: 'Mountain West' },
  ];

  const insertPost = db.prepare('INSERT INTO posts (user_id, image_url, caption, road_name, region, likes) VALUES (?, ?, ?, ?, ?, ?)');
  for (const p of demoPosts) {
    insertPost.run(uid, p.image_url, p.caption, p.road_name, p.region, Math.floor(Math.random() * 120) + 20);
  }
}

seed().then(() => {
  app.listen(PORT, () => console.log(`Atlas API running on http://localhost:${PORT}`));
});
