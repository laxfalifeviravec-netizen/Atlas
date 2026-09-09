/* ============================================================
   Atlas — API Server (Express + Supabase)
   ============================================================ */

const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const multer    = require('multer');
const cors      = require('cors');
const path      = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Pool }  = require('pg');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET     = process.env.JWT_SECRET     || 'atlas-jwt-secret-change-in-production';
const SUPABASE_URL   = process.env.SUPABASE_URL   || '';
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const DATABASE_URL   = process.env.DATABASE_URL   || '';
const IS_VERCEL      = !!process.env.VERCEL;

// ── Supabase client ───────────────────────────────────────────
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
} else {
  console.warn('⚠  SUPABASE_URL / SUPABASE_SERVICE_KEY not set — running with in-memory fallback.');
}

// ── Auto-migration (runs on first cold start in Vercel) ───────
let migrationDone = false;
const MIGRATION_SQL = `
  create table if not exists users (
    id bigserial primary key,
    name text not null,
    email text unique not null,
    password_hash text not null,
    avatar text,
    bio text default '',
    plan text default 'Explorer',
    created_at timestamptz default now()
  );
  create table if not exists posts (
    id bigserial primary key,
    user_id bigint references users(id) on delete cascade,
    image_url text not null,
    caption text default '',
    road_name text default '',
    region text default '',
    likes integer default 0,
    created_at timestamptz default now()
  );
  create table if not exists post_likes (
    user_id bigint references users(id) on delete cascade,
    post_id bigint references posts(id) on delete cascade,
    primary key (user_id, post_id)
  );
  create table if not exists comments (
    id bigserial primary key,
    post_id bigint references posts(id) on delete cascade,
    user_id bigint references users(id) on delete cascade,
    body text not null,
    created_at timestamptz default now()
  );
  create table if not exists stories (
    id bigserial primary key,
    user_id bigint references users(id) on delete cascade,
    image_url text not null,
    road_name text default '',
    created_at timestamptz default now()
  );
  create table if not exists groups (
    id bigserial primary key,
    creator_id bigint references users(id) on delete cascade,
    name text not null,
    description text default '',
    meeting_point text default '',
    route_name text default '',
    created_at timestamptz default now()
  );
  create table if not exists group_members (
    group_id bigint references groups(id) on delete cascade,
    user_id bigint references users(id) on delete cascade,
    joined_at timestamptz default now(),
    primary key (group_id, user_id)
  );
  create table if not exists group_locations (
    group_id bigint references groups(id) on delete cascade,
    user_id bigint references users(id) on delete cascade,
    lat double precision not null,
    lng double precision not null,
    heading double precision default 0,
    updated_at timestamptz default now(),
    primary key (group_id, user_id)
  );
  create table if not exists group_routes (
    id bigserial primary key,
    group_id bigint references groups(id) on delete cascade,
    user_id bigint references users(id) on delete cascade,
    name text not null,
    points jsonb not null,
    created_at timestamptz default now()
  );
  create table if not exists listings (
    id bigserial primary key,
    user_id bigint references users(id) on delete cascade,
    title text not null,
    price text not null,
    category text default 'Other',
    description text default '',
    contact text default '',
    image_url text,
    created_at timestamptz default now()
  );
  create table if not exists roads (
    id bigserial primary key,
    user_id bigint references users(id) on delete cascade,
    name text not null,
    region text default '',
    description text default '',
    difficulty text default 'Moderate',
    points jsonb not null,
    likes integer default 0,
    created_at timestamptz default now()
  );
  create or replace function increment_likes(pid bigint)
    returns void language sql as $$ update posts set likes = likes + 1 where id = pid; $$;
  create or replace function decrement_likes(pid bigint)
    returns void language sql as $$ update posts set likes = greatest(0, likes - 1) where id = pid; $$;
  create or replace function increment_road_likes(rid bigint)
    returns void language sql as $$ update roads set likes = likes + 1 where id = rid; $$;
`;

