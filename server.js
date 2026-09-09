/* ============================================================
   Atlas — API Server (Express + in-memory store)
   ============================================================ */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'atlas-jwt-secret-change-in-production';
const IS_VERCEL  = !!process.env.VERCEL;

// ── Uploads directory (writable /tmp on Vercel) ───────────────
const UPLOADS_DIR = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
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

// ── In-memory store ───────────────────────────────────────────
let users    = [];
let posts    = [];
let comments = [];
const postLikes = new Set(); // keys: `${userId}-${postId}`
let nextUserId    = 1;
let nextPostId    = 1;
let nextCommentId = 1;
let seeded = false;

function now() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
// Static files are served by Vercel's CDN in production.
// In local dev, express.static handles them here.
if (!IS_VERCEL) {
  app.use(express.static(path.join(__dirname)));
}
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

// ── Helpers ───────────────────────────────────────────────────
function safeUser(u) {
  const { password: _, ...rest } = u;
  return rest;
}

function postWithMeta(post, userId) {
  const user = users.find(u => u.id === post.user_id) || {};
  return {
    ...post,
    user_name:   user.name   || '',
    user_avatar: user.avatar || null,
    liked: userId ? postLikes.has(`${userId}-${post.id}`) : false,
  };
}

function commentWithMeta(c) {
  const user = users.find(u => u.id === c.user_id) || {};
  return { ...c, user_name: user.name || '', user_avatar: user.avatar || null };
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

  if (users.find(u => u.email === email.toLowerCase()))
    return res.status(409).json({ error: 'An account with that email already exists.' });

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: nextUserId++,
    name: name.trim(),
    email: email.toLowerCase(),
    password: hash,
    avatar: null,
    bio: '',
    plan: 'Explorer',
    created_at: now(),
  };
  users.push(user);

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user: safeUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = users.find(u => u.email === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: safeUser(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: safeUser(user) });
});

// ── Post routes ───────────────────────────────────────────────
app.get('/api/posts', optionalAuth, (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(24, parseInt(req.query.limit) || 12);
  const offset = (page - 1) * limit;

  const sorted = [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const page_posts = sorted.slice(offset, offset + limit)
    .map(p => postWithMeta(p, req.user?.id));

  res.json({ posts: page_posts, total: posts.length, page, pages: Math.ceil(posts.length / limit) });
});

app.post('/api/posts', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image is required.' });
  const { caption = '', road_name = '', region = '' } = req.body;

  const post = {
    id: nextPostId++,
    user_id:   req.user.id,
    image_url: `/uploads/${req.file.filename}`,
    caption:   caption.trim(),
    road_name: road_name.trim(),
    region:    region.trim(),
    likes:     0,
    created_at: now(),
  };
  posts.push(post);

  res.status(201).json({ post: postWithMeta(post, req.user.id) });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const postId = parseInt(req.params.id);
  const idx = posts.findIndex(p => p.id === postId);
  if (idx === -1) return res.status(404).json({ error: 'Post not found.' });
  const post = posts[idx];
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Not your post.' });

  // Delete image file (only locally-uploaded ones)
  if (post.image_url.startsWith('/uploads/')) {
    const filePath = path.join(UPLOADS_DIR, path.basename(post.image_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  posts.splice(idx, 1);
  // Clean up related data
  comments = comments.filter(c => c.post_id !== postId);
  for (const key of postLikes) {
    if (key.endsWith(`-${postId}`)) postLikes.delete(key);
  }
  res.json({ ok: true });
});

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;
  const key = `${userId}-${postId}`;
  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (postLikes.has(key)) {
    postLikes.delete(key);
    post.likes = Math.max(0, post.likes - 1);
    res.json({ liked: false, likes: post.likes });
  } else {
    postLikes.add(key);
    post.likes++;
    res.json({ liked: true, likes: post.likes });
  }
});

// ── Comment routes ────────────────────────────────────────────
app.get('/api/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id);
  const result = comments
    .filter(c => c.post_id === postId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(commentWithMeta);
  res.json({ comments: result });
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });

  const comment = {
    id: nextCommentId++,
    post_id: parseInt(req.params.id),
    user_id: req.user.id,
    body: body.trim(),
    created_at: now(),
  };
  comments.push(comment);
  res.status(201).json({ comment: commentWithMeta(comment) });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const commentId = parseInt(req.params.id);
  const idx = comments.findIndex(c => c.id === commentId);
  if (idx === -1) return res.status(404).json({ error: 'Comment not found.' });
  if (comments[idx].user_id !== req.user.id) return res.status(403).json({ error: 'Not your comment.' });
  comments.splice(idx, 1);
  res.json({ ok: true });
});

// ── Seed demo posts if store is empty ─────────────────────────
async function seed() {
  if (seeded || users.length > 0) return;
  seeded = true;

  const hash = await bcrypt.hash('atlas123', 10);
  const teamUser = {
    id: nextUserId++,
    name: 'Atlas Team',
    email: 'team@atlas.app',
    password: hash,
    avatar: null,
    bio: 'The official Atlas account. Follow for road inspiration.',
    plan: 'Explorer',
    created_at: now(),
  };
  users.push(teamUser);

  const demoPosts = [
    { image_url: 'https://images.unsplash.com/photo-sCj3PwIdRvM?w=800&auto=format&fit=crop', caption: 'Tail of the Dragon — 318 curves in 11 miles. Nothing else comes close. The 911 was made for this road.', road_name: 'Tail of the Dragon (US-129)', region: 'Southeast' },
    { image_url: 'https://images.unsplash.com/photo-NeH9w4CdmnA?w=800&auto=format&fit=crop', caption: 'Beartooth Highway at sunrise. Silver 911 on the roof of America. Worth every switchback.', road_name: 'Beartooth Highway (US-212)', region: 'Mountain West' },
    { image_url: 'https://images.unsplash.com/photo-F8NXa0WH5wk?w=800&auto=format&fit=crop', caption: 'Pacific Coast Highway. Windows down, 911 in GT Silver, ocean to the left. Nothing beats it.', road_name: 'Pacific Coast Highway (CA-1)', region: 'West Coast' },
    { image_url: 'https://images.unsplash.com/photo-ZUwJ_aP1ED8?w=800&auto=format&fit=crop', caption: 'Million Dollar Highway descending to Ouray. Blue 911 on Colorado\'s finest piece of tarmac.', road_name: 'Million Dollar Highway (US-550)', region: 'Mountain West' },
    { image_url: 'https://images.unsplash.com/photo-tT829CAphnM?w=800&auto=format&fit=crop', caption: 'Skyline Drive in the fall. The M3 felt right at home on this canyon of colour.', road_name: 'Skyline Drive', region: 'Northeast' },
    { image_url: 'https://images.unsplash.com/photo-AMgve6dPt-k?w=800&auto=format&fit=crop', caption: 'Going-to-the-Sun Road through Glacier NP. One of the greats — and the car earned every bend.', road_name: 'Going-to-the-Sun Road', region: 'Mountain West' },
  ];

  for (const p of demoPosts) {
    posts.push({
      id: nextPostId++,
      user_id: teamUser.id,
      image_url: p.image_url,
      caption: p.caption,
      road_name: p.road_name,
      region: p.region,
      likes: Math.floor(Math.random() * 120) + 20,
      created_at: now(),
    });
  }
}

if (require.main === module) {
  // Local dev: start the server
  seed().then(() => {
    app.listen(PORT, () => console.log(`Atlas API running on http://localhost:${PORT}`));
  });
} else {
  // Vercel serverless: export app, seed in background
  seed().catch(console.error);
  module.exports = app;
}
