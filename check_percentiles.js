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

async function checkPercentiles() {
  console.log('\n=== CHECKING SCORE CALCULATION ISSUE ===\n');

  // Get samples with non-null component scores and check if they're all 100
  const samples = await prisma.$queryRaw`
    SELECT
      "geoId",
      "housingScore",
      "colScore",
      "taxScore",
      "housingBurdenRatio",
      "colBurdenRatio",
      "taxBurdenRatio",
      "compositeScore",
      "dataQuality"
    FROM v2_affordability_score
    WHERE "geoType" = 'CITY'
      AND "housingScore" IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 10;
  `;

  console.log('Random Sample of Cities with Housing Scores:');
  console.log('-'.repeat(80));

  for (const s of samples) {
    const city = await prisma.geoCity.findUnique({
      where: { cityId: s.geoId }
    });

    console.log(`\n${city?.name}, ${city?.stateAbbr}`);
    console.log(`  Housing: ${s.housingScore} (ratio: ${s.housingBurdenRatio})`);
    console.log(`  COL: ${s.colScore || 'N/A'} (ratio: ${s.colBurdenRatio || 'N/A'})`);
    console.log(`  Tax: ${s.taxScore || 'N/A'} (ratio: ${s.taxBurdenRatio || 'N/A'})`);
    console.log(`  Composite: ${s.compositeScore}`);
  }

  // Check for any scores that aren't exactly 100
  const nonHundred = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM v2_affordability_score
    WHERE "housingScore" != 100
       OR "colScore" != 100
       OR "taxScore" != 100
       OR "compositeScore" != 100;
  `;

  console.log('\n\n=== SCORE DISTRIBUTION CHECK ===');
  console.log('-'.repeat(80));
  console.log(`Records with at least one non-100 score: ${nonHundred[0].count}`);

  // Check individual component distributions
  const housingDist = await prisma.$queryRaw`
    SELECT
      MIN("housingScore") as min_val,
      MAX("housingScore") as max_val,
      AVG("housingScore") as avg_val,
      COUNT(DISTINCT "housingScore") as unique_values
    FROM v2_affordability_score
    WHERE "housingScore" IS NOT NULL;
  `;

  const colDist = await prisma.$queryRaw`
    SELECT
      MIN("colScore") as min_val,
      MAX("colScore") as max_val,
      AVG("colScore") as avg_val,
      COUNT(DISTINCT "colScore") as unique_values
    FROM v2_affordability_score
    WHERE "colScore" IS NOT NULL;
  `;

  const taxDist = await prisma.$queryRaw`
    SELECT
      MIN("taxScore") as min_val,
      MAX("taxScore") as max_val,
      AVG("colScore") as avg_val,
      COUNT(DISTINCT "taxScore") as unique_values
    FROM v2_affordability_score
    WHERE "taxScore" IS NOT NULL;
  `;

  console.log('\nHousing Score Distribution:');
  console.log(`  Min: ${housingDist[0].min_val}, Max: ${housingDist[0].max_val}, Avg: ${housingDist[0].avg_val}`);
  console.log(`  Unique values: ${housingDist[0].unique_values}`);

  console.log('\nCOL Score Distribution:');
  console.log(`  Min: ${colDist[0].min_val}, Max: ${colDist[0].max_val}, Avg: ${colDist[0].avg_val}`);
  console.log(`  Unique values: ${colDist[0].unique_values}`);

  console.log('\nTax Score Distribution:');
  console.log(`  Min: ${taxDist[0].min_val}, Max: ${taxDist[0].max_val}, Avg: ${taxDist[0].avg_val}`);
  console.log(`  Unique values: ${taxDist[0].unique_values}`);

  // Check if composite is always 100 when all components are 100
  const compositeCheck = await prisma.$queryRaw`
    SELECT
      "compositeScore",
      COUNT(*) as count
    FROM v2_affordability_score
    GROUP BY "compositeScore"
    ORDER BY "compositeScore" DESC;
  `;

  console.log('\n\n=== COMPOSITE SCORE BREAKDOWN ===');
  console.log('-'.repeat(80));
  console.log('Composite Score | Count');
  console.log('-'.repeat(30));
  compositeCheck.forEach(row => {
    console.log(`${String(row.compositeScore).padEnd(15)} | ${row.count}`);
  });

  console.log('\n\n=== DIAGNOSIS ===');
  console.log('-'.repeat(80));

  if (nonHundred[0].count === 0) {
    console.log('⚠️  ISSUE FOUND: ALL scores are exactly 100!');
    console.log('');
    console.log('This suggests a problem with the scoring calculation logic.');
    console.log('Possible causes:');
    console.log('  1. The percentile_to_score() function may be incorrectly implemented');
    console.log('  2. All percentile values are 0 (which would convert to score 100)');
    console.log('  3. The burden ratio calculations may not be varying correctly');
    console.log('');
    console.log('The burden ratios DO vary (as shown earlier), but the scores do not.');
    console.log('This indicates the percentile ranking step is not working correctly.');
  } else {
    console.log('✅ Score variation detected - system appears to be working correctly');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

checkPercentiles()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
