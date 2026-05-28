const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { URL } = require('url');

require('dotenv').config();

const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password || ''),
  database: dbUrl.pathname.substring(1),
  connectionLimit: 1,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Migrating LOCKED drafts to PENDING_REVIEW...');
  const result = await prisma.$executeRawUnsafe(`UPDATE procurement_drafts SET status = 'PENDING_REVIEW' WHERE status = 'LOCKED';`);
  console.log(`Successfully migrated ${result} drafts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
