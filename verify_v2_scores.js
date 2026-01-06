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

async function verifyV2Scores() {
  console.log('\n=== V2 AFFORDABILITY SCORE VERIFICATION ===\n');

  // Task 1: Check Huntington, WV
  console.log('Task 1: Checking Huntington, WV V2 Score');
  console.log('-'.repeat(60));

  const huntingtonCity = await prisma.geoCity.findFirst({
    where: {
      name: 'Huntington',
      stateAbbr: 'WV'
    }
  });

  if (!huntingtonCity) {
    console.log('ERROR: Huntington, WV not found in geo_city table');
  } else {
    console.log(`Found city: ${huntingtonCity.name}, ${huntingtonCity.stateAbbr}`);
    console.log(`City ID: ${huntingtonCity.cityId}`);

    const huntingtonScore = await prisma.v2AffordabilityScore.findUnique({
      where: {
        geoType_geoId: {
          geoType: 'CITY',
          geoId: huntingtonCity.cityId
        }
      }
    });

    if (!huntingtonScore) {
      console.log('❌ NO V2 SCORE FOUND for Huntington, WV');
    } else {
      console.log('✅ V2 SCORE EXISTS for Huntington, WV');
      console.log('   Composite Score:', huntingtonScore.compositeScore);
      console.log('   Housing Score:', huntingtonScore.housingScore);
      console.log('   COL Score:', huntingtonScore.colScore);
      console.log('   Tax Score:', huntingtonScore.taxScore);
      console.log('   QOL Score:', huntingtonScore.qolScore);
      console.log('   Data Quality:', huntingtonScore.dataQuality);
      console.log('   Housing Burden Ratio:', huntingtonScore.housingBurdenRatio);
      console.log('   COL Burden Ratio:', huntingtonScore.colBurdenRatio);
      console.log('   Tax Burden Ratio:', huntingtonScore.taxBurdenRatio);
      console.log('   Calculated At:', huntingtonScore.calculatedAt);
    }
  }

  // Task 2: Overall V2 Coverage
  console.log('\n\nTask 2: Overall V2 Coverage Statistics');
  console.log('-'.repeat(60));

  const totalCount = await prisma.v2AffordabilityScore.count();
  console.log(`Total V2 Scores: ${totalCount}`);

  const byGeoType = await prisma.v2AffordabilityScore.groupBy({
    by: ['geoType'],
    _count: {
      geoType: true
    }
  });

  console.log('\nBy Geography Type:');
  byGeoType.forEach(item => {
    console.log(`   ${item.geoType}: ${item._count.geoType}`);
  });

  const byDataQuality = await prisma.v2AffordabilityScore.groupBy({
    by: ['dataQuality'],
    _count: {
      dataQuality: true
    }
  });

  console.log('\nBy Data Quality:');
  byDataQuality.forEach(item => {
    console.log(`   ${item.dataQuality || 'NULL'}: ${item._count.dataQuality}`);
  });

  // Task 3: Spot Check Other Cities
  console.log('\n\nTask 3: Spot Check Other Cities');
  console.log('-'.repeat(60));

  const citiesToCheck = [
    { name: 'Baltimore', state: 'MD' },
    { name: 'Chicago', state: 'IL' },
    { name: 'New York', state: 'NY' }
  ];

  for (const cityInfo of citiesToCheck) {
    const city = await prisma.geoCity.findFirst({
      where: {
        name: cityInfo.name,
        stateAbbr: cityInfo.state
      }
    });

    if (!city) {
      console.log(`\n${cityInfo.name}, ${cityInfo.state}: ❌ City not found in database`);
      continue;
    }

    const score = await prisma.v2AffordabilityScore.findUnique({
      where: {
        geoType_geoId: {
          geoType: 'CITY',
          geoId: city.cityId
        }
      }
    });

    if (!score) {
      console.log(`\n${cityInfo.name}, ${cityInfo.state}: ❌ NO V2 SCORE`);
    } else {
      console.log(`\n${cityInfo.name}, ${cityInfo.state}: ✅ V2 Score = ${score.compositeScore}`);
      console.log(`   Housing: ${score.housingScore}, COL: ${score.colScore}, Tax: ${score.taxScore}, QOL: ${score.qolScore}`);
      console.log(`   Data Quality: ${score.dataQuality}`);
    }
  }

  // Additional Stats
  console.log('\n\nAdditional Statistics');
  console.log('-'.repeat(60));

  const avgScores = await prisma.v2AffordabilityScore.aggregate({
    _avg: {
      compositeScore: true,
      housingScore: true,
      colScore: true,
      taxScore: true
    },
    _min: {
      compositeScore: true
    },
    _max: {
      compositeScore: true
    }
  });

  console.log('Average Composite Score:', avgScores._avg.compositeScore?.toFixed(2));
  console.log('Min Composite Score:', avgScores._min.compositeScore?.toFixed(2));
  console.log('Max Composite Score:', avgScores._max.compositeScore?.toFixed(2));
  console.log('Average Housing Score:', avgScores._avg.housingScore?.toFixed(2));
  console.log('Average COL Score:', avgScores._avg.colScore?.toFixed(2));
  console.log('Average Tax Score:', avgScores._avg.taxScore?.toFixed(2));

  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(60) + '\n');
}

verifyV2Scores()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
