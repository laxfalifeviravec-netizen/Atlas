-- Migration: add mod/part attachment columns to posts table
-- Run this in the Supabase SQL Editor if posts were created before these columns existed.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS mod_title    text default '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mod_price    text default '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mod_url      text default '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mod_category text default '';
