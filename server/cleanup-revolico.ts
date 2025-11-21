import { db } from "./db";
import { listings } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:5000';
const IMAGE_CHECK_TIMEOUT = 5000; // 5 seconds

/**
 * Checks if an image is still accessible via the proxy
 */
async function isImageAccessible(imageUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_CHECK_TIMEOUT);

    const response = await fetch(imageUrl, {
      method: 'HEAD', // Only check headers, don't download
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok; // Returns true if status is 2xx
  } catch (error) {
    // Timeout or network error = image not accessible
    return false;
  }
}

/**
 * Checks if at least one image in the listing is still accessible
 */
async function hasAccessibleImages(imageUrls: string[]): Promise<boolean> {
  if (!imageUrls || imageUrls.length === 0) {
    return false; // No images = not accessible
  }

  // Check all images in parallel
  const results = await Promise.all(
    imageUrls.map(url => isImageAccessible(url))
  );

  // Return true if at least ONE image is still accessible
  return results.some(result => result === true);
}

/**
 * Cleans up Revolico listings with inaccessible images
 * Returns: { checked: number, deleted: number }
 */
export async function cleanupOrphanedRevolicoListings(): Promise<{
  checked: number;
  deleted: number;
  deletedIds: string[];
}> {
  console.log('🧹 Starting Revolico cleanup...');

  // Get all Revolico-scraped listings
  const revolicoListings = await db
    .select()
    .from(listings)
    .where(eq(listings.source, 'revolico_scraped'));

  console.log(`Found ${revolicoListings.length} Revolico listings to check`);

  const deletedIds: string[] = [];
  let checked = 0;

  for (const listing of revolicoListings) {
    checked++;

    // Check if images are still accessible
    const hasImages = await hasAccessibleImages(listing.images || []);

    if (!hasImages) {
      // All images are gone - delete the listing
      console.log(`  ❌ Deleting listing ${listing.id} (${listing.revolicoId}): No accessible images`);

      await db
        .delete(listings)
        .where(eq(listings.id, listing.id));

      deletedIds.push(listing.id);
    } else {
      console.log(`  ✅ Listing ${listing.id} (${listing.revolicoId}): Images still accessible`);
    }
  }

  const summary = {
    checked,
    deleted: deletedIds.length,
    deletedIds,
  };

  console.log(`✅ Cleanup complete: ${summary.deleted}/${summary.checked} listings deleted`);
  return summary;
}

/**
 * Starts automatic cleanup job that runs every 15 minutes
 */
export function startAutomaticCleanup() {
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  console.log('🤖 Starting automatic Revolico cleanup (every 15 minutes)...');

  // Run immediately on startup
  cleanupOrphanedRevolicoListings().catch(error => {
    console.error('Error in initial cleanup:', error);
  });

  // Then run every 15 minutes
  setInterval(async () => {
    try {
      await cleanupOrphanedRevolicoListings();
    } catch (error) {
      console.error('Error in automatic cleanup:', error);
    }
  }, INTERVAL_MS);
}
