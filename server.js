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

// ── Uploads directory ─────────────────────────────────────────
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
const postLikes = new Set();
let groups   = [];
let groupMembers = [];   // { group_id, user_id, joined_at }
let groupLocations = []; // { group_id, user_id, lat, lng, heading, updated_at }
let groupRoutes = [];    // { id, group_id, user_id, name, points:[{lat,lng}], created_at }
let listings = [];       // marketplace
let roads    = [];       // community road submissions
let stories  = [];       // short-lived stories

let nextUserId    = 1;
let nextPostId    = 1;
let nextCommentId = 1;
let nextGroupId   = 1;
let nextRouteId   = 1;
let nextListingId = 1;
let nextRoadId    = 1;
let nextStoryId   = 1;
let seeded = false;

function now() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
if (!IS_VERCEL) {
  app.use(express.static(path.join(__dirname)));
}
app.use('/uploads', express.static(UPLOADS_DIR));

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
function safeUser(u) { const { password: _, ...r } = u; return r; }

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
    id: nextUserId++, name: name.trim(), email: email.toLowerCase(),
    password: hash, avatar: null, bio: '', plan: 'Explorer', created_at: now(),
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
  const page_posts = sorted.slice(offset, offset + limit).map(p => postWithMeta(p, req.user?.id));
  res.json({ posts: page_posts, total: posts.length, page, pages: Math.ceil(posts.length / limit) });
});

app.post('/api/posts', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image is required.' });
  const { caption = '', road_name = '', region = '' } = req.body;
  const post = {
    id: nextPostId++, user_id: req.user.id,
    image_url: `/uploads/${req.file.filename}`,
    caption: caption.trim(), road_name: road_name.trim(), region: region.trim(),
    likes: 0, created_at: now(),
  };
  posts.push(post);
  res.status(201).json({ post: postWithMeta(post, req.user.id) });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const postId = parseInt(req.params.id);
  const idx = posts.findIndex(p => p.id === postId);
  if (idx === -1) return res.status(404).json({ error: 'Post not found.' });
  if (posts[idx].user_id !== req.user.id) return res.status(403).json({ error: 'Not your post.' });
  if (posts[idx].image_url.startsWith('/uploads/')) {
    const fp = path.join(UPLOADS_DIR, path.basename(posts[idx].image_url));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  posts.splice(idx, 1);
  comments = comments.filter(c => c.post_id !== postId);
  for (const k of postLikes) { if (k.endsWith(`-${postId}`)) postLikes.delete(k); }
  res.json({ ok: true });
});

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const postId = parseInt(req.params.id);
  const key = `${req.user.id}-${postId}`;
  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (postLikes.has(key)) {
    postLikes.delete(key); post.likes = Math.max(0, post.likes - 1);
    res.json({ liked: false, likes: post.likes });
  } else {
    postLikes.add(key); post.likes++;
    res.json({ liked: true, likes: post.likes });
  }
});

// ── Comment routes ────────────────────────────────────────────
app.get('/api/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id);
  res.json({ comments: comments.filter(c => c.post_id === postId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at)).map(commentWithMeta) });
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
  const comment = {
    id: nextCommentId++, post_id: parseInt(req.params.id),
    user_id: req.user.id, body: body.trim(), created_at: now(),
  };
  comments.push(comment);
  res.status(201).json({ comment: commentWithMeta(comment) });
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const idx = comments.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Comment not found.' });
  if (comments[idx].user_id !== req.user.id) return res.status(403).json({ error: 'Not your comment.' });
  comments.splice(idx, 1);
  res.json({ ok: true });
});

// ── Stories routes ────────────────────────────────────────────
app.get('/api/stories', optionalAuth, (req, res) => {
  // Stories expire after 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  stories = stories.filter(s => s.created_at > cutoff);
  res.json({ stories: stories.map(s => {
    const user = users.find(u => u.id === s.user_id) || {};
    return { ...s, user_name: user.name || '', user_avatar: user.avatar || null };
  })});
});

app.post('/api/stories', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'An image is required.' });
  const story = {
    id: nextStoryId++, user_id: req.user.id,
    image_url: `/uploads/${req.file.filename}`,
    road_name: (req.body.road_name || '').trim(),
    created_at: now(),
  };
  stories.push(story);
  const user = users.find(u => u.id === req.user.id) || {};
  res.status(201).json({ story: { ...story, user_name: user.name || '', user_avatar: user.avatar || null } });
});

