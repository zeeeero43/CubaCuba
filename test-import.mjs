import 'dotenv/config';
import { importRevolicoListings } from './server/revolico-import.ts';

console.log('🔄 Importing listings from Revolico scraper...');

const result = await importRevolicoListings('http://localhost:5000');

console.log('\n📊 Import Results:');
console.log(`  ✅ Imported: ${result.imported}`);
console.log(`  ⏭️  Skipped: ${result.skipped}`);
console.log(`  ❌ Errors: ${result.errors}`);

if (result.details.length > 0) {
  console.log('\n📝 Details:');
  result.details.slice(0, 10).forEach(detail => {
    console.log(`  - ${detail.revolico_id}: ${detail.status} ${detail.reason ? `(${detail.reason})` : ''}`);
  });
}

process.exit(0);
