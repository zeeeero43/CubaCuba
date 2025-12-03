-- Migration: Add Revolico scraper columns to listings table
-- Run this on VPS: psql -U ricocuba_user -d ricocuba_db -f migrations/add-revolico-columns.sql

-- Add source column (user-created vs scraped)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user';

-- Add Revolico ID for tracking imported listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS revolico_id TEXT;

-- Add scraped timestamp
ALTER TABLE listings ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP;

-- Add scraped seller information
ALTER TABLE listings ADD COLUMN IF NOT EXISTS scraped_seller_name TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS scraped_seller_phone TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS scraped_seller_profile_picture TEXT;

-- Create index for faster lookups by revolico_id
CREATE INDEX IF NOT EXISTS idx_listings_revolico_id ON listings(revolico_id);

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'listings'
AND column_name IN ('source', 'revolico_id', 'scraped_at', 'scraped_seller_name', 'scraped_seller_phone', 'scraped_seller_profile_picture');
