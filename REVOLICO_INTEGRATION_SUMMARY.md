# Revolico Integration - Implementation Summary

## Overview
Complete integration between rico-scraper (Revolico scraping service) and Rico-Cuba (marketplace platform) has been implemented. The system allows automatic import of Revolico listings and auto-assignment to users when they register with their phone number.

## What Was Implemented

### 1. Rico-Scraper Enhancements ✅

#### Extended Scraper (`selenium_browser_scraper.py`)
- **New method**: `extract_listing_details()` collects full listing data:
  - Description (skips cookie banners)
  - Price with currency (USD, CUP, EUR, MLC)
  - Images (up to 10 per listing, skips small icons)
  - Category from breadcrumbs
  - Location/province
  - Condition (nuevo/usado)
  - Revolico ID from URL

#### Database Models (`models.py`)
- **ScrapedListing**: Stores complete listing data with image hashes
- **ImageProxy**: Hash-based mapping to hide original Revolico URLs
  - Uses SHA256 hashing for privacy
  - Maps hash → original URL for proxying

#### Image Service (`image_service.py`)
- **ImageProxyService**: Manages image URL obfuscation
  - `create_hash()`: SHA256 hash generation
  - `get_or_create_proxy()`: Creates/retrieves proxy entries
  - `process_image_urls()`: Batch URL to hash conversion

#### API Endpoints (`app.py`)
- **GET `/api/scraped-listings`**: Export listings to Rico-Cuba
  - Query params: `exported=false`, `limit=100`
  - Returns listings with image hashes

- **GET `/api/image-proxy/<hash>`**: Serve proxied images
  - Hides original Revolico URLs
  - Returns image with proper Content-Type
  - 24h cache headers

- **POST `/api/scraped-listings/:id/mark-exported`**: Mark as exported
  - Called after successful import to Rico-Cuba

#### Category Mapping (`category_mapping.py`)
- **100+ keyword mappings**: Revolico → Rico-Cuba categories
- **Keyword-based matching**: Flexible category detection
- **Default fallback**: Maps to "Otros" if no match

### 2. Rico-Cuba Integration ✅

#### Schema Extension (`shared/schema.ts`)
- **Modified `sellerId`**: Now nullable (for unassigned listings)
- **New fields**:
  - `source`: TEXT, default "user" | "revolico_scraped"
  - `revolicoId`: TEXT, original Revolico listing ID
  - `scrapedAt`: TIMESTAMP, when scraped from Revolico

#### Import Service (`server/revolico-import.ts`)
- **`importRevolicoListings()`**: Fetches and imports from scraper
  1. Calls rico-scraper API
  2. Maps categories using keyword matching
  3. Converts image hashes to proxy URLs
  4. Creates listings with `sellerId=null`
  5. Marks as exported in scraper

- **`assignListingsByPhone()`**: Auto-assigns listings to users
  - Finds unassigned listings with matching phone
  - Sets `sellerId` to the user
  - Returns count of assigned listings

#### API Endpoint (`server/routes.ts`)
- **POST `/api/admin/revolico/import`**: Triggers import (Admin only)
  - Optional `scraperApiUrl` in request body
  - Defaults to `http://localhost:5000` or `process.env.SCRAPER_API_URL`
  - Returns import statistics (imported, skipped, errors)
  - Creates moderation log entry

- **POST `/api/user/phone`**: Enhanced with auto-assignment
  - After phone update succeeds
  - Automatically assigns matching Revolico listings
  - Returns `assignedListings` count in response

## Database Migration

Three migration files have been created (run with DATABASE_URL set):

1. **`migrate.sql`**: Pure SQL migration
2. **`run-migration.py`**: Python script (uses psycopg2 or psql)
3. **`run-migration.js`**: JavaScript/ES module version

### Migration Changes:
- Makes `seller_id` nullable
- Adds `source` (TEXT, default 'user')
- Adds `revolico_id` (TEXT)
- Adds `scraped_at` (TIMESTAMP)
- Creates indexes:
  - `idx_listings_revolico_id`
  - `idx_listings_source`

### To Run Migration:
```bash
# Option 1: Python (if psycopg2 installed)
DATABASE_URL="postgresql://..." python3 run-migration.py

# Option 2: Direct SQL
psql $DATABASE_URL -f migrate.sql

# Option 3: Node.js (requires dependencies)
DATABASE_URL="postgresql://..." node run-migration.js
```

## Complete Workflow

### Phase 1: Scraping
1. User runs scraper: `http://localhost:5000/scrape-start`
2. Scraper collects listings from Revolico
3. Stores in `scraped_listings` table with image hashes
4. Images stored in `image_proxy` table

### Phase 2: Import to Rico-Cuba
1. Admin calls: `POST /api/admin/revolico/import`
2. Rico-Cuba fetches from rico-scraper API
3. Maps categories using keyword matching
4. Creates listings with:
   - `source = "revolico_scraped"`
   - `sellerId = null` (unassigned)
   - `moderationStatus = "pending"`
   - `isPublished = "false"`
   - Images as proxy URLs: `http://localhost:5000/api/image-proxy/<hash>`

