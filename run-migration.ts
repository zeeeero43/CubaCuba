/**
 * Migration Script: Add Revolico Import Fields
 * Adds source, revolicoId, scrapedAt fields and makes sellerId nullable
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting migration for Revolico import fields...');

    // Start transaction
    await client.query('BEGIN');

    // Make sellerId nullable (drop NOT NULL constraint)
    console.log('1. Making sellerId nullable...');
    await client.query(`
      ALTER TABLE listings
      ALTER COLUMN seller_id DROP NOT NULL;
    `);

    // Add source field
    console.log('2. Adding source field...');
    await client.query(`
      ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user';
    `);

    // Add revolicoId field
    console.log('3. Adding revolico_id field...');
    await client.query(`
      ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS revolico_id TEXT;
    `);

    // Add scrapedAt field
    console.log('4. Adding scraped_at field...');
    await client.query(`
      ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP;
    `);

    // Create index on revolico_id for faster lookups
    console.log('5. Creating index on revolico_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_listings_revolico_id
      ON listings(revolico_id);
    `);

    // Create index on source for faster filtering
    console.log('6. Creating index on source...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_listings_source
      ON listings(source);
    `);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ Migration completed successfully!');
    console.log('Added fields:');
    console.log('  - source (TEXT, default: "user")');
    console.log('  - revolico_id (TEXT)');
    console.log('  - scraped_at (TIMESTAMP)');
    console.log('Modified fields:');
    console.log('  - seller_id (now nullable)');
    console.log('Created indexes:');
    console.log('  - idx_listings_revolico_id');
    console.log('  - idx_listings_source');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
