-- Check if PostgreSQL search extensions are installed
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_trgm', 'unaccent');

-- Check if there are any listings
SELECT COUNT(*) as total_listings FROM listings;

-- Check active listings
SELECT COUNT(*) as active_listings FROM listings WHERE status = 'active';

-- Check approved listings
SELECT COUNT(*) as approved_listings FROM listings WHERE "moderationStatus" = 'approved';

-- Sample listings
SELECT id, title, "locationCity", status, "moderationStatus" 
FROM listings 
LIMIT 5;
