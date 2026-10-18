import dotenv from 'dotenv';
dotenv.config();

import { buildApp } from './app.js';
import { seedDatabase } from './db/seed.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const app = await buildApp({ enableLogging: true });

  // Seed demo data if requested or in development
  if (process.env.SEED_DEMO !== 'false') {
    await seedDatabase();
  }

  try {
    await app.listen({ port: PORT, host: HOST });

    // Terminal Banner matching Section 06:
    // { qirsh } v1 · http://localhost:3000 · docs /docs
    console.log('\n\x1b[32m\x1b[1m{ qirsh }\x1b[0m v1 · \x1b[36mhttp://localhost:' + PORT + '\x1b[0m · docs \x1b[33m/docs\x1b[0m');
    console.log('\x1b[90mEvery fils accounted for. Back-end REST API running.\x1b[0m\n');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
