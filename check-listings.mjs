import 'dotenv/config';
import { db } from './server/db.ts';
import { listings } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

console.log('🔍 Checking for scraped listings in database...\n');

const scrapedListings = await db
  .select({
    id: listings.id,
    title: listings.title,
    sellerId: listings.sellerId,
    scrapedSellerName: listings.scrapedSellerName,
    scrapedSellerPhone: listings.scrapedSellerPhone,
    source: listings.source,
  })
  .from(listings)
  .where(eq(listings.source, 'revolico_scraped'))
  .limit(10);

console.log(`Found ${scrapedListings.length} scraped listings:\n`);

scrapedListings.forEach((listing, i) => {
  console.log(`${i + 1}. ${listing.title}`);
  console.log(`   ID: ${listing.id}`);
  console.log(`   Seller ID: ${listing.sellerId || 'NULL'}`);
  console.log(`   Scraped Name: ${listing.scrapedSellerName || 'NULL'}`);
  console.log(`   Scraped Phone: ${listing.scrapedSellerPhone || 'NULL'}`);
  console.log();
});

process.exit(0);
