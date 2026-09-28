import { connect, runMigrations } from './index.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const { db, close } = connect(url);
try {
  await runMigrations(db);
  console.log('Migrations applied');
} finally {
  await close();
}
