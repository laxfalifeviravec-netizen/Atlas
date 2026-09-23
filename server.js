/* ============================================================
   One Culture — API Server
   Uses Supabase (Postgres + Storage) when SUPABASE_URL and
   SUPABASE_SERVICE_KEY are set; falls back to in-memory for
   local dev without credentials.
   ============================================================ */

const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const rateLimit  = require('express-rate-limit');
const { Resend } = require('resend');

const app = express();
const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'culture-jwt-secret-change-in-production';
const IS_VERCEL  = !!process.env.VERCEL;
const APP_URL    = process.env.APP_URL || 'https://culture.vercel.app';
const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Culture <noreply@one-culture.app>';

const resendClient = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// ── Rate limiters ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  skip: () => !IS_VERCEL,
  validate: { xForwardedForHeader: false },
});
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many reset requests. Try again in an hour.' },
  skip: () => !IS_VERCEL,
  validate: { xForwardedForHeader: false },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
  skip: () => !IS_VERCEL,
  validate: { xForwardedForHeader: false },
});

// ── Supabase ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);

let sb = null;
if (USE_SUPABASE) {
  const { createClient } = require('@supabase/supabase-js');
  sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  console.log('✓ Supabase connected');
} else {
  console.warn('⚠  SUPABASE_URL / SUPABASE_SERVICE_KEY not set — running in-memory fallback');
}

// ── Image upload ──────────────────────────────────────────────
// Memory storage when using Supabase (buffer → Storage upload)
// Disk storage for local dev without Supabase
const UPLOADS_DIR = IS_VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!USE_SUPABASE && !fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: USE_SUPABASE
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOADS_DIR),
        filename:    (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        },
      }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed.'));
  },
});

async function storeImage(file) {
  if (USE_SUPABASE) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const { error } = await sb.storage.from('uploads').upload(filename, file.buffer, {
      contentType: file.mimetype, upsert: false,
    });
    if (error) throw error;
    const { data } = sb.storage.from('uploads').getPublicUrl(filename);
    return data.publicUrl;
  }
  return `/uploads/${file.filename}`;
}

// ── In-memory fallback store ──────────────────────────────────
let _users = [], _posts = [], _comments = [], _postLikes = new Set();
let _groups = [], _groupMembers = [], _groupLocations = [], _groupRoutes = [];
let _listings = [], _roads = [], _stories = [];
let _uid = 1, _pid = 1, _cid = 1, _gid = 1, _rid = 1, _lid = 1, _roadId = 1, _sid = 1;
let _seeded = false;
function now() { return new Date().toISOString(); }

// ── Middleware ────────────────────────────────────────────────
app.set('trust proxy', 1); // Vercel / any reverse proxy
app.use(cors());
app.use(express.json());
app.use(apiLimiter);
if (!IS_VERCEL) app.use(express.static(path.join(__dirname)));
if (!USE_SUPABASE) app.use('/uploads', express.static(UPLOADS_DIR));

// ── Auth middleware ───────────────────────────────────────────
function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}
function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) try { req.user = jwt.verify(h.slice(7), JWT_SECRET); } catch {}
  next();
}

function safeUser(u) { const { password_hash: _, password: __, ...r } = u; return r; }
function makeToken(u) {
  return jwt.sign({ id: u.id, email: u.email, name: u.name, avatar: u.avatar, plan: u.plan }, JWT_SECRET, { expiresIn: '30d' });
}

