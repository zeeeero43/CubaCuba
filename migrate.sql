-- Migration: Add Revolico Import Fields
-- Adds source, revolicoId, scrapedAt fields and makes sellerId nullable

BEGIN;

-- Make sellerId nullable (drop NOT NULL constraint)
ALTER TABLE listings ALTER COLUMN seller_id DROP NOT NULL;

-- Add source field
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user';

-- Add revolicoId field
ALTER TABLE listings ADD COLUMN IF NOT EXISTS revolico_id TEXT;

-- Add scrapedAt field
ALTER TABLE listings ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP;

-- Create index on revolico_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_listings_revolico_id ON listings(revolico_id);

-- Create index on source for faster filtering
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);

COMMIT;