async function runMigrations() {
  if (migrationDone) return;
  migrationDone = true;
  if (!DATABASE_URL) {
    console.warn('⚠  DATABASE_URL not set — skipping auto-migration.');
    return;
  }
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
  try {
    await pool.query(MIGRATION_SQL);
    console.log('✓ Database schema up to date.');
  } catch (e) {
    console.error('Migration error:', e.message);
  } finally {
    await pool.end();
  }
}

// ── Multer: memory storage (upload to Supabase Storage) ───────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed.'));
  },
});

// ── Upload helper (Supabase Storage) ─────────────────────────
async function uploadImage(file) {
  if (!supabase) return null;
  const ext  = path.extname(file.originalname || 'img').toLowerCase() || '.jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const { error } = await supabase.storage
    .from('uploads')
    .upload(name, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('uploads').getPublicUrl(name);
  return data.publicUrl;
}

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
if (!IS_VERCEL) {
  app.use(express.static(path.join(__dirname)));
}

// ── Auth middleware ───────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), JWT_SECRET); } catch {}
  }
  next();
}

// ── DB helpers (with in-memory fallback) ─────────────────────
// Fallback store (used only when Supabase env vars are missing)
const mem = {
  users: [], posts: [], comments: [],
  postLikes: new Set(), groups: [], groupMembers: [],
  groupLocations: [], groupRoutes: [], listings: [], roads: [], stories: [],
  ids: { user:1, post:1, comment:1, group:1, route:1, listing:1, road:1, story:1 },
};
let seeded = false;
function nowIso() { return new Date().toISOString(); }

