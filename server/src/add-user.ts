import bcrypt from 'bcrypt';
import pg from 'pg';
import { config } from './config.js';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

async function main() {
  const email = await ask('Email: ');
  const displayName = await ask('Display name: ');
  const password = await ask('Password: ');

  if (!email || !displayName || !password) {
    console.error('All fields are required.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, display_name, password)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name`,
      [email, displayName, hashedPassword]
    );
    const user = result.rows[0];
    console.log(`\nUser created: ${user.display_name} (${user.email}) [${user.id}]`);
  } catch (err: any) {
    if (err?.code === '23505') {
      console.error('A user with that email already exists.');
      process.exit(1);
    }
    throw err;
  } finally {
    await pool.end();
    rl.close();
  }
}

main();