### Phase 3: User Registration & Auto-Assignment
1. User signs up or updates phone on Rico-Cuba
2. System automatically searches for listings with matching phone
3. Assigns listings: `sellerId = userId`
4. User now owns their Revolico listings
5. After moderation, listings become visible

### Phase 4: WhatsApp Campaign (Future)
- Contact users via WhatsApp
- Inform them their listings are on Rico-Cuba
- Guide them to register and claim listings

## API Usage Examples

### Import Listings (Admin)
```bash
curl -X POST http://localhost:5000/api/admin/revolico/import \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"scraperApiUrl": "http://localhost:5000"}'
```

Response:
```json
{
  "success": true,
  "message": "Import abgeschlossen: 25 importiert, 5 übersprungen, 0 Fehler",
  "imported": 25,
  "skipped": 5,
  "errors": 0,
  "details": [...]
}
```

### Update Phone (Auto-Assignment)
```bash
curl -X POST http://localhost:5000/api/user/phone \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"phone": "+5353397247", "province": "La Habana"}'
```

Response:
```json
{
  "id": "user123",
  "phone": "+5353397247",
  "province": "La Habana",
  "assignedListings": 3
}
```

### Get Scraped Listings (Rico-Cuba calls this)
```bash
curl "http://localhost:5000/api/scraped-listings?exported=false&limit=100"
```

Response:
```json
{
  "count": 2,
  "listings": [
    {
      "id": 1,
      "revolico_id": "52091869",
      "title": "Protector de Voltaje",
      "description": "...",
      "price": 9.0,
      "currency": "USD",
      "phone_numbers": ["+5350963044"],
      "image_ids": ["5ffcae...", "ed2ec9...", ...],
      "category": "Aires Acondicionados",
      "location": "La Habana",
      "condition": "used",
      "scraped_at": "2025-11-18 10:30:00"
    }
  ]
}
```

### Proxy Image
```bash
curl -I "http://localhost:5000/api/image-proxy/5ffcae..."

HTTP/1.1 200 OK
Content-Type: image/jpeg
Cache-Control: public, max-age=86400
```

## Category Mapping

### Examples:
- `"Protector de Voltaje Split"` → `"Aires Acondicionados & Accesorios"`
- `"Pizza Hamburguesa"` → `"Restaurantes / Gastronomía"`
- `"iPhone 12"` → `"Móviles"`
- `"Casa en la Playa"` → `"Casa en la Playa"`
- `"Unknown Category"` → `"Otros"`

## File Structure

```
rico-scraper/
├── app.py (✏️ modified - added API endpoints)
├── selenium_browser_scraper.py (✏️ modified - extract_listing_details)
├── models.py (✏️ modified - ScrapedListing, ImageProxy)
├── image_service.py (✨ new)
└── category_mapping.py (✨ new)

CubaCuba/
├── shared/schema.ts (✏️ modified - new fields, nullable sellerId)
├── server/
│   ├── routes.ts (✏️ modified - import endpoint, phone auto-assign)
│   └── revolico-import.ts (✨ new)
├── migrate.sql (✨ new)
├── run-migration.py (✨ new)
├── run-migration.js (✨ new)
└── run-migration.ts (✨ new)
```

## Next Steps

1. **Run Database Migration** (when DATABASE_URL is available)
   ```bash
   DATABASE_URL="postgresql://..." python3 run-migration.py
   ```

2. **Test Import Flow**:
   - Scrape some Revolico listings
   - Call `/api/admin/revolico/import`
   - Verify listings appear in database with `source='revolico_scraped'`

3. **Test Auto-Assignment**:
   - Update user phone number that matches a scraped listing
   - Verify listing gets assigned (`sellerId` updated)

4. **Configure Environment**:
   - Set `SCRAPER_API_URL` in Rico-Cuba environment (VPS deployment)
   - Ensure both services can communicate

5. **Future: WhatsApp Campaign**:
   - Implement bulk WhatsApp messaging
   - Track contact attempts
   - Monitor conversion rate (Revolico users → Rico-Cuba users)

## Important Notes

- **Image Privacy**: Original Revolico image URLs are never exposed to Rico-Cuba
- **Moderation Required**: All imported listings have `moderationStatus='pending'`
- **Not Published**: Listings start with `isPublished='false'` until moderated
- **Phone Matching**: Uses exact phone number match for auto-assignment
- **Category Fallback**: Unknown categories → "Otros"
- **Error Handling**: Import continues on individual listing errors
- **Idempotent**: Duplicate imports are skipped (by `revolico_id`)

## Configuration

### Environment Variables

**Rico-Cuba**:
```env
DATABASE_URL=postgresql://...
SCRAPER_API_URL=http://localhost:5000  # Optional, defaults to localhost
```

**Rico-Scraper**:
```env
# No changes needed - already configured
```

## Support

For issues or questions:
- Check logs: `console.log` in both services
- Verify database migration ran successfully
- Ensure both services are running
- Test API endpoints individually

---

**Status**: ✅ All implementation complete
**Ready for**: Database migration & testing
