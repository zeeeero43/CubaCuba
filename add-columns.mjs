import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function addColumns() {
  await client.connect();

  await client.query(`
    ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS scraped_seller_name text,
    ADD COLUMN IF NOT EXISTS scraped_seller_phone text;
  `);

  console.log('✅ Columns added successfully!');

  await client.end();
}

addColumns().catch(console.error);
