import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const hashedPassword = await hashPassword('admin123');

    const result = await pool.query(`
      INSERT INTO users (email, name, phone, password, role, provider, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (email) DO UPDATE
      SET role = $5, password = $4
      RETURNING id, email, name, role
    `, [
      'admin@rico-cuba.com',
      'Admin',
      '+5350000000',
      hashedPassword,
      'admin',
      'local'
    ]);

    console.log('✅ Admin account created successfully!');
    console.log('Email: admin@rico-cuba.com');
    console.log('Password: admin123');
    console.log('Role:', result.rows[0].role);
    console.log('ID:', result.rows[0].id);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();