// ── Groups routes ─────────────────────────────────────────────
app.get('/api/groups', optionalAuth, (req, res) => {
  res.json({ groups: groups.map(g => {
    const creator = users.find(u => u.id === g.creator_id) || {};
    const memberCount = groupMembers.filter(m => m.group_id === g.id).length;
    const isMember = req.user ? groupMembers.some(m => m.group_id === g.id && m.user_id === req.user.id) : false;
    return { ...g, creator_name: creator.name || '', member_count: memberCount, is_member: isMember };
  })});
});

app.post('/api/groups', requireAuth, (req, res) => {
  const { name, description = '', meeting_point = '', route_name = '' } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required.' });
  const group = {
    id: nextGroupId++, creator_id: req.user.id,
    name: name.trim(), description: description.trim(),
    meeting_point: meeting_point.trim(), route_name: route_name.trim(),
    created_at: now(),
  };
  groups.push(group);
  // Creator auto-joins
  groupMembers.push({ group_id: group.id, user_id: req.user.id, joined_at: now() });
  const creator = users.find(u => u.id === req.user.id) || {};
  res.status(201).json({ group: { ...group, creator_name: creator.name || '', member_count: 1, is_member: true } });
});

app.get('/api/groups/:id', optionalAuth, (req, res) => {
  const groupId = parseInt(req.params.id);
  const group = groups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ error: 'Group not found.' });
  const creator = users.find(u => u.id === group.creator_id) || {};
  const members = groupMembers.filter(m => m.group_id === groupId).map(m => {
    const user = users.find(u => u.id === m.user_id) || {};
    return { user_id: m.user_id, name: user.name || '', avatar: user.avatar, joined_at: m.joined_at };
  });
  const isMember = req.user ? members.some(m => m.user_id === req.user.id) : false;
  res.json({ group: { ...group, creator_name: creator.name || '', members, member_count: members.length, is_member: isMember } });
});

app.post('/api/groups/:id/join', requireAuth, (req, res) => {
  const groupId = parseInt(req.params.id);
  if (!groups.find(g => g.id === groupId)) return res.status(404).json({ error: 'Group not found.' });
  if (groupMembers.some(m => m.group_id === groupId && m.user_id === req.user.id))
    return res.status(409).json({ error: 'Already a member.' });
  groupMembers.push({ group_id: groupId, user_id: req.user.id, joined_at: now() });
  res.json({ ok: true });
});

