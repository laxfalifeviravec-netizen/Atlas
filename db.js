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
