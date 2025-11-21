import 'dotenv/config';
import { db } from './server/db.ts';
import { listings } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

console.log('🔍 Checking contact info for scraped listings...\n');

const scrapedListings = await db
  .select({
    id: listings.id,
    title: listings.title,
    contactPhone: listings.contactPhone,
    contactWhatsApp: listings.contactWhatsApp,
    scrapedSellerName: listings.scrapedSellerName,
    scrapedSellerPhone: listings.scrapedSellerPhone,
  })
  .from(listings)
  .where(eq(listings.source, 'revolico_scraped'))
  .limit(10);

scrapedListings.forEach((listing, i) => {
  console.log(`${i + 1}. ${listing.title}`);
  console.log(`   Contact Phone: ${listing.contactPhone || 'NULL'}`);
  console.log(`   WhatsApp: ${listing.contactWhatsApp}`);
  console.log(`   Scraped Name: ${listing.scrapedSellerName || 'NULL'}`);
  console.log(`   Scraped Phone: ${listing.scrapedSellerPhone || 'NULL'}`);
  console.log();
});

process.exit(0);