app.delete('/api/groups/:id/leave', requireAuth, (req, res) => {
  const groupId = parseInt(req.params.id);
  const idx = groupMembers.findIndex(m => m.group_id === groupId && m.user_id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Not a member.' });
  groupMembers.splice(idx, 1);
  // Remove their location
  const li = groupLocations.findIndex(l => l.group_id === groupId && l.user_id === req.user.id);
  if (li !== -1) groupLocations.splice(li, 1);
  res.json({ ok: true });
});

app.post('/api/groups/:id/location', requireAuth, (req, res) => {
  const groupId = parseInt(req.params.id);
  const { lat, lng, heading = 0 } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng are required.' });
  if (!groupMembers.some(m => m.group_id === groupId && m.user_id === req.user.id))
    return res.status(403).json({ error: 'Not a member of this group.' });
  const idx = groupLocations.findIndex(l => l.group_id === groupId && l.user_id === req.user.id);
  const loc = { group_id: groupId, user_id: req.user.id, lat: parseFloat(lat), lng: parseFloat(lng), heading: parseFloat(heading) || 0, updated_at: now() };
  if (idx !== -1) groupLocations[idx] = loc;
  else groupLocations.push(loc);
  res.json({ ok: true });
});

app.get('/api/groups/:id/locations', requireAuth, (req, res) => {
  const groupId = parseInt(req.params.id);
  if (!groupMembers.some(m => m.group_id === groupId && m.user_id === req.user.id))
    return res.status(403).json({ error: 'Not a member of this group.' });
  const locs = groupLocations.filter(l => l.group_id === groupId).map(l => {
    const user = users.find(u => u.id === l.user_id) || {};
    return { ...l, user_name: user.name || '' };
  });
  res.json({ locations: locs });
});

app.get('/api/groups/:id/routes', (req, res) => {
  const groupId = parseInt(req.params.id);
  res.json({ routes: groupRoutes.filter(r => r.group_id === groupId) });
});

app.post('/api/groups/:id/routes', requireAuth, (req, res) => {
  const groupId = parseInt(req.params.id);
  const { name, points } = req.body;
  if (!name || !points || !Array.isArray(points) || points.length < 2)
    return res.status(400).json({ error: 'Route name and at least 2 points are required.' });
  if (!groupMembers.some(m => m.group_id === groupId && m.user_id === req.user.id))
    return res.status(403).json({ error: 'Not a member.' });
  const route = { id: nextRouteId++, group_id: groupId, user_id: req.user.id, name: name.trim(), points, created_at: now() };
  groupRoutes.push(route);
  res.status(201).json({ route });
});

// ── Marketplace routes ────────────────────────────────────────
app.get('/api/marketplace', (req, res) => {
  const { category } = req.query;
  let result = [...listings].sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (category && category !== 'All') result = result.filter(l => l.category === category);
  res.json({ listings: result.map(l => {
    const user = users.find(u => u.id === l.user_id) || {};
    return { ...l, seller_name: user.name || '', seller_email: user.email || '' };
  })});
});

app.post('/api/marketplace', requireAuth, upload.single('image'), (req, res) => {
  const { title, price, category = 'Other', description = '', contact = '' } = req.body;
  if (!title || !price) return res.status(400).json({ error: 'Title and price are required.' });
  const listing = {
    id: nextListingId++, user_id: req.user.id,
    title: title.trim(), price: price.trim(), category,
    description: description.trim(), contact: contact.trim(),
    image_url: req.file ? `/uploads/${req.file.filename}` : null,
    created_at: now(),
  };
  listings.push(listing);
  const user = users.find(u => u.id === req.user.id) || {};
  res.status(201).json({ listing: { ...listing, seller_name: user.name || '', seller_email: user.email || '' } });
});

app.delete('/api/marketplace/:id', requireAuth, (req, res) => {
  const idx = listings.findIndex(l => l.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Listing not found.' });
  if (listings[idx].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });
  listings.splice(idx, 1);
  res.json({ ok: true });
});

// ── Community Roads routes ────────────────────────────────────
app.get('/api/roads', (req, res) => {
  res.json({ roads: roads.map(r => {
    const user = users.find(u => u.id === r.user_id) || {};
    return { ...r, submitted_by: user.name || 'Anonymous' };
  })});
});

app.post('/api/roads', requireAuth, (req, res) => {
  const { name, region = '', description = '', difficulty = 'Moderate', points } = req.body;
  if (!name || !points || !Array.isArray(points) || points.length < 2)
    return res.status(400).json({ error: 'Road name and at least 2 coordinates are required.' });
  const road = {
    id: nextRoadId++, user_id: req.user.id,
    name: name.trim(), region: region.trim(), description: description.trim(),
    difficulty, points, likes: 0, created_at: now(),
  };
  roads.push(road);
  const user = users.find(u => u.id === req.user.id) || {};
  res.status(201).json({ road: { ...road, submitted_by: user.name || '' } });
});

app.post('/api/roads/:id/like', requireAuth, (req, res) => {
  const road = roads.find(r => r.id === parseInt(req.params.id));
  if (!road) return res.status(404).json({ error: 'Road not found.' });
  road.likes = (road.likes || 0) + 1;
  res.json({ likes: road.likes });
});

app.delete('/api/roads/:id', requireAuth, (req, res) => {
  const idx = roads.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Road not found.' });
  if (roads[idx].user_id !== req.user.id) return res.status(403).json({ error: 'Not your road.' });
  roads.splice(idx, 1);
  res.json({ ok: true });
});

// ── Seed ──────────────────────────────────────────────────────
async function seed() {
  if (seeded || users.length > 0) return;
  seeded = true;

  const hash = await bcrypt.hash('atlas123', 10);
  const teamUser = {
    id: nextUserId++, name: 'Atlas Team', email: 'team@atlas.app',
    password: hash, avatar: null, bio: 'The official Atlas account.',
    plan: 'Explorer', created_at: now(),
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
    posts.push({ id: nextPostId++, user_id: teamUser.id, ...p,
      likes: Math.floor(Math.random() * 120) + 20, created_at: now() });
  }

  // Seed demo groups
  const demoGroups = [
    { name: 'Pacific Coast Runners', description: 'Weekly drives along PCH and mountain roads of Southern California.', meeting_point: 'Malibu, CA', route_name: 'Pacific Coast Highway' },
    { name: 'Dragon Slayers', description: 'Dedicated to the Tail of the Dragon and Cherohala Skyway. All makes welcome.', meeting_point: 'Deals Gap, NC', route_name: 'US-129 Loop' },
    { name: 'Rocky Mountain Rally', description: 'Colorado and Wyoming alpine passes. Beartooth, Million Dollar Hwy, Trail Ridge.', meeting_point: 'Denver, CO', route_name: 'Alpine Triangle' },
  ];
  for (const g of demoGroups) {
    const group = { id: nextGroupId++, creator_id: teamUser.id, ...g, created_at: now() };
    groups.push(group);
    groupMembers.push({ group_id: group.id, user_id: teamUser.id, joined_at: now() });
  }

  // Seed demo marketplace listings
  const demoListings = [
    { title: 'Porsche 911 GT3 RS — Track Ready', price: '$289,000', category: 'Cars', description: '2023 GT3 RS, Weissach Package, 1,200 miles. Immaculate. Full service history. Spare set of Michelin Cup 2 R tires included.' },
    { title: 'BMW M3 Competition — Frozen Isle Green', price: '$82,500', category: 'Cars', description: '2022 F80 M3 Competition, 6-speed manual. Carbon seats, track package, extended merino leather.' },
    { title: 'Akrapovič Titanium Exhaust — 992 GT3', price: '$4,200', category: 'Mods', description: 'Full titanium slip-on system for 992 GT3. Incredible sound, 4 kg weight savings. Near new, under 500 miles.' },
    { title: 'Michelin Pilot Cup 2 R — 305/30/20 (set of 2)', price: '$1,100', category: 'Wheels', description: 'Rear tires for 992. Half a track day on them, 7/10 tread remaining. Perfect for a track day or two.' },
    { title: 'Racepak IQ3 Street Dash Logger', price: '$650', category: 'Electronics', description: 'Full digital dash with GPS lap timing, 0-60 timer, G-sensor. Includes all harness adapters.' },
    { title: 'Brembo GT Brake Kit — M4 Front', price: '$3,800', category: 'Mods', description: 'Six-piston Brembo GT kit for F8x M3/M4. Includes 380mm slotted discs and pads. Barely used.' },
  ];
  for (const l of demoListings) {
    listings.push({ id: nextListingId++, user_id: teamUser.id, image_url: null, contact: 'team@atlas.app', ...l, created_at: now() });
  }

  // Seed demo community roads
  const demoRoads = [
    { name: 'Tail of the Dragon', region: 'Southeast', description: '318 curves, 11 miles. Zero intersections.', difficulty: 'Expert', points: [[35.47,-83.99],[35.49,-83.96],[35.51,-83.93],[35.47,-83.88]] },
    { name: 'Beartooth Highway', region: 'Mountain West', description: 'US-212 from Red Lodge to Cooke City. America\'s most beautiful road.', difficulty: 'Moderate', points: [[45.18,-109.25],[45.1,-109.35],[45.03,-109.54],[44.97,-109.7]] },
    { name: 'Pacific Coast Highway', region: 'West Coast', description: 'CA-1 along the Big Sur coast. Ocean cliffs, switchbacks, perfection.', difficulty: 'Easy', points: [[35.9,-121.5],[35.7,-121.3],[35.55,-121.1],[35.2,-120.8]] },
    { name: 'Million Dollar Highway', region: 'Mountain West', description: 'US-550 between Ouray and Silverton. No guardrails, stunning drops.', difficulty: 'Expert', points: [[38.02,-107.67],[37.95,-107.7],[37.83,-107.73],[37.81,-107.66]] },
    { name: 'Going-to-the-Sun Road', region: 'Mountain West', description: 'Crosses the Continental Divide through Glacier NP.', difficulty: 'Moderate', points: [[48.5,-113.8],[48.6,-113.65],[48.7,-113.5],[48.75,-113.35]] },
    { name: 'Skyline Drive', region: 'Northeast', description: 'Ridge-top drive through Shenandoah NP. 105 miles of pure scenery.', difficulty: 'Easy', points: [[38.88,-78.19],[38.7,-78.3],[38.5,-78.5],[38.3,-78.7]] },
  ];
  for (const r of demoRoads) {
    roads.push({ id: nextRoadId++, user_id: teamUser.id, ...r, likes: Math.floor(Math.random() * 80) + 10, created_at: now() });
  }
}

if (require.main === module) {
  seed().then(() => {
    app.listen(PORT, () => console.log(`Atlas API running on http://localhost:${PORT}`));
  });
} else {
  seed().catch(console.error);
  module.exports = app;
}
