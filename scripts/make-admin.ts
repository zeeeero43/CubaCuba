import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function makeAdmin() {
  try {
    const email = await question('Email del usuario a hacer admin: ');
    
    if (!email || !email.includes('@')) {
      console.error('❌ Email inválido');
      process.exit(1);
    }

    // Find user by email
    const user = await db.select()
      .from(users)
      .where(eq(users.email, email.trim()))
      .limit(1);

    if (user.length === 0) {
      console.error(`❌ Usuario con email "${email}" no encontrado`);
      process.exit(1);
    }

    // Update to admin
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, email.trim()));

    console.log(`✅ Usuario "${user[0].name}" (${email}) ahora es admin!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

makeAdmin();
