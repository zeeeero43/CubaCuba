/**
 * Refresh Listings - Löscht alle Anzeigen und holt neue vom Scraper
 */

import 'dotenv/config';
import { db } from "../server/db";
import { listings } from "../shared/schema";
import { importRevolicoListings } from "../server/revolico-import";

async function refreshListings() {
  try {
    console.log("🗑️  Lösche alle bestehenden Anzeigen...");

    // Lösche alle Listings
    const deleteResult = await db.delete(listings);
    console.log(`✅ ${deleteResult.rowCount || 0} Anzeigen gelöscht`);

    console.log("\n📥 Hole neue Anzeigen vom Scraper...");

    // Importiere neue Listings vom Scraper
    const scraperUrl = process.env.SCRAPER_API_URL || 'http://localhost:5000';
    const scraperPublicUrl = process.env.SCRAPER_PUBLIC_URL || 'http://217.154.105.67:5000';
    const importResult = await importRevolicoListings(scraperUrl, scraperPublicUrl);

    console.log("\n📊 Import-Ergebnis:");
    console.log(`  ✓ Importiert: ${importResult.imported}`);
    console.log(`  ⊗ Übersprungen: ${importResult.skipped}`);
    console.log(`  ✗ Fehler: ${importResult.errors}`);

    if (importResult.details.length > 0) {
      console.log("\n📝 Details:");
      importResult.details.forEach(detail => {
        const icon = detail.status === 'imported' ? '✓' :
                     detail.status === 'skipped' ? '⊗' : '✗';
        console.log(`  ${icon} ${detail.revolico_id}: ${detail.status}${detail.reason ? ` (${detail.reason})` : ''}`);
      });
    }

    console.log("\n✅ Fertig!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Fehler:", error);
    process.exit(1);
  }
}

refreshListings();
