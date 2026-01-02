import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Prisma singleton for Next.js
 * Prevents multiple instances during development hot-reloading
 *
 * Prisma 7 requires an adapter for traditional database connections
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create connection pool with Supabase transaction-mode pooler
// Transaction mode uses port 6543 and supports higher concurrency (200+ connections)
const connectionString = process.env.DATABASE_URL?.replace(':5432/', ':6543/') || process.env.DATABASE_URL;

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 20, // Maximum number of clients in the pool (transaction mode supports more)
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
}

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
