const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { URL } = require('url');

require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set in .env");
  process.exit(1);
}

const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password || ''),
  database: dbUrl.pathname.substring(1),
  connectionLimit: 10,
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
