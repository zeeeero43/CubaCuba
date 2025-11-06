-- Enable PostgreSQL extensions for full-text search
-- Run this on the VPS database

-- Enable trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable unaccent for Spanish text normalization
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Verify extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_trgm', 'unaccent');