// ── Helpers: Supabase vs memory ───────────────────────────────
const db = {
  // ── Users ──
  async findUserByEmail(email) {
    if (USE_SUPABASE) {
      const { data } = await sb.from('users').select('*').eq('email', email.toLowerCase()).single();
      return data;
    }
    return _users.find(u => u.email === email.toLowerCase()) || null;
  },
  async findUserById(id) {
    if (USE_SUPABASE) {
      const { data } = await sb.from('users').select('*').eq('id', id).single();
      return data;
    }
    return _users.find(u => u.id === id) || null;
  },
  async createUser(fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('users').insert(fields).select().single();
      if (error) throw error;
      return data;
    }
    const u = { id: _uid++, ...fields, created_at: now() };
    _users.push(u); return u;
  },
  async updateUser(id, fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('users').update(fields).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const u = _users.find(u => u.id === id);
    if (!u) return null;
    Object.assign(u, fields); return u;
  },

  // ── Posts ──
  async getPosts(page, limit, userId) {
    const offset = (page - 1) * limit;
    if (USE_SUPABASE) {
      const { data, count } = await sb.from('posts')
        .select(`id, user_id, image_url, caption, road_name, region, likes, created_at,
                 users!posts_user_id_fkey(name, avatar)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      const likedIds = new Set();
      if (userId && data?.length) {
        const { data: lk } = await sb.from('post_likes')
          .select('post_id').eq('user_id', userId)
          .in('post_id', data.map(p => p.id));
        lk?.forEach(l => likedIds.add(l.post_id));
      }
      return {
        posts: (data || []).map(p => ({
          ...p, user_name: p.users?.name || '', user_avatar: p.users?.avatar || null,
          liked: likedIds.has(p.id), users: undefined,
        })),
        total: count || 0,
      };
    }
    const sorted = [..._posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      posts: sorted.slice(offset, offset + limit).map(p => {
        const u = _users.find(u => u.id === p.user_id) || {};
        return { ...p, user_name: u.name || '', user_avatar: u.avatar || null,
          liked: userId ? _postLikes.has(`${userId}-${p.id}`) : false };
      }),
      total: _posts.length,
    };
  },
  async createPost(fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('posts').insert(fields).select().single();
      if (error) throw error;
      return data;
    }
    const p = { id: _pid++, ...fields, likes: 0, created_at: now() };
    _posts.push(p); return p;
  },
  async deletePost(id, userId) {
    if (USE_SUPABASE) {
      const { data: p } = await sb.from('posts').select('user_id, image_url').eq('id', id).single();
      if (!p) return { error: 'not_found' };
      if (p.user_id !== userId) return { error: 'forbidden' };
      await sb.from('posts').delete().eq('id', id);
      // Delete from storage if it's a Supabase storage URL
      if (p.image_url?.includes('/storage/v1/')) {
        const parts = p.image_url.split('/uploads/');
        if (parts[1]) await sb.storage.from('uploads').remove([parts[1]]);
      }
      return { ok: true };
    }
    const idx = _posts.findIndex(p => p.id === id);
    if (idx === -1) return { error: 'not_found' };
    if (_posts[idx].user_id !== userId) return { error: 'forbidden' };
    _posts.splice(idx, 1);
    _comments = _comments.filter(c => c.post_id !== id);
    for (const k of _postLikes) { if (k.endsWith(`-${id}`)) _postLikes.delete(k); }
    return { ok: true };
  },
  async toggleLike(postId, userId) {
    if (USE_SUPABASE) {
      const { data: existing } = await sb.from('post_likes')
        .select().eq('user_id', userId).eq('post_id', postId).single();
      if (existing) {
        await sb.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId);
        const { data: p } = await sb.from('posts').select('likes').eq('id', postId).single();
        const newLikes = Math.max(0, (p?.likes || 1) - 1);
        await sb.from('posts').update({ likes: newLikes }).eq('id', postId);
        return { liked: false, likes: newLikes };
      } else {
        await sb.from('post_likes').insert({ user_id: userId, post_id: postId });
        const { data: p } = await sb.from('posts').select('likes').eq('id', postId).single();
        const newLikes = (p?.likes || 0) + 1;
        await sb.from('posts').update({ likes: newLikes }).eq('id', postId);
        return { liked: true, likes: newLikes };
      }
    }
    const key = `${userId}-${postId}`;
    const post = _posts.find(p => p.id === postId);
    if (!post) return null;
    if (_postLikes.has(key)) {
      _postLikes.delete(key); post.likes = Math.max(0, post.likes - 1);
      return { liked: false, likes: post.likes };
    }
    _postLikes.add(key); post.likes++;
    return { liked: true, likes: post.likes };
  },

  // ── Comments ──
  async getComments(postId) {
    if (USE_SUPABASE) {
      const { data } = await sb.from('comments')
        .select('*, users!comments_user_id_fkey(name, avatar)')
        .eq('post_id', postId).order('created_at', { ascending: true });
      return (data || []).map(c => ({
        ...c, user_name: c.users?.name || '', user_avatar: c.users?.avatar || null, users: undefined,
      }));
    }
    return _comments.filter(c => c.post_id === postId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(c => { const u = _users.find(u => u.id === c.user_id) || {}; return { ...c, user_name: u.name || '', user_avatar: u.avatar || null }; });
  },
  async createComment(fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('comments').insert(fields).select().single();
      if (error) throw error;
      return data;
    }
    const c = { id: _cid++, ...fields, created_at: now() };
    _comments.push(c); return c;
  },
  async deleteComment(id, userId) {
    if (USE_SUPABASE) {
      const { data: c } = await sb.from('comments').select('user_id').eq('id', id).single();
      if (!c) return { error: 'not_found' };
      if (c.user_id !== userId) return { error: 'forbidden' };
      await sb.from('comments').delete().eq('id', id);
      return { ok: true };
    }
    const idx = _comments.findIndex(c => c.id === id);
    if (idx === -1) return { error: 'not_found' };
    if (_comments[idx].user_id !== userId) return { error: 'forbidden' };
    _comments.splice(idx, 1); return { ok: true };
  },

  // ── Stories ──
  async getStories() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (USE_SUPABASE) {
      const { data } = await sb.from('stories')
        .select('*, users!stories_user_id_fkey(name, avatar)')
        .gte('created_at', cutoff).order('created_at', { ascending: false });
      return (data || []).map(s => ({
        ...s, user_name: s.users?.name || '', user_avatar: s.users?.avatar || null, users: undefined,
      }));
    }
    return _stories.filter(s => s.created_at > cutoff)
      .map(s => { const u = _users.find(u => u.id === s.user_id) || {}; return { ...s, user_name: u.name || '', user_avatar: u.avatar || null }; });
  },
  async createStory(fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('stories').insert(fields).select().single();
      if (error) throw error;
      return data;
    }
    const s = { id: _sid++, ...fields, created_at: now() };
    _stories.push(s); return s;
  },

  // ── Groups ──
  async getGroups(userId) {
    if (USE_SUPABASE) {
      const { data: groups } = await sb.from('groups')
        .select('*, users!groups_creator_id_fkey(name)').order('created_at', { ascending: false });
      const { data: counts } = await sb.from('group_members').select('group_id');
      const countMap = {};
      counts?.forEach(m => { countMap[m.group_id] = (countMap[m.group_id] || 0) + 1; });
      let memberOf = new Set();
      if (userId) {
        const { data: mem } = await sb.from('group_members').select('group_id').eq('user_id', userId);
        mem?.forEach(m => memberOf.add(m.group_id));
      }
      return (groups || []).map(g => ({
        ...g, creator_name: g.users?.name || '', users: undefined,
        member_count: countMap[g.id] || 0, is_member: memberOf.has(g.id),
      }));
    }
    return _groups.map(g => {
      const u = _users.find(u => u.id === g.creator_id) || {};
      return { ...g, creator_name: u.name || '',
        member_count: _groupMembers.filter(m => m.group_id === g.id).length,
        is_member: userId ? _groupMembers.some(m => m.group_id === g.id && m.user_id === userId) : false };
    });
  },
  async createGroup(fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('groups').insert(fields).select().single();
      if (error) throw error;
      await sb.from('group_members').insert({ group_id: data.id, user_id: fields.creator_id });
      return data;
    }
    const g = { id: _gid++, ...fields, created_at: now() };
    _groups.push(g);
    _groupMembers.push({ group_id: g.id, user_id: fields.creator_id, joined_at: now() });
    return g;
  },
  async getGroup(id, userId) {
    if (USE_SUPABASE) {
      const { data: g } = await sb.from('groups')
        .select('*, users!groups_creator_id_fkey(name)').eq('id', id).single();
      if (!g) return null;
      const { data: members } = await sb.from('group_members')
        .select('user_id, joined_at, users!group_members_user_id_fkey(name, avatar)').eq('group_id', id);
      const memberList = (members || []).map(m => ({
        user_id: m.user_id, name: m.users?.name || '', avatar: m.users?.avatar || null, joined_at: m.joined_at,
      }));
      return { ...g, creator_name: g.users?.name || '', users: undefined,
        members: memberList, member_count: memberList.length,
        is_member: userId ? memberList.some(m => m.user_id === userId) : false };
    }
    const g = _groups.find(g => g.id === id);
    if (!g) return null;
    const creator = _users.find(u => u.id === g.creator_id) || {};
    const members = _groupMembers.filter(m => m.group_id === id).map(m => {
      const u = _users.find(u => u.id === m.user_id) || {};
      return { user_id: m.user_id, name: u.name || '', avatar: u.avatar || null, joined_at: m.joined_at };
    });
    return { ...g, creator_name: creator.name || '', members, member_count: members.length,
      is_member: userId ? members.some(m => m.user_id === userId) : false };
  },
  async joinGroup(groupId, userId) {
    if (USE_SUPABASE) {
      const { error } = await sb.from('group_members').insert({ group_id: groupId, user_id: userId });
      if (error?.code === '23505') return { error: 'already_member' };
      if (error) throw error;
      return { ok: true };
    }
    if (_groupMembers.some(m => m.group_id === groupId && m.user_id === userId)) return { error: 'already_member' };
    _groupMembers.push({ group_id: groupId, user_id: userId, joined_at: now() });
    return { ok: true };
  },
  async leaveGroup(groupId, userId) {
    if (USE_SUPABASE) {
      await sb.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
      await sb.from('group_locations').delete().eq('group_id', groupId).eq('user_id', userId);
      return { ok: true };
    }
    const idx = _groupMembers.findIndex(m => m.group_id === groupId && m.user_id === userId);
    if (idx === -1) return { error: 'not_member' };
    _groupMembers.splice(idx, 1);
    const li = _groupLocations.findIndex(l => l.group_id === groupId && l.user_id === userId);
    if (li !== -1) _groupLocations.splice(li, 1);
    return { ok: true };
  },
  async isMember(groupId, userId) {
    if (USE_SUPABASE) {
      const { data } = await sb.from('group_members').select('user_id')
        .eq('group_id', groupId).eq('user_id', userId).single();
      return !!data;
    }
    return _groupMembers.some(m => m.group_id === groupId && m.user_id === userId);
  },
  async upsertLocation(groupId, userId, lat, lng, heading) {
    if (USE_SUPABASE) {
      await sb.from('group_locations').upsert(
        { group_id: groupId, user_id: userId, lat, lng, heading, updated_at: now() },
        { onConflict: 'group_id,user_id' }
      );
      return { ok: true };
    }
    const idx = _groupLocations.findIndex(l => l.group_id === groupId && l.user_id === userId);
    const loc = { group_id: groupId, user_id: userId, lat, lng, heading, updated_at: now() };
    if (idx !== -1) _groupLocations[idx] = loc; else _groupLocations.push(loc);
    return { ok: true };
  },
  async getLocations(groupId) {
    if (USE_SUPABASE) {
      const { data } = await sb.from('group_locations')
        .select('*, users!group_locations_user_id_fkey(name)').eq('group_id', groupId);
      return (data || []).map(l => ({ ...l, user_name: l.users?.name || '', users: undefined }));
    }
    return _groupLocations.filter(l => l.group_id === groupId).map(l => {
      const u = _users.find(u => u.id === l.user_id) || {};
      return { ...l, user_name: u.name || '' };
    });
  },
  async getGroupRoutes(groupId) {
    if (USE_SUPABASE) {
      const { data } = await sb.from('group_routes').select('*').eq('group_id', groupId).order('created_at');
      return data || [];
    }
    return _groupRoutes.filter(r => r.group_id === groupId);
  },
  async createGroupRoute(fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('group_routes').insert(fields).select().single();
      if (error) throw error;
      return data;
    }
    const r = { id: _rid++, ...fields, created_at: now() };
    _groupRoutes.push(r); return r;
  },

  // ── Marketplace ──
  async getListings(category) {
    if (USE_SUPABASE) {
      let q = sb.from('listings')
        .select('*, users!listings_user_id_fkey(name, email)')
        .order('created_at', { ascending: false });
      if (category && category !== 'All') q = q.eq('category', category);
      const { data } = await q;
      return (data || []).map(l => ({
        ...l, seller_name: l.users?.name || '', seller_email: l.users?.email || '', users: undefined,
      }));
    }
    let result = [..._listings].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (category && category !== 'All') result = result.filter(l => l.category === category);
    return result.map(l => { const u = _users.find(u => u.id === l.user_id) || {}; return { ...l, seller_name: u.name || '', seller_email: u.email || '' }; });
  },
  async createListing(fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('listings').insert(fields).select().single();
      if (error) throw error;
      return data;
    }
    const l = { id: _lid++, ...fields, created_at: now() };
    _listings.push(l); return l;
  },
  async deleteListing(id, userId) {
    if (USE_SUPABASE) {
      const { data: l } = await sb.from('listings').select('user_id').eq('id', id).single();
      if (!l) return { error: 'not_found' };
      if (l.user_id !== userId) return { error: 'forbidden' };
      await sb.from('listings').delete().eq('id', id);
      return { ok: true };
    }
    const idx = _listings.findIndex(l => l.id === id);
    if (idx === -1) return { error: 'not_found' };
    if (_listings[idx].user_id !== userId) return { error: 'forbidden' };
    _listings.splice(idx, 1); return { ok: true };
  },

  // ── Community Roads ──
  async getRoads() {
    if (USE_SUPABASE) {
      const { data } = await sb.from('roads')
        .select('*, users!roads_user_id_fkey(name)').order('created_at', { ascending: false });
      return (data || []).map(r => ({ ...r, submitted_by: r.users?.name || 'Anonymous', users: undefined }));
    }
    return _roads.map(r => { const u = _users.find(u => u.id === r.user_id) || {}; return { ...r, submitted_by: u.name || 'Anonymous' }; });
  },
  async createRoad(fields) {
    if (USE_SUPABASE) {
      const { data, error } = await sb.from('roads').insert(fields).select().single();
      if (error) throw error;
      return data;
    }
    const r = { id: _roadId++, ...fields, likes: 0, created_at: now() };
    _roads.push(r); return r;
  },
  async likeRoad(id) {
    if (USE_SUPABASE) {
      const { data: r } = await sb.from('roads').select('likes').eq('id', id).single();
      if (!r) return null;
      const likes = (r.likes || 0) + 1;
      await sb.from('roads').update({ likes }).eq('id', id);
      return likes;
    }
    const r = _roads.find(r => r.id === id);
    if (!r) return null;
    r.likes = (r.likes || 0) + 1; return r.likes;
  },
  async deleteRoad(id, userId) {
    if (USE_SUPABASE) {
      const { data: r } = await sb.from('roads').select('user_id').eq('id', id).single();
      if (!r) return { error: 'not_found' };
      if (r.user_id !== userId) return { error: 'forbidden' };
      await sb.from('roads').delete().eq('id', id);
      return { ok: true };
    }
    const idx = _roads.findIndex(r => r.id === id);
    if (idx === -1) return { error: 'not_found' };
    if (_roads[idx].user_id !== userId) return { error: 'forbidden' };
    _roads.splice(idx, 1); return { ok: true };
  },

  // ── Password resets ──
  _resetTokens: new Map(), // in-memory fallback: token → { email, expires_at }
  async createResetToken(email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    if (USE_SUPABASE) {
      // Invalidate any existing unused tokens for this email
      await sb.from('password_resets').update({ used: true }).eq('email', email.toLowerCase()).eq('used', false);
      await sb.from('password_resets').insert({ token, email: email.toLowerCase(), expires_at });
    } else {
      // Clean up old tokens for this email
      for (const [k, v] of this._resetTokens) { if (v.email === email.toLowerCase()) this._resetTokens.delete(k); }
      this._resetTokens.set(token, { email: email.toLowerCase(), expires_at });
    }
    return token;
  },
  async consumeResetToken(token) {
    if (USE_SUPABASE) {
      const { data } = await sb.from('password_resets').select('*')
        .eq('token', token).eq('used', false).single();
      if (!data) return null;
      if (new Date(data.expires_at) < new Date()) return null;
      await sb.from('password_resets').update({ used: true }).eq('token', token);
      return data.email;
    }
    const entry = this._resetTokens.get(token);
    if (!entry) return null;
    if (new Date(entry.expires_at) < new Date()) { this._resetTokens.delete(token); return null; }
    this._resetTokens.delete(token);
    return entry.email;
  },
};

// ── Auth routes ───────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address.' });
    if (await db.findUserByEmail(email))
      return res.status(409).json({ error: 'An account with that email already exists.' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      name: name.trim(), email: email.toLowerCase(),
      password_hash, avatar: null, bio: '', plan: 'Explorer',
    });
    res.status(201).json({ token: makeToken(user), user: safeUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message || 'Server error.' }); }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = await db.findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    const hash = user.password_hash || user.password || '';
    const match = await bcrypt.compare(password, hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message || 'Server error.' }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      // Cold-start fallback: return token payload directly
      const { id, email, name, avatar, plan } = req.user;
      return res.json({ user: { id, email, name: name || '', avatar: avatar || null, bio: '', plan: plan || 'Explorer' } });
    }
    res.json({ user: safeUser(user) });
  } catch { res.status(500).json({ error: 'Server error.' }); }
});

app.patch('/api/auth/me', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const { name, bio } = req.body;
    const fields = {};
    if (name?.trim()) fields.name = name.trim();
    if (bio !== undefined) fields.bio = bio.trim();
    if (req.file) fields.avatar = await storeImage(req.file);
    const user = await db.updateUser(req.user.id, fields);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: safeUser(user), token: makeToken(user) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/auth/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    // Always respond OK — don't reveal whether email exists
    const user = await db.findUserByEmail(email);
    if (user) {
      const token = await db.createResetToken(email);
      const link  = `${APP_URL}?reset=${token}`;
      if (resendClient) {
        await resendClient.emails.send({
          from: FROM_EMAIL,
          to: email.toLowerCase(),
          subject: 'Reset your Culture password',
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0C0C0F;color:#EDEBE6;border-radius:12px">
              <h1 style="font-size:28px;font-weight:800;letter-spacing:-0.5px;margin:0 0 8px">One Culture</h1>
              <p style="color:#888;font-size:14px;margin:0 0 32px">The driving enthusiast community</p>
              <h2 style="font-size:18px;font-weight:600;margin:0 0 12px">Reset your password</h2>
              <p style="color:#bbb;font-size:14px;line-height:1.6;margin:0 0 24px">
                Click the button below to set a new password. This link expires in 1 hour.
              </p>
              <a href="${link}" style="display:inline-block;background:#E4A530;color:#0C0C0F;font-weight:700;font-size:15px;padding:13px 28px;border-radius:8px;text-decoration:none">
                Reset Password
              </a>
              <p style="color:#555;font-size:12px;margin:24px 0 0">
                If you didn't request this, ignore this email — your password won't change.<br/>
                Link expires: ${new Date(Date.now() + 60 * 60 * 1000).toUTCString()}
              </p>
            </div>`,
        });
      } else {
        // No email provider — log to console for local dev
        console.log(`[DEV] Password reset link for ${email}: ${link}`);
      }
    }
    res.json({ ok: true, message: 'If that email exists, a reset link is on its way.' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    const email = await db.consumeResetToken(token);
    if (!email) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    const user = await db.findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    const password_hash = await bcrypt.hash(password, 10);
    const updated = await db.updateUser(user.id, { password_hash });
    res.json({ token: makeToken(updated), user: safeUser(updated) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ── Post routes ───────────────────────────────────────────────
app.get('/api/posts', optionalAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(24, parseInt(req.query.limit) || 12);
    const { posts, total } = await db.getPosts(page, limit, req.user?.id);
    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image is required.' });
    const { caption = '', road_name = '', region = '' } = req.body;
    const image_url = await storeImage(req.file);
    const post = await db.createPost({
      user_id: req.user.id, image_url,
      caption: caption.trim(), road_name: road_name.trim(), region: region.trim(),
    });
    const user = await db.findUserById(req.user.id);
    res.status(201).json({ post: { ...post, user_name: user?.name || '', user_avatar: user?.avatar || null, liked: false } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.deletePost(parseInt(req.params.id), req.user.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Post not found.' });
    if (result.error === 'forbidden') return res.status(403).json({ error: 'Not your post.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const result = await db.toggleLike(parseInt(req.params.id), req.user.id);
    if (!result) return res.status(404).json({ error: 'Post not found.' });
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ── Comment routes ────────────────────────────────────────────
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    res.json({ comments: await db.getComments(parseInt(req.params.id)) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
    const comment = await db.createComment({ post_id: parseInt(req.params.id), user_id: req.user.id, body: body.trim() });
    const user = await db.findUserById(req.user.id);
    res.status(201).json({ comment: { ...comment, user_name: user?.name || '', user_avatar: user?.avatar || null } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.delete('/api/comments/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.deleteComment(parseInt(req.params.id), req.user.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Comment not found.' });
    if (result.error === 'forbidden') return res.status(403).json({ error: 'Not your comment.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ── Stories routes ────────────────────────────────────────────
app.get('/api/stories', optionalAuth, async (req, res) => {
  try { res.json({ stories: await db.getStories() }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/stories', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image is required.' });
    const image_url = await storeImage(req.file);
    const story = await db.createStory({ user_id: req.user.id, image_url, road_name: (req.body.road_name || '').trim() });
    const user = await db.findUserById(req.user.id);
    res.status(201).json({ story: { ...story, user_name: user?.name || '', user_avatar: user?.avatar || null } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ── Groups routes ─────────────────────────────────────────────
app.get('/api/groups', optionalAuth, async (req, res) => {
  try { res.json({ groups: await db.getGroups(req.user?.id) }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    const { name, description = '', meeting_point = '', route_name = '' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required.' });
    const group = await db.createGroup({
      creator_id: req.user.id, name: name.trim(),
      description: description.trim(), meeting_point: meeting_point.trim(), route_name: route_name.trim(),
    });
    const user = await db.findUserById(req.user.id);
    res.status(201).json({ group: { ...group, creator_name: user?.name || '', member_count: 1, is_member: true } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.get('/api/groups/:id', optionalAuth, async (req, res) => {
  try {
    const group = await db.getGroup(parseInt(req.params.id), req.user?.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    res.json({ group });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/groups/:id/join', requireAuth, async (req, res) => {
  try {
    const result = await db.joinGroup(parseInt(req.params.id), req.user.id);
    if (result.error === 'already_member') return res.status(409).json({ error: 'Already a member.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.delete('/api/groups/:id/leave', requireAuth, async (req, res) => {
  try {
    const result = await db.leaveGroup(parseInt(req.params.id), req.user.id);
    if (result.error === 'not_member') return res.status(404).json({ error: 'Not a member.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/groups/:id/location', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { lat, lng, heading = 0 } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng are required.' });
    if (!await db.isMember(groupId, req.user.id)) return res.status(403).json({ error: 'Not a member.' });
    await db.upsertLocation(groupId, req.user.id, parseFloat(lat), parseFloat(lng), parseFloat(heading) || 0);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.get('/api/groups/:id/locations', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (!await db.isMember(groupId, req.user.id)) return res.status(403).json({ error: 'Not a member.' });
    res.json({ locations: await db.getLocations(groupId) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.get('/api/groups/:id/routes', async (req, res) => {
  try { res.json({ routes: await db.getGroupRoutes(parseInt(req.params.id)) }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/groups/:id/routes', requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { name, points } = req.body;
    if (!name || !Array.isArray(points) || points.length < 2)
      return res.status(400).json({ error: 'Route name and at least 2 points are required.' });
    if (!await db.isMember(groupId, req.user.id)) return res.status(403).json({ error: 'Not a member.' });
    const route = await db.createGroupRoute({ group_id: groupId, user_id: req.user.id, name: name.trim(), points });
    res.status(201).json({ route });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ── Marketplace routes ────────────────────────────────────────
app.get('/api/marketplace', async (req, res) => {
  try { res.json({ listings: await db.getListings(req.query.category) }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/marketplace', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, price, category = 'Other', description = '', contact = '' } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Title and price are required.' });
    const image_url = req.file ? await storeImage(req.file) : null;
    const listing = await db.createListing({
      user_id: req.user.id, title: title.trim(), price: price.trim(),
      category, description: description.trim(), contact: contact.trim(), image_url,
    });
    const user = await db.findUserById(req.user.id);
    res.status(201).json({ listing: { ...listing, seller_name: user?.name || '', seller_email: user?.email || '' } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.delete('/api/marketplace/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.deleteListing(parseInt(req.params.id), req.user.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Listing not found.' });
    if (result.error === 'forbidden') return res.status(403).json({ error: 'Not your listing.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ── Curated Roads ─────────────────────────────────────────────
const CURATED_ROADS_PATH = path.join(__dirname, 'data', 'roads.json');
let curatedRoadsCache = null;

app.get('/api/roads/curated', (req, res) => {
  if (curatedRoadsCache) return res.json({ roads: curatedRoadsCache });
  try {
    curatedRoadsCache = JSON.parse(fs.readFileSync(CURATED_ROADS_PATH, 'utf8'));
    res.json({ roads: curatedRoadsCache });
  } catch { res.status(500).json({ error: 'Could not load curated roads.' }); }
});

// ── Community Roads ───────────────────────────────────────────
app.get('/api/roads', async (req, res) => {
  try { res.json({ roads: await db.getRoads() }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/roads', requireAuth, async (req, res) => {
  try {
    const { name, region = '', description = '', difficulty = 'Moderate', points } = req.body;
    if (!name || !Array.isArray(points) || points.length < 2)
      return res.status(400).json({ error: 'Road name and at least 2 coordinates are required.' });
    const road = await db.createRoad({
      user_id: req.user.id, name: name.trim(), region: region.trim(),
      description: description.trim(), difficulty, points,
    });
    const user = await db.findUserById(req.user.id);
    res.status(201).json({ road: { ...road, submitted_by: user?.name || '' } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/roads/:id/like', requireAuth, async (req, res) => {
  try {
    const likes = await db.likeRoad(parseInt(req.params.id));
    if (likes === null) return res.status(404).json({ error: 'Road not found.' });
    res.json({ likes });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

app.delete('/api/roads/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.deleteRoad(parseInt(req.params.id), req.user.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Road not found.' });
    if (result.error === 'forbidden') return res.status(403).json({ error: 'Not your road.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

// ── Seed (only runs once, only if DB is empty) ────────────────
async function seed() {
  if (_seeded) return;
  _seeded = true;

  // Skip seed if Supabase is connected and already has users
  if (USE_SUPABASE) {
    const { count } = await sb.from('users').select('id', { count: 'exact', head: true });
    if (count > 0) return;
  } else if (_users.length > 0) return;

  const password_hash = await bcrypt.hash('culture123', 10);
  const teamUser = await db.createUser({
    name: 'One Culture Team', email: 'team@one-culture.app',
    password_hash, avatar: null, bio: 'The official One Culture account.', plan: 'Explorer',
  });

  const demoPosts = [
    { image_url: 'https://images.unsplash.com/photo-sCj3PwIdRvM?w=800&auto=format&fit=crop', caption: 'Tail of the Dragon — 318 curves in 11 miles. Nothing else comes close.', road_name: 'Tail of the Dragon (US-129)', region: 'Southeast' },
    { image_url: 'https://images.unsplash.com/photo-NeH9w4CdmnA?w=800&auto=format&fit=crop', caption: 'Beartooth Highway at sunrise. Worth every switchback.', road_name: 'Beartooth Highway (US-212)', region: 'Mountain West' },
    { image_url: 'https://images.unsplash.com/photo-F8NXa0WH5wk?w=800&auto=format&fit=crop', caption: 'Pacific Coast Highway. Windows down, ocean to the left. Nothing beats it.', road_name: 'Pacific Coast Highway (CA-1)', region: 'West Coast' },
    { image_url: 'https://images.unsplash.com/photo-ZUwJ_aP1ED8?w=800&auto=format&fit=crop', caption: 'Million Dollar Highway descending to Ouray. Colorado\'s finest tarmac.', road_name: 'Million Dollar Highway (US-550)', region: 'Mountain West' },
    { image_url: 'https://images.unsplash.com/photo-tT829CAphnM?w=800&auto=format&fit=crop', caption: 'Skyline Drive in the fall. The M3 felt right at home.', road_name: 'Skyline Drive', region: 'Northeast' },
    { image_url: 'https://images.unsplash.com/photo-AMgve6dPt-k?w=800&auto=format&fit=crop', caption: 'Going-to-the-Sun Road through Glacier NP. One of the greats.', road_name: 'Going-to-the-Sun Road', region: 'Mountain West' },
  ];
  for (const p of demoPosts) {
    await db.createPost({ user_id: teamUser.id, ...p });
  }

  const demoGroups = [
    { name: 'Pacific Coast Runners', description: 'Weekly drives along PCH and mountain roads of Southern California.', meeting_point: 'Malibu, CA', route_name: 'Pacific Coast Highway' },
    { name: 'Dragon Slayers', description: 'Dedicated to the Tail of the Dragon and Cherohala Skyway.', meeting_point: 'Deals Gap, NC', route_name: 'US-129 Loop' },
    { name: 'Rocky Mountain Rally', description: 'Colorado and Wyoming alpine passes.', meeting_point: 'Denver, CO', route_name: 'Alpine Triangle' },
  ];
  for (const g of demoGroups) {
    await db.createGroup({ creator_id: teamUser.id, ...g });
  }

  const demoListings = [
    { title: 'Porsche 911 GT3 RS — Track Ready', price: '$289,000', category: 'Cars', description: '2023 GT3 RS, Weissach Package, 1,200 miles. Immaculate.', contact: 'team@one-culture.app', image_url: null },
    { title: 'BMW M3 Competition — Frozen Isle Green', price: '$82,500', category: 'Cars', description: '2022 F80 M3 Competition, 6-speed manual. Carbon seats, track package.', contact: 'team@one-culture.app', image_url: null },
    { title: 'Akrapovič Titanium Exhaust — 992 GT3', price: '$4,200', category: 'Mods', description: 'Full titanium slip-on system. Near new, under 500 miles.', contact: 'team@one-culture.app', image_url: null },
    { title: 'Michelin Pilot Cup 2 R — 305/30/20 (set of 2)', price: '$1,100', category: 'Wheels', description: 'Rear tires for 992. 7/10 tread remaining.', contact: 'team@one-culture.app', image_url: null },
    { title: 'Racepak IQ3 Street Dash Logger', price: '$650', category: 'Electronics', description: 'Full digital dash with GPS lap timing and 0-60 timer.', contact: 'team@one-culture.app', image_url: null },
    { title: 'Brembo GT Brake Kit — M4 Front', price: '$3,800', category: 'Mods', description: 'Six-piston Brembo GT kit for F8x M3/M4. Barely used.', contact: 'team@one-culture.app', image_url: null },
  ];
  for (const l of demoListings) {
    await db.createListing({ user_id: teamUser.id, ...l });
  }
}

if (require.main === module) {
  seed().then(() => app.listen(PORT, () => console.log(`One Culture API running on http://localhost:${PORT}`))).catch(console.error);
} else {
  seed().catch(console.error);
  module.exports = app;
}
