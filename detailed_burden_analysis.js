const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const connectionString = process.env.DATABASE_URL?.replace(':5432/', ':6543/') || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client
const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

function percentile(arr, p) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

async function analyzeBurdenDistribution() {
  console.log('=== DETAILED BURDEN RATIO DISTRIBUTION ===\n');

  try {
    const allScores = await prisma.v2AffordabilityScore.findMany();
    console.log(`Total records: ${allScores.length}\n`);

    // Housing Burden Analysis
    console.log('=== HOUSING BURDEN RATIO DISTRIBUTION ===');
    const housingBurdens = allScores.map(s => s.housingBurdenRatio).filter(b => b !== null);

    console.log(`Total non-null values: ${housingBurdens.length}`);
    console.log(`\nPercentile Distribution:`);
    console.log(`  Min (0th):     ${percentile(housingBurdens, 0).toFixed(6)}`);
    console.log(`  1st:           ${percentile(housingBurdens, 1).toFixed(6)}`);
    console.log(`  5th:           ${percentile(housingBurdens, 5).toFixed(6)}`);
    console.log(`  10th:          ${percentile(housingBurdens, 10).toFixed(6)}`);
    console.log(`  25th:          ${percentile(housingBurdens, 25).toFixed(6)}`);
    console.log(`  50th (median): ${percentile(housingBurdens, 50).toFixed(6)}`);
    console.log(`  75th:          ${percentile(housingBurdens, 75).toFixed(6)}`);
    console.log(`  90th:          ${percentile(housingBurdens, 90).toFixed(6)}`);
    console.log(`  95th:          ${percentile(housingBurdens, 95).toFixed(6)}`);
    console.log(`  99th:          ${percentile(housingBurdens, 99).toFixed(6)}`);
    console.log(`  Max (100th):   ${percentile(housingBurdens, 100).toFixed(6)}`);

    // Distribution buckets
    console.log(`\nDistribution Buckets:`);
    const buckets = [
      { label: '< 0.1 (Very Affordable)', min: 0, max: 0.1 },
      { label: '0.1 - 0.2 (Affordable)', min: 0.1, max: 0.2 },
      { label: '0.2 - 0.3 (Moderate)', min: 0.2, max: 0.3 },
      { label: '0.3 - 0.4 (Challenging)', min: 0.3, max: 0.4 },
      { label: '0.4 - 0.5 (Difficult)', min: 0.4, max: 0.5 },
      { label: '0.5 - 1.0 (Very Difficult)', min: 0.5, max: 1.0 },
      { label: '> 1.0 (Extreme)', min: 1.0, max: Infinity },
    ];

    buckets.forEach(bucket => {
      const count = housingBurdens.filter(b => b >= bucket.min && b < bucket.max).length;
      const pct = ((count / housingBurdens.length) * 100).toFixed(1);
      console.log(`  ${bucket.label.padEnd(30)} ${count.toString().padStart(6)} (${pct.padStart(5)}%)`);
    });

    // COL Burden Analysis (if available)
    const colBurdens = allScores.map(s => s.colBurdenRatio).filter(b => b !== null);
    if (colBurdens.length > 0) {
      console.log(`\n=== COST OF LIVING BURDEN RATIO DISTRIBUTION ===`);
      console.log(`Total non-null values: ${colBurdens.length}`);
      console.log(`\nPercentile Distribution:`);
      console.log(`  Min (0th):     ${percentile(colBurdens, 0).toFixed(6)}`);
      console.log(`  25th:          ${percentile(colBurdens, 25).toFixed(6)}`);
      console.log(`  50th (median): ${percentile(colBurdens, 50).toFixed(6)}`);
      console.log(`  75th:          ${percentile(colBurdens, 75).toFixed(6)}`);
      console.log(`  Max (100th):   ${percentile(colBurdens, 100).toFixed(6)}`);
    }

    // Tax Burden Analysis
    const taxBurdens = allScores.map(s => s.taxBurdenRatio).filter(b => b !== null);
    if (taxBurdens.length > 0) {
      console.log(`\n=== TAX BURDEN RATIO DISTRIBUTION ===`);
      console.log(`Total non-null values: ${taxBurdens.length}`);
      console.log(`\nPercentile Distribution:`);
      console.log(`  Min (0th):     ${percentile(taxBurdens, 0).toFixed(6)}`);
      console.log(`  25th:          ${percentile(taxBurdens, 25).toFixed(6)}`);
      console.log(`  50th (median): ${percentile(taxBurdens, 50).toFixed(6)}`);
      console.log(`  75th:          ${percentile(taxBurdens, 75).toFixed(6)}`);
      console.log(`  Max (100th):   ${percentile(taxBurdens, 100).toFixed(6)}`);
    }

    // Sample what the scores SHOULD be based on percentile ranking
    console.log(`\n=== WHAT SCORES SHOULD LOOK LIKE ===`);
    console.log(`(Based on proper percentile inversion)`);
    console.log(`\nHousing Score Examples (higher burden = lower score):`);

    const samplesForScoring = [
      { p: 1, label: 'Best 1% (lowest burden)' },
      { p: 10, label: 'Best 10%' },
      { p: 50, label: 'Median (50th)' },
      { p: 90, label: 'Worst 10% (90th)' },
      { p: 99, label: 'Worst 1% (99th)' },
    ];

    samplesForScoring.forEach(({ p, label }) => {
      const burdenAtPercentile = percentile(housingBurdens, p);
      const expectedScore = 100 * (1 - p / 100); // Inverted percentile
      console.log(`  ${label.padEnd(30)} Burden: ${burdenAtPercentile.toFixed(4)}  →  Should be score: ${expectedScore.toFixed(1)}`);
    });

    console.log(`\n=== KEY FINDING ===`);
    console.log(`All scores are currently 100, but they should range from ~1 to ~100.`);
    console.log(`The percentile ranking algorithm is not being applied correctly.`);
    console.log(`\nExpected behavior:`);
    console.log(`  - Cities with LOWEST burden ratios → HIGHEST scores (near 100)`);
    console.log(`  - Cities with HIGHEST burden ratios → LOWEST scores (near 0)`);
    console.log(`  - Score = 100 × (1 - percentile_rank)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

analyzeBurdenDistribution();
