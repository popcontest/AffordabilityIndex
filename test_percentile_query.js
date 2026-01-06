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

async function testPercentileCalculation() {
  console.log('=== TESTING PERCENTILE CALCULATION ISSUE ===\n');

  try {
    // Get a sample of scores with their housing burden ratios
    const samples = await prisma.v2AffordabilityScore.findMany({
      take: 20,
      orderBy: {
        housingBurdenRatio: 'asc'
      }
    });

    console.log('Sample of 20 lowest housing burden ratios:');
    console.log('(These should have the HIGHEST housing scores, near 100)\n');

    samples.forEach((s, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. GeoID: ${s.geoId.padEnd(10)} ` +
                  `Burden: ${s.housingBurdenRatio.toFixed(6)}  ` +
                  `Score: ${s.housingScore}`);
    });

    console.log('\n=== DIAGNOSIS ===\n');
    console.log('EXPECTED: Scores should vary from ~1 to ~100 based on burden ratio percentiles');
    console.log('ACTUAL:   All scores are 100');
    console.log('\nROOT CAUSE HYPOTHESIS:');
    console.log('The PERCENT_RANK() calculation in calculate_v2_scores.py is likely');
    console.log('returning 0.0 for ALL records, which would result in:');
    console.log('  percentile = 0.0');
    console.log('  score = 100 - 0.0 = 100');
    console.log('\nThis happens when PERCENT_RANK() is calculated in a window with only');
    console.log('ONE row (the current geography), rather than across ALL geographies.');
    console.log('\nThe query likely has a WHERE clause that filters to a single row');
    console.log('BEFORE calculating PERCENT_RANK(), instead of filtering AFTER.');

    // Test the actual percentile query with a direct SQL query
    console.log('\n=== TESTING ACTUAL PERCENTILE QUERY ===\n');

    const testQuery = `
      WITH burden_calc AS (
        SELECT
          a."geoType",
          a."geoId",
          ((a."homeValue" * 0.80 * (0.065 / 12) * POWER(1 + 0.065 / 12, 360)) /
           (POWER(1 + 0.065 / 12, 360) - 1) +
           (a."homeValue" * COALESCE(a."propertyTaxRate", 0.01) / 12)) /
          (a."medianIncome" / 12) AS burden_ratio
        FROM affordability_snapshot a
        WHERE a."homeValue" IS NOT NULL
          AND a."medianIncome" IS NOT NULL
          AND a."medianIncome" > 0
      )
      SELECT
        "geoType",
        "geoId",
        burden_ratio,
        PERCENT_RANK() OVER (ORDER BY burden_ratio) * 100 AS percentile,
        100 - (PERCENT_RANK() OVER (ORDER BY burden_ratio) * 100) AS expected_score
      FROM burden_calc
      ORDER BY burden_ratio
      LIMIT 10
    `;

    const result = await prisma.$queryRawUnsafe(testQuery);

    console.log('First 10 geographies by burden ratio:');
    console.log('(Shows what percentiles SHOULD be)\n');

    result.forEach((row, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${row.geoType} ${row.geoId}`);
      console.log(`    Burden: ${parseFloat(row.burden_ratio).toFixed(6)}`);
      console.log(`    Percentile: ${parseFloat(row.percentile).toFixed(2)}%`);
      console.log(`    Expected Score: ${parseFloat(row.expected_score).toFixed(2)}`);
    });

    console.log('\n=== PROBLEM IDENTIFIED ===\n');
    console.log('The query in calculate_v2_scores.py (lines 214-237) has a critical flaw:');
    console.log('\nCURRENT (BROKEN) QUERY STRUCTURE:');
    console.log('  WITH burden_calc AS (');
    console.log('    SELECT ... burden_ratio FROM all_snapshots');
    console.log('  )');
    console.log('  SELECT PERCENT_RANK() OVER (ORDER BY burden_ratio) * 100');
    console.log('  FROM burden_calc');
    console.log('  WHERE "geoType" = %s AND "geoId" = %s  <-- FILTERS TO ONE ROW!');
    console.log('\nWhen you filter to ONE row, PERCENT_RANK() always returns 0.0!');
    console.log('\nCORRECT QUERY STRUCTURE:');
    console.log('  WITH burden_calc AS (');
    console.log('    SELECT ..., PERCENT_RANK() OVER (...) FROM all_snapshots  <-- Calculate here!');
    console.log('  )');
    console.log('  SELECT percentile FROM burden_calc');
    console.log('  WHERE "geoType" = %s AND "geoId" = %s  <-- Filter after calculation');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testPercentileCalculation();
