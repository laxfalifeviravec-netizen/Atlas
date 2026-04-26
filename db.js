/* ============================================================
   Atlas — Database helpers (Supabase)
   Depends on: config.js (exposes `db`)
   ============================================================ */

// ── Roads ─────────────────────────────────────────────────────

/** Fetch all roads, optionally filtered. */
async function getRoads({ region, type, search } = {}) {
  let query = db.from('roads').select('*').order('name');
  if (region) query = query.eq('region', region);
  if (type)   query = query.eq('type', type);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Fetch a single road by id. */
async function getRoad(id) {
  const { data, error } = await db
    .from('roads')
    .select('*, road_reviews(*, profiles(username, full_name))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ── Reviews ───────────────────────────────────────────────────

/**
 * Submit a review. If the user already reviewed this road,
 * the DB unique constraint will reject duplicates gracefully.
 */
async function submitReview({ roadId, userId, rating, condition, body, driveDate }) {
  const { data, error } = await db
    .from('road_reviews')
    .upsert({
      road_id:    roadId,
      user_id:    userId,
      rating,
      condition,
      body,
      drive_date: driveDate || null,
    }, { onConflict: 'road_id,user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Fetch all reviews for a road, newest first. */
async function getReviews(roadId) {
  const { data, error } = await db
    .from('road_reviews')
    .select('*, profiles(username, full_name)')
    .eq('road_id', roadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ── Saved Routes ──────────────────────────────────────────────

/** Toggle save/unsave a road for the current user. */
async function toggleSave(userId, roadId) {
  // Check if already saved
  const { data: existing } = await db
    .from('saved_routes')
    .select('id')
    .eq('user_id', userId)
    .eq('road_id', roadId)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from('saved_routes')
      .delete()
      .eq('user_id', userId)
      .eq('road_id', roadId);
    if (error) throw error;
    return false; // now unsaved
  } else {
    const { error } = await db
      .from('saved_routes')
      .insert({ user_id: userId, road_id: roadId });
    if (error) throw error;
    return true; // now saved
  }
}

/** Get all roads saved by a user. */
async function getSavedRoutes(userId) {
  const { data, error } = await db
    .from('saved_routes')
    .select('*, roads(*)')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Check which road IDs the user has saved (returns a Set). */
async function getSavedIds(userId) {
  const { data, error } = await db
    .from('saved_routes')
    .select('road_id')
    .eq('user_id', userId);
  if (error) return new Set();
  return new Set(data.map(r => r.road_id));
}

// ── Contact Form ──────────────────────────────────────────────

async function submitContact({ name, email, subject, message }) {
  const { error } = await db
    .from('contact_messages')
    .insert({ name, email, subject, message });
  if (error) throw error;
}

// ── Road Conditions ───────────────────────────────────────────

/** Get active (non-expired) conditions for a road. */
async function getConditions(roadId) {
  const { data, error } = await db
    .from('road_conditions')
    .select('*, profiles(username)')
    .eq('road_id', roadId)
    .gt('expires_at', new Date().toISOString())
    .order('reported_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ── Community Road Submissions ────────────────────────────────

async function submitRoad({ name, designation, state, region, type, lengthMi, difficulty, bestSeason, highlight, lat, lng, userId }) {
  const base = {
    name,
    designation:  designation || null,
    state,
    region,
    type,
    length_mi:    lengthMi   || null,
    difficulty:   difficulty || null,
    best_season:  bestSeason || null,
    highlight:    highlight  || null,
    lat:          parseFloat(lat),
    lng:          parseFloat(lng),
  };

  // Try with community columns first (requires add_community_roads.sql migration)
  const { data, error } = await db
    .from('roads')
    .insert({ ...base, source: 'community', submitted_by: userId })
    .select()
    .single();

  if (!error) return data;

  // If column doesn't exist yet, fall back to insert without community columns
  if (error.code === '42703' || error.message?.includes('column')) {
    const { data: data2, error: error2 } = await db
      .from('roads')
      .insert(base)
      .select()
      .single();
    if (error2) throw new Error(error2.message);
    return data2;
  }

  throw new Error(error.message);
}

async function reportCondition({ roadId, userId, conditionType, description }) {
  const { error } = await db
    .from('road_conditions')
    .insert({
      road_id:        roadId,
      user_id:        userId,
      condition_type: conditionType,
      description,
    });
  if (error) throw error;
}

// ── Community: Posts ──────────────────────────────────────────

async function communityGetPosts({ limit = 10, offset = 0 } = {}) {
  const { data, error } = await db
    .from('posts')
    .select('*, profiles(full_name, username, avatar_url), roads(name, designation, state)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}

async function communityCreatePost({ userId, caption, imageUrl, roadId, groupId }) {
  const { data, error } = await db
    .from('posts')
    .insert({ user_id: userId, caption: caption || null, image_url: imageUrl, road_id: roadId, group_id: groupId })
    .select('*, profiles(full_name, username, avatar_url), roads(name, designation, state)')
    .single();
  if (error) throw error;
  return data;
}

async function communityLikePost(postId, userId) {
  const { error } = await db.from('post_likes').insert({ post_id: postId, user_id: userId });
  if (error) throw error;
}

async function communityUnlikePost(postId, userId) {
  const { error } = await db.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw error;
}

async function communityGetLikedIds(userId, postIds) {
  if (!postIds.length) return [];
  const { data, error } = await db
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  if (error) return [];
  return data.map(r => r.post_id);
}

async function communityGetComments(postId) {
  const { data, error } = await db
    .from('post_comments')
    .select('*, profiles(full_name, username)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function communityAddComment({ postId, userId, body }) {
  const { error } = await db
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, body });
  if (error) throw error;
}

async function communitySearchRoads(query) {
  const { data, error } = await db
    .from('roads')
    .select('id, name, designation, state')
    .ilike('name', `%${query}%`)
    .limit(8);
  if (error) return [];
  return data;
}

// ── Community: Groups ─────────────────────────────────────────

async function communityGetGroups() {
  const { data, error } = await db
    .from('driving_groups')
    .select('*')
    .order('member_count', { ascending: false });
  if (error) throw error;
  return data;
}

async function communityCreateGroup({ name, description, region, createdBy }) {
  const { data, error } = await db
    .from('driving_groups')
    .insert({ name, description, region, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  // Auto-join as admin
  await db.from('group_members').insert({ group_id: data.id, user_id: createdBy, role: 'admin' });
  return data;
}

async function communityJoinGroup(groupId, userId) {
  const { error } = await db.from('group_members').insert({ group_id: groupId, user_id: userId });
  if (error) throw error;
}

async function communityLeaveGroup(groupId, userId) {
  const { error } = await db.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
  if (error) throw error;
}

async function communityGetJoinedGroupIds(userId) {
  const { data, error } = await db.from('group_members').select('group_id').eq('user_id', userId);
  if (error) return [];
  return data.map(r => r.group_id);
}

// ── Community: Garage ─────────────────────────────────────────

async function communityGetGarage(userId) {
  const { data, error } = await db
    .from('garages')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function communityAddCar({ userId, year, make, model, trimLevel, color, mods, imageUrl, isPrimary }) {
  const { error } = await db.from('garages').insert({
    user_id: userId, year, make, model,
    trim_level: trimLevel, color, mods,
    image_url: imageUrl, is_primary: isPrimary,
  });
  if (error) throw error;
}

async function communityDeleteCar(carId) {
  const { error } = await db.from('garages').delete().eq('id', carId);
  if (error) throw error;
}

// ── Community: Storage upload ──────────────────────────────────

async function communityUploadMedia(file, folder) {
  const ext  = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { data, error } = await db.storage.from('community-media').upload(path, file, { upsert: false });
  if (error) throw new Error('Image upload failed: ' + error.message);
  const { data: { publicUrl } } = db.storage.from('community-media').getPublicUrl(data.path);
  return publicUrl;
}