// ── Auth routes ───────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address.' });

    const hash = await bcrypt.hash(password, 10);

    if (supabase) {
      // Check duplicate
      const { data: existing } = await supabase.from('users')
        .select('id').eq('email', email.toLowerCase()).maybeSingle();
      if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

      const { data: user, error } = await supabase.from('users')
        .insert({ name: name.trim(), email: email.toLowerCase(), password_hash: hash, plan: 'Explorer' })
        .select('id,name,email,avatar,bio,plan,created_at').single();
      if (error) throw error;

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      return res.status(201).json({ token, user });
    } else {
      // Fallback
      if (mem.users.find(u => u.email === email.toLowerCase()))
        return res.status(409).json({ error: 'An account with that email already exists.' });
      const user = { id: mem.ids.user++, name: name.trim(), email: email.toLowerCase(),
        password_hash: hash, avatar: null, bio: '', plan: 'Explorer', created_at: nowIso() };
      mem.users.push(user);
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      const { password_hash: _, ...safe } = user;
      return res.status(201).json({ token, user: safe });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    if (supabase) {
      const { data: user } = await supabase.from('users')
        .select('id,name,email,password_hash,avatar,bio,plan,created_at')
        .eq('email', email.toLowerCase()).maybeSingle();
      if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
      if (!await bcrypt.compare(password, user.password_hash))
        return res.status(401).json({ error: 'Invalid email or password.' });
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      const { password_hash: _, ...safe } = user;
      return res.json({ token, user: safe });
    } else {
      const user = mem.users.find(u => u.email === email.toLowerCase());
      if (!user || !await bcrypt.compare(password, user.password_hash))
        return res.status(401).json({ error: 'Invalid email or password.' });
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      const { password_hash: _, ...safe } = user;
      return res.json({ token, user: safe });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (supabase) {
      const { data: user } = await supabase.from('users')
        .select('id,name,email,avatar,bio,plan,created_at')
        .eq('id', req.user.id).maybeSingle();
      if (!user) return res.status(404).json({ error: 'User not found.' });
      return res.json({ user });
    } else {
      const user = mem.users.find(u => u.id === req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      const { password_hash: _, ...safe } = user;
      return res.json({ user: safe });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Posts ─────────────────────────────────────────────────────
app.get('/api/posts', optionalAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(24, parseInt(req.query.limit) || 12);
    const from  = (page - 1) * limit;

    if (supabase) {
      const { data: posts, count } = await supabase.from('posts')
        .select('*,users(name,avatar)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      // Fetch which ones this user liked
      let likedSet = new Set();
      if (req.user) {
        const ids = posts.map(p => p.id);
        if (ids.length) {
          const { data: likes } = await supabase.from('post_likes')
            .select('post_id').eq('user_id', req.user.id).in('post_id', ids);
          likedSet = new Set(likes.map(l => l.post_id));
        }
      }
      const shaped = posts.map(p => ({
        id: p.id, user_id: p.user_id,
        user_name: p.users?.name || '',
        user_avatar: p.users?.avatar || null,
        image_url: p.image_url, caption: p.caption,
        road_name: p.road_name, region: p.region,
        likes: p.likes, created_at: p.created_at,
        liked: likedSet.has(p.id),
      }));
      return res.json({ posts: shaped, total: count || 0, page, pages: Math.ceil((count || 0) / limit) });
    } else {
      await maybeMemSeed();
      const uid = req.user?.id;
      const sorted = [...mem.posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
      const slice = sorted.slice(from, from + limit).map(p => {
        const u = mem.users.find(u => u.id === p.user_id) || {};
        return { ...p, user_name: u.name||'', user_avatar: u.avatar||null, liked: uid ? mem.postLikes.has(`${uid}-${p.id}`) : false };
      });
      return res.json({ posts: slice, total: mem.posts.length, page, pages: Math.ceil(mem.posts.length / limit) });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image is required.' });
    const { caption = '', road_name = '', region = '' } = req.body;

    if (supabase) {
      const image_url = await uploadImage(req.file);
      if (!image_url) return res.status(500).json({ error: 'Image upload failed.' });
      const { data: post, error } = await supabase.from('posts')
        .insert({ user_id: req.user.id, image_url, caption: caption.trim(),
          road_name: road_name.trim(), region: region.trim() })
        .select('*,users(name,avatar)').single();
      if (error) throw error;
      return res.status(201).json({ post: { ...post, user_name: post.users?.name||'', liked: false } });
    } else {
      const image_url = `/api/mem-img/${Date.now()}`;
      const post = { id: mem.ids.post++, user_id: req.user.id, image_url, caption: caption.trim(),
        road_name: road_name.trim(), region: region.trim(), likes: 0, created_at: nowIso() };
      mem.posts.push(post);
      const u = mem.users.find(u => u.id === req.user.id) || {};
      return res.status(201).json({ post: { ...post, user_name: u.name||'', liked: false } });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (supabase) {
      const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).maybeSingle();
      if (!post) return res.status(404).json({ error: 'Post not found.' });
      if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Not your post.' });
      await supabase.from('posts').delete().eq('id', postId);
    } else {
      const idx = mem.posts.findIndex(p => p.id === postId);
      if (idx === -1) return res.status(404).json({ error: 'Post not found.' });
      if (mem.posts[idx].user_id !== req.user.id) return res.status(403).json({ error: 'Not your post.' });
      mem.posts.splice(idx, 1);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;

    if (supabase) {
      const { data: existing } = await supabase.from('post_likes')
        .select('post_id').eq('user_id', userId).eq('post_id', postId).maybeSingle();
      if (existing) {
        await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId);
        await supabase.rpc('decrement_likes', { pid: postId });
        const { data: p } = await supabase.from('posts').select('likes').eq('id', postId).single();
        return res.json({ liked: false, likes: p?.likes ?? 0 });
      } else {
        await supabase.from('post_likes').insert({ user_id: userId, post_id: postId });
        await supabase.rpc('increment_likes', { pid: postId });
        const { data: p } = await supabase.from('posts').select('likes').eq('id', postId).single();
        return res.json({ liked: true, likes: p?.likes ?? 1 });
      }
    } else {
      const post = mem.posts.find(p => p.id === postId);
      if (!post) return res.status(404).json({ error: 'Post not found.' });
      const key = `${userId}-${postId}`;
      if (mem.postLikes.has(key)) {
        mem.postLikes.delete(key); post.likes = Math.max(0, post.likes - 1);
        return res.json({ liked: false, likes: post.likes });
      } else {
        mem.postLikes.add(key); post.likes++;
        return res.json({ liked: true, likes: post.likes });
      }
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Comments ──────────────────────────────────────────────────
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (supabase) {
      const { data } = await supabase.from('comments')
        .select('*,users(name,avatar)').eq('post_id', postId).order('created_at');
      return res.json({ comments: data.map(c => ({ ...c, user_name: c.users?.name||'' })) });
    } else {
      const cs = mem.comments.filter(c => c.post_id === postId).sort((a,b) => a.created_at.localeCompare(b.created_at))
        .map(c => { const u = mem.users.find(u => u.id === c.user_id)||{}; return { ...c, user_name: u.name||'' }; });
      return res.json({ comments: cs });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
    const postId = parseInt(req.params.id);
    if (supabase) {
      const { data: c, error } = await supabase.from('comments')
        .insert({ post_id: postId, user_id: req.user.id, body: body.trim() })
        .select('*,users(name,avatar)').single();
      if (error) throw error;
      return res.status(201).json({ comment: { ...c, user_name: c.users?.name||'' } });
    } else {
      const c = { id: mem.ids.comment++, post_id: postId, user_id: req.user.id, body: body.trim(), created_at: nowIso() };
      mem.comments.push(c);
      const u = mem.users.find(u => u.id === req.user.id)||{};
      return res.status(201).json({ comment: { ...c, user_name: u.name||'' } });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Stories ───────────────────────────────────────────────────
app.get('/api/stories', optionalAuth, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (supabase) {
      const { data } = await supabase.from('stories')
        .select('*,users(name,avatar)').gte('created_at', cutoff).order('created_at', { ascending: false });
      return res.json({ stories: data.map(s => ({ ...s, user_name: s.users?.name||'' })) });
    } else {
      const ss = mem.stories.filter(s => s.created_at > cutoff)
        .map(s => { const u = mem.users.find(u => u.id === s.user_id)||{}; return { ...s, user_name: u.name||'' }; });
      return res.json({ stories: ss });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/stories', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image is required.' });
    if (supabase) {
      const image_url = await uploadImage(req.file);
      if (!image_url) return res.status(500).json({ error: 'Image upload failed.' });
      const { data: s, error } = await supabase.from('stories')
        .insert({ user_id: req.user.id, image_url, road_name: (req.body.road_name||'').trim() })
        .select('*,users(name,avatar)').single();
      if (error) throw error;
      return res.status(201).json({ story: { ...s, user_name: s.users?.name||'' } });
    } else {
      const s = { id: mem.ids.story++, user_id: req.user.id, image_url: '/api/mem-img/s', road_name: (req.body.road_name||'').trim(), created_at: nowIso() };
      mem.stories.push(s);
      const u = mem.users.find(u => u.id === req.user.id)||{};
      return res.status(201).json({ story: { ...s, user_name: u.name||'' } });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Groups ────────────────────────────────────────────────────
app.get('/api/groups', optionalAuth, async (req, res) => {
  try {
    if (supabase) {
      const { data: groups } = await supabase.from('groups')
        .select('*,users!groups_creator_id_fkey(name)').order('created_at', { ascending: false });
      const { data: members } = await supabase.from('group_members').select('group_id,user_id');
      const uid = req.user?.id;
      const shaped = groups.map(g => ({
        ...g, creator_name: g.users?.name||'',
        member_count: members.filter(m => m.group_id === g.id).length,
        is_member: uid ? members.some(m => m.group_id === g.id && m.user_id === uid) : false,
      }));
      return res.json({ groups: shaped });
    } else {
      await maybeMemSeed();
      const uid = req.user?.id;
      const gs = mem.groups.map(g => {
        const u = mem.users.find(u => u.id === g.creator_id)||{};
        return { ...g, creator_name: u.name||'',
          member_count: mem.groupMembers.filter(m => m.group_id === g.id).length,
          is_member: uid ? mem.groupMembers.some(m => m.group_id === g.id && m.user_id === uid) : false };
      });
      return res.json({ groups: gs });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    const { name, description='', meeting_point='', route_name='' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required.' });
    if (supabase) {
      const { data: group, error } = await supabase.from('groups')
        .insert({ creator_id: req.user.id, name: name.trim(), description: description.trim(), meeting_point: meeting_point.trim(), route_name: route_name.trim() })
        .select('*,users!groups_creator_id_fkey(name)').single();
      if (error) throw error;
      await supabase.from('group_members').insert({ group_id: group.id, user_id: req.user.id });
      return res.status(201).json({ group: { ...group, creator_name: group.users?.name||'', member_count: 1, is_member: true } });
    } else {
      const g = { id: mem.ids.group++, creator_id: req.user.id, name: name.trim(), description: description.trim(), meeting_point: meeting_point.trim(), route_name: route_name.trim(), created_at: nowIso() };
      mem.groups.push(g);
      mem.groupMembers.push({ group_id: g.id, user_id: req.user.id, joined_at: nowIso() });
      const u = mem.users.find(u => u.id === req.user.id)||{};
      return res.status(201).json({ group: { ...g, creator_name: u.name||'', member_count: 1, is_member: true } });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/groups/:id', optionalAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (supabase) {
      const { data: group } = await supabase.from('groups')
        .select('*,users!groups_creator_id_fkey(name)').eq('id', groupId).maybeSingle();
      if (!group) return res.status(404).json({ error: 'Group not found.' });
      const { data: members } = await supabase.from('group_members')
        .select('user_id,joined_at,users(name,avatar)').eq('group_id', groupId);
      const uid = req.user?.id;
      return res.json({ group: { ...group, creator_name: group.users?.name||'',
        members: members.map(m => ({ user_id: m.user_id, name: m.users?.name||'', avatar: m.users?.avatar||null, joined_at: m.joined_at })),
        member_count: members.length, is_member: uid ? members.some(m => m.user_id === uid) : false } });
    } else {
      const g = mem.groups.find(g => g.id === groupId);
      if (!g) return res.status(404).json({ error: 'Group not found.' });
      const creator = mem.users.find(u => u.id === g.creator_id)||{};
      const members = mem.groupMembers.filter(m => m.group_id === groupId).map(m => {
        const u = mem.users.find(u => u.id === m.user_id)||{};
        return { user_id: m.user_id, name: u.name||'', avatar: u.avatar||null, joined_at: m.joined_at };
      });
      const uid = req.user?.id;
      return res.json({ group: { ...g, creator_name: creator.name||'', members, member_count: members.length, is_member: uid ? members.some(m => m.user_id === uid) : false } });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/groups/:id/join', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (supabase) {
      const { data: existing } = await supabase.from('group_members')
        .select('group_id').eq('group_id', groupId).eq('user_id', req.user.id).maybeSingle();
      if (existing) return res.status(409).json({ error: 'Already a member.' });
      await supabase.from('group_members').insert({ group_id: groupId, user_id: req.user.id });
    } else {
      if (mem.groupMembers.some(m => m.group_id === groupId && m.user_id === req.user.id))
        return res.status(409).json({ error: 'Already a member.' });
      mem.groupMembers.push({ group_id: groupId, user_id: req.user.id, joined_at: nowIso() });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/groups/:id/leave', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (supabase) {
      await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', req.user.id);
      await supabase.from('group_locations').delete().eq('group_id', groupId).eq('user_id', req.user.id);
    } else {
      const idx = mem.groupMembers.findIndex(m => m.group_id === groupId && m.user_id === req.user.id);
      if (idx !== -1) mem.groupMembers.splice(idx, 1);
      const li = mem.groupLocations.findIndex(l => l.group_id === groupId && l.user_id === req.user.id);
      if (li !== -1) mem.groupLocations.splice(li, 1);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/groups/:id/location', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { lat, lng, heading = 0 } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng are required.' });
    if (supabase) {
      await supabase.from('group_locations').upsert({
        group_id: groupId, user_id: req.user.id,
        lat: parseFloat(lat), lng: parseFloat(lng), heading: parseFloat(heading)||0,
        updated_at: nowIso(),
      }, { onConflict: 'group_id,user_id' });
    } else {
      const loc = { group_id: groupId, user_id: req.user.id, lat: parseFloat(lat), lng: parseFloat(lng), heading: parseFloat(heading)||0, updated_at: nowIso() };
      const idx = mem.groupLocations.findIndex(l => l.group_id === groupId && l.user_id === req.user.id);
      if (idx !== -1) mem.groupLocations[idx] = loc; else mem.groupLocations.push(loc);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/groups/:id/locations', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (supabase) {
      const { data } = await supabase.from('group_locations')
        .select('*,users(name)').eq('group_id', groupId);
      return res.json({ locations: data.map(l => ({ ...l, user_name: l.users?.name||'' })) });
    } else {
      const locs = mem.groupLocations.filter(l => l.group_id === groupId).map(l => {
        const u = mem.users.find(u => u.id === l.user_id)||{};
        return { ...l, user_name: u.name||'' };
      });
      return res.json({ locations: locs });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/groups/:id/routes', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (supabase) {
      const { data } = await supabase.from('group_routes').select('*').eq('group_id', groupId);
      return res.json({ routes: data });
    } else {
      return res.json({ routes: mem.groupRoutes.filter(r => r.group_id === groupId) });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/groups/:id/routes', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { name, points } = req.body;
    if (!name || !Array.isArray(points) || points.length < 2)
      return res.status(400).json({ error: 'Route name and at least 2 points are required.' });
    if (supabase) {
      const { data: r, error } = await supabase.from('group_routes')
        .insert({ group_id: groupId, user_id: req.user.id, name: name.trim(), points })
        .select('*').single();
      if (error) throw error;
      return res.status(201).json({ route: r });
    } else {
      const r = { id: mem.ids.route++, group_id: groupId, user_id: req.user.id, name: name.trim(), points, created_at: nowIso() };
      mem.groupRoutes.push(r);
      return res.status(201).json({ route: r });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Marketplace ───────────────────────────────────────────────
app.get('/api/marketplace', async (req, res) => {
  try {
    const { category } = req.query;
    if (supabase) {
      let q = supabase.from('listings').select('*,users(name,email)').order('created_at', { ascending: false });
      if (category && category !== 'All') q = q.eq('category', category);
      const { data } = await q;
      return res.json({ listings: data.map(l => ({ ...l, seller_name: l.users?.name||'', seller_email: l.users?.email||'' })) });
    } else {
      await maybeMemSeed();
      let ls = [...mem.listings].sort((a,b) => b.created_at.localeCompare(a.created_at));
      if (category && category !== 'All') ls = ls.filter(l => l.category === category);
      return res.json({ listings: ls.map(l => { const u = mem.users.find(u => u.id === l.user_id)||{}; return { ...l, seller_name: u.name||'', seller_email: u.email||'' }; }) });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/marketplace', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, price, category='Other', description='', contact='' } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Title and price are required.' });
    if (supabase) {
      let image_url = null;
      if (req.file) image_url = await uploadImage(req.file);
      const { data: listing, error } = await supabase.from('listings')
        .insert({ user_id: req.user.id, title: title.trim(), price: price.trim(), category, description: description.trim(), contact: contact.trim(), image_url })
        .select('*,users(name,email)').single();
      if (error) throw error;
      return res.status(201).json({ listing: { ...listing, seller_name: listing.users?.name||'', seller_email: listing.users?.email||'' } });
    } else {
      const listing = { id: mem.ids.listing++, user_id: req.user.id, title: title.trim(), price: price.trim(), category, description: description.trim(), contact: contact.trim(), image_url: null, created_at: nowIso() };
      mem.listings.push(listing);
      const u = mem.users.find(u => u.id === req.user.id)||{};
      return res.status(201).json({ listing: { ...listing, seller_name: u.name||'', seller_email: u.email||'' } });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/marketplace/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (supabase) {
      const { data: l } = await supabase.from('listings').select('user_id').eq('id', id).maybeSingle();
      if (!l) return res.status(404).json({ error: 'Listing not found.' });
      if (l.user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });
      await supabase.from('listings').delete().eq('id', id);
    } else {
      const idx = mem.listings.findIndex(l => l.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Listing not found.' });
      if (mem.listings[idx].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });
      mem.listings.splice(idx, 1);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Community Roads ───────────────────────────────────────────
app.get('/api/roads', async (req, res) => {
  try {
    if (supabase) {
      const { data } = await supabase.from('roads').select('*,users(name)').order('created_at', { ascending: false });
      return res.json({ roads: data.map(r => ({ ...r, submitted_by: r.users?.name||'Anonymous' })) });
    } else {
      await maybeMemSeed();
      return res.json({ roads: mem.roads.map(r => { const u = mem.users.find(u => u.id === r.user_id)||{}; return { ...r, submitted_by: u.name||'Anonymous' }; }) });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/roads', requireAuth, async (req, res) => {
  try {
    const { name, region='', description='', difficulty='Moderate', points } = req.body;
    if (!name || !Array.isArray(points) || points.length < 2)
      return res.status(400).json({ error: 'Road name and at least 2 coordinates are required.' });
    if (supabase) {
      const { data: road, error } = await supabase.from('roads')
        .insert({ user_id: req.user.id, name: name.trim(), region: region.trim(), description: description.trim(), difficulty, points })
        .select('*,users(name)').single();
      if (error) throw error;
      return res.status(201).json({ road: { ...road, submitted_by: road.users?.name||'' } });
    } else {
      const road = { id: mem.ids.road++, user_id: req.user.id, name: name.trim(), region: region.trim(), description: description.trim(), difficulty, points, likes: 0, created_at: nowIso() };
      mem.roads.push(road);
      const u = mem.users.find(u => u.id === req.user.id)||{};
      return res.status(201).json({ road: { ...road, submitted_by: u.name||'' } });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/roads/:id/like', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (supabase) {
      const { data } = await supabase.rpc('increment_road_likes', { rid: id });
      const { data: r } = await supabase.from('roads').select('likes').eq('id', id).single();
      return res.json({ likes: r?.likes ?? 0 });
    } else {
      const road = mem.roads.find(r => r.id === id);
      if (!road) return res.status(404).json({ error: 'Road not found.' });
      road.likes = (road.likes||0) + 1;
      return res.json({ likes: road.likes });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/roads/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (supabase) {
      const { data: r } = await supabase.from('roads').select('user_id').eq('id', id).maybeSingle();
      if (!r) return res.status(404).json({ error: 'Road not found.' });
      if (r.user_id !== req.user.id) return res.status(403).json({ error: 'Not your road.' });
      await supabase.from('roads').delete().eq('id', id);
    } else {
      const idx = mem.roads.findIndex(r => r.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Road not found.' });
      if (mem.roads[idx].user_id !== req.user.id) return res.status(403).json({ error: 'Not your road.' });
      mem.roads.splice(idx, 1);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── In-memory seed (fallback only) ───────────────────────────
async function maybeMemSeed() {
  if (seeded || mem.users.length > 0) return;
  seeded = true;
  const hash = await bcrypt.hash('atlas123', 10);
  const u = { id: mem.ids.user++, name:'Atlas Team', email:'team@atlas.app', password_hash:hash, avatar:null, bio:'', plan:'Explorer', created_at:nowIso() };
  mem.users.push(u);
  const demoPosts = [
    { image_url:'https://images.unsplash.com/photo-sCj3PwIdRvM?w=800&auto=format&fit=crop', caption:'Tail of the Dragon — 318 curves in 11 miles.', road_name:'Tail of the Dragon', region:'Southeast' },
    { image_url:'https://images.unsplash.com/photo-NeH9w4CdmnA?w=800&auto=format&fit=crop', caption:'Beartooth Highway at sunrise.', road_name:'Beartooth Highway', region:'Mountain West' },
    { image_url:'https://images.unsplash.com/photo-F8NXa0WH5wk?w=800&auto=format&fit=crop', caption:'Pacific Coast Highway. Nothing beats it.', road_name:'Pacific Coast Highway', region:'West Coast' },
  ];
  for (const p of demoPosts) mem.posts.push({ id:mem.ids.post++, user_id:u.id, ...p, likes:Math.floor(Math.random()*80)+20, created_at:nowIso() });
  const demoGroups = [
    { name:'Pacific Coast Runners', description:'Weekly drives along PCH.', meeting_point:'Malibu, CA', route_name:'Pacific Coast Highway' },
    { name:'Dragon Slayers', description:'Dedicated to Tail of the Dragon.', meeting_point:'Deals Gap, NC', route_name:'US-129 Loop' },
  ];
  for (const g of demoGroups) {
    const grp = { id:mem.ids.group++, creator_id:u.id, ...g, created_at:nowIso() };
    mem.groups.push(grp);
    mem.groupMembers.push({ group_id:grp.id, user_id:u.id, joined_at:nowIso() });
  }
  const demoListings = [
    { title:'Porsche 911 GT3 RS', price:'$289,000', category:'Cars', description:'2023 GT3 RS, Weissach Package.', contact:'team@atlas.app' },
    { title:'Akrapovič Exhaust — 992 GT3', price:'$4,200', category:'Mods', description:'Full titanium slip-on.', contact:'team@atlas.app' },
  ];
  for (const l of demoListings) mem.listings.push({ id:mem.ids.listing++, user_id:u.id, image_url:null, ...l, created_at:nowIso() });
  const demoRoads = [
    { name:'Tail of the Dragon', region:'Southeast', description:'318 curves, 11 miles.', difficulty:'Expert', points:[[35.47,-83.99],[35.49,-83.96],[35.51,-83.93],[35.47,-83.88]] },
    { name:'Pacific Coast Highway', region:'West Coast', description:'CA-1 Big Sur coast.', difficulty:'Easy', points:[[35.9,-121.5],[35.7,-121.3],[35.55,-121.1],[35.2,-120.8]] },
    { name:'Beartooth Highway', region:'Mountain West', description:'US-212 — America\'s most beautiful road.', difficulty:'Moderate', points:[[45.18,-109.25],[45.1,-109.35],[45.03,-109.54],[44.97,-109.7]] },
  ];
  for (const r of demoRoads) mem.roads.push({ id:mem.ids.road++, user_id:u.id, ...r, likes:Math.floor(Math.random()*60)+10, created_at:nowIso() });
}

// ── Start ─────────────────────────────────────────────────────
if (require.main === module) {
  runMigrations().then(() => maybeMemSeed()).then(() => {
    app.listen(PORT, () => console.log(`Atlas API → http://localhost:${PORT}`));
  });
} else {
  runMigrations().catch(console.error);
  maybeMemSeed().catch(console.error);
  module.exports = app;
}
