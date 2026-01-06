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

async function detailedCheck() {
  console.log('\n=== DETAILED V2 SCORE ANALYSIS ===\n');

  // Get a sample of scores with variety
  console.log('Sample of V2 Scores (first 20 cities with complete data):');
  console.log('-'.repeat(80));

  const completeSample = await prisma.v2AffordabilityScore.findMany({
    where: {
      geoType: 'CITY',
      dataQuality: 'complete'
    },
    take: 20,
    include: {
      // We can't include relations, so we'll fetch city data separately
    }
  });

  for (const score of completeSample) {
    const city = await prisma.geoCity.findUnique({
      where: { cityId: score.geoId }
    });

    console.log(`\n${city?.name}, ${city?.stateAbbr} (${score.geoId})`);
    console.log(`  Composite: ${score.compositeScore.toFixed(2)}`);
    console.log(`  Housing: ${score.housingScore?.toFixed(2) || 'N/A'}, COL: ${score.colScore?.toFixed(2) || 'N/A'}, Tax: ${score.taxScore?.toFixed(2) || 'N/A'}, QOL: ${score.qolScore?.toFixed(2) || 'N/A'}`);
    console.log(`  Ratios - Housing: ${score.housingBurdenRatio?.toFixed(4) || 'N/A'}, COL: ${score.colBurdenRatio?.toFixed(4) || 'N/A'}, Tax: ${score.taxBurdenRatio?.toFixed(4) || 'N/A'}`);
  }

  // Get score distribution
  console.log('\n\n=== COMPOSITE SCORE DISTRIBUTION ===');
  console.log('-'.repeat(80));

  const distribution = await prisma.$queryRaw`
    SELECT
      CASE
        WHEN "compositeScore" = 100 THEN '100'
        WHEN "compositeScore" >= 90 THEN '90-99'
        WHEN "compositeScore" >= 80 THEN '80-89'
        WHEN "compositeScore" >= 70 THEN '70-79'
        WHEN "compositeScore" >= 60 THEN '60-69'
        WHEN "compositeScore" >= 50 THEN '50-59'
        WHEN "compositeScore" >= 40 THEN '40-49'
        WHEN "compositeScore" >= 30 THEN '30-39'
        WHEN "compositeScore" >= 20 THEN '20-29'
        WHEN "compositeScore" >= 10 THEN '10-19'
        ELSE '0-9'
      END as score_range,
      COUNT(*) as count
    FROM v2_affordability_score
    GROUP BY score_range
    ORDER BY score_range DESC;
  `;

  console.log('\nScore Range | Count');
  console.log('-'.repeat(30));
  distribution.forEach(row => {
    console.log(`${row.score_range.padEnd(11)} | ${row.count}`);
  });

  // Check for non-100 scores
  console.log('\n\n=== NON-PERFECT SCORES (if any) ===');
  console.log('-'.repeat(80));

  const nonPerfect = await prisma.v2AffordabilityScore.findMany({
    where: {
      compositeScore: {
        not: 100
      },
      geoType: 'CITY'
    },
    take: 10,
    orderBy: {
      compositeScore: 'asc'
    }
  });

  if (nonPerfect.length === 0) {
    console.log('\n⚠️  ALL SCORES ARE 100! This may indicate a scoring calculation issue.');
  } else {
    for (const score of nonPerfect) {
      const city = await prisma.geoCity.findUnique({
        where: { cityId: score.geoId }
      });

      console.log(`\n${city?.name}, ${city?.stateAbbr}: Composite = ${score.compositeScore.toFixed(2)}`);
      console.log(`  Components: H=${score.housingScore?.toFixed(2) || 'N/A'}, C=${score.colScore?.toFixed(2) || 'N/A'}, T=${score.taxScore?.toFixed(2) || 'N/A'}, Q=${score.qolScore?.toFixed(2) || 'N/A'}`);
    }
  }

  // Check raw burden ratios to see if there's variation
  console.log('\n\n=== BURDEN RATIO VARIATION ===');
  console.log('-'.repeat(80));

  const ratioStats = await prisma.$queryRaw`
    SELECT
      MIN("housingBurdenRatio") as min_housing,
      MAX("housingBurdenRatio") as max_housing,
      AVG("housingBurdenRatio") as avg_housing,
      MIN("colBurdenRatio") as min_col,
      MAX("colBurdenRatio") as max_col,
      AVG("colBurdenRatio") as avg_col,
      MIN("taxBurdenRatio") as min_tax,
      MAX("taxBurdenRatio") as max_tax,
      AVG("taxBurdenRatio") as avg_tax
    FROM v2_affordability_score
    WHERE "geoType" = 'CITY';
  `;

  const stats = ratioStats[0];
  console.log('\nHousing Burden Ratio:');
  console.log(`  Min: ${stats.min_housing || 'N/A'}, Max: ${stats.max_housing || 'N/A'}, Avg: ${stats.avg_housing || 'N/A'}`);
  console.log('\nCOL Burden Ratio:');
  console.log(`  Min: ${stats.min_col || 'N/A'}, Max: ${stats.max_col || 'N/A'}, Avg: ${stats.avg_col || 'N/A'}`);
  console.log('\nTax Burden Ratio:');
  console.log(`  Min: ${stats.min_tax || 'N/A'}, Max: ${stats.max_tax || 'N/A'}, Avg: ${stats.avg_tax || 'N/A'}`);

  console.log('\n' + '='.repeat(80));
  console.log('DETAILED ANALYSIS COMPLETE');
  console.log('='.repeat(80) + '\n');
}

detailedCheck()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
