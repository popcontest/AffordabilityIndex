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

async function analyzeV2Scores() {
  console.log('=== V2 AFFORDABILITY SCORE ANALYSIS ===\n');

  try {
    // Get all V2 scores
    const allScores = await prisma.v2AffordabilityScore.findMany();

    console.log(`Total V2 scores in database: ${allScores.length}\n`);

    if (allScores.length === 0) {
      console.log('No V2 scores found in database!');
      return;
    }

    // Fetch geography data for CITY type (most common)
    const cityIds = allScores.filter(s => s.geoType === 'CITY').map(s => s.geoId);
    const cities = await prisma.geoCity.findMany({
      where: { cityId: { in: cityIds } }
    });
    const cityMap = new Map(cities.map(c => [c.cityId, c]));

    // Attach geography info to scores
    allScores.forEach(score => {
      if (score.geoType === 'CITY') {
        const city = cityMap.get(score.geoId);
        if (city) {
          score.geography = {
            name: city.name,
            state: city.stateAbbr,
            geo_type: score.geoType
          };
        }
      }
      // For now, just set a placeholder for non-CITY types
      if (!score.geography) {
        score.geography = {
          name: score.geoId,
          state: 'N/A',
          geo_type: score.geoType
        };
      }
    });

    // 1. COMPOSITE SCORE DISTRIBUTION
    console.log('=== 1. COMPOSITE SCORE DISTRIBUTION ===');
    const compositeScores = allScores.map(s => s.compositeScore).filter(s => s !== null);
    const compositeScores100 = compositeScores.filter(s => s === 100);
    const compositeScoresBelow100 = compositeScores.filter(s => s < 100);

    console.log(`Count with compositeScore = 100: ${compositeScores100.length}`);
    console.log(`Count with compositeScore < 100: ${compositeScoresBelow100.length}`);
    console.log(`Min composite score: ${Math.min(...compositeScores)}`);
    console.log(`Max composite score: ${Math.max(...compositeScores)}`);
    console.log(`Average composite score: ${(compositeScores.reduce((a, b) => a + b, 0) / compositeScores.length).toFixed(2)}`);

    // Sample of varied scores
    console.log('\nSample cities with varied composite scores:');
    const sortedByComposite = [...allScores]
      .filter(s => s.compositeScore !== null)
      .sort((a, b) => a.compositeScore - b.compositeScore);

    const samples = [
      sortedByComposite[0], // lowest
      sortedByComposite[Math.floor(sortedByComposite.length * 0.25)], // 25th percentile
      sortedByComposite[Math.floor(sortedByComposite.length * 0.5)], // median
      sortedByComposite[Math.floor(sortedByComposite.length * 0.75)], // 75th percentile
      sortedByComposite[sortedByComposite.length - 1] // highest
    ];

    samples.forEach((s, idx) => {
      const labels = ['Lowest', '25th %ile', 'Median', '75th %ile', 'Highest'];
      console.log(`  ${labels[idx]}: ${s.geography.name}, ${s.geography.state} - Score: ${s.compositeScore}`);
    });

    // 2. COMPONENT SCORE DISTRIBUTION
    console.log('\n=== 2. COMPONENT SCORE DISTRIBUTION ===');

    // Housing scores
    const housingScores = allScores.map(s => s.housingScore).filter(s => s !== null);
    console.log('\nHOUSING SCORES:');
    console.log(`  Count of 100s: ${housingScores.filter(s => s === 100).length}`);
    console.log(`  Min: ${Math.min(...housingScores)}`);
    console.log(`  Max: ${Math.max(...housingScores)}`);
    console.log(`  Average: ${(housingScores.reduce((a, b) => a + b, 0) / housingScores.length).toFixed(2)}`);
    console.log(`  Null count: ${allScores.filter(s => s.housingScore === null).length}`);

    // COL scores
    const colScores = allScores.map(s => s.colScore).filter(s => s !== null);
    console.log('\nCOST OF LIVING SCORES:');
    if (colScores.length > 0) {
      console.log(`  Count of 100s: ${colScores.filter(s => s === 100).length}`);
      console.log(`  Min: ${Math.min(...colScores)}`);
      console.log(`  Max: ${Math.max(...colScores)}`);
      console.log(`  Average: ${(colScores.reduce((a, b) => a + b, 0) / colScores.length).toFixed(2)}`);
    }
    console.log(`  Null count: ${allScores.filter(s => s.colScore === null).length}`);

    // Tax scores
    const taxScores = allScores.map(s => s.taxScore).filter(s => s !== null);
    console.log('\nTAX SCORES:');
    if (taxScores.length > 0) {
      console.log(`  Count of 100s: ${taxScores.filter(s => s === 100).length}`);
      console.log(`  Min: ${Math.min(...taxScores)}`);
      console.log(`  Max: ${Math.max(...taxScores)}`);
      console.log(`  Average: ${(taxScores.reduce((a, b) => a + b, 0) / taxScores.length).toFixed(2)}`);
    }
    console.log(`  Null count: ${allScores.filter(s => s.taxScore === null).length}`);

    // QOL scores
    const qolScores = allScores.map(s => s.qolScore).filter(s => s !== null);
    console.log('\nQUALITY OF LIFE SCORES:');
    if (qolScores.length > 0) {
      console.log(`  Count of 100s: ${qolScores.filter(s => s === 100).length}`);
      console.log(`  Min: ${Math.min(...qolScores)}`);
      console.log(`  Max: ${Math.max(...qolScores)}`);
      console.log(`  Average: ${(qolScores.reduce((a, b) => a + b, 0) / qolScores.length).toFixed(2)}`);
    }
    console.log(`  Null count: ${allScores.filter(s => s.qolScore === null).length}`);

    // 3. BURDEN RATIO ANALYSIS
    console.log('\n=== 3. BURDEN RATIO ANALYSIS ===');

    // Housing burden
    const housingBurdens = allScores.map(s => s.housingBurdenRatio).filter(b => b !== null);
    console.log('\nHOUSING BURDEN RATIO:');
    console.log(`  Min: ${Math.min(...housingBurdens).toFixed(4)}`);
    console.log(`  Max: ${Math.max(...housingBurdens).toFixed(4)}`);
    console.log(`  Average: ${(housingBurdens.reduce((a, b) => a + b, 0) / housingBurdens.length).toFixed(4)}`);
    console.log(`  Null count: ${allScores.filter(s => s.housingBurdenRatio === null).length}`);
    console.log(`  ** VARIATION CHECK: ${Math.max(...housingBurdens) - Math.min(...housingBurdens) > 0 ? 'GOOD - Values vary!' : 'BAD - All same value!'} **`);

    // COL burden
    const colBurdens = allScores.map(s => s.colBurdenRatio).filter(b => b !== null);
    console.log('\nCOST OF LIVING BURDEN RATIO:');
    if (colBurdens.length > 0) {
      console.log(`  Min: ${Math.min(...colBurdens).toFixed(4)}`);
      console.log(`  Max: ${Math.max(...colBurdens).toFixed(4)}`);
      console.log(`  Average: ${(colBurdens.reduce((a, b) => a + b, 0) / colBurdens.length).toFixed(4)}`);
      console.log(`  ** VARIATION CHECK: ${Math.max(...colBurdens) - Math.min(...colBurdens) > 0 ? 'GOOD - Values vary!' : 'BAD - All same value!'} **`);
    }
    console.log(`  Null count: ${allScores.filter(s => s.colBurdenRatio === null).length}`);

    // Tax burden
    const taxBurdens = allScores.map(s => s.taxBurdenRatio).filter(b => b !== null);
    console.log('\nTAX BURDEN RATIO:');
    if (taxBurdens.length > 0) {
      console.log(`  Min: ${Math.min(...taxBurdens).toFixed(4)}`);
      console.log(`  Max: ${Math.max(...taxBurdens).toFixed(4)}`);
      console.log(`  Average: ${(taxBurdens.reduce((a, b) => a + b, 0) / taxBurdens.length).toFixed(4)}`);
      console.log(`  ** VARIATION CHECK: ${Math.max(...taxBurdens) - Math.min(...taxBurdens) > 0 ? 'GOOD - Values vary!' : 'BAD - All same value!'} **`);
    }
    console.log(`  Null count: ${allScores.filter(s => s.taxBurdenRatio === null).length}`);

    // 4. DATA QUALITY BREAKDOWN
    console.log('\n=== 4. DATA QUALITY BREAKDOWN ===');

    const qualityCounts = {};
    allScores.forEach(s => {
      const quality = s.dataQuality || 'null';
      qualityCounts[quality] = (qualityCounts[quality] || 0) + 1;
    });

    console.log('\nCount by dataQuality status:');
    Object.entries(qualityCounts).sort((a, b) => b[1] - a[1]).forEach(([quality, count]) => {
      console.log(`  ${quality}: ${count}`);
    });

    // Missing components analysis
    console.log('\nMissing component analysis:');
    const missingHousing = allScores.filter(s => s.housingScore === null).length;
    const missingCOL = allScores.filter(s => s.colScore === null).length;
    const missingTax = allScores.filter(s => s.taxScore === null).length;
    const missingQOL = allScores.filter(s => s.qolScore === null).length;

    const missingComponents = [
      { name: 'Housing', count: missingHousing },
      { name: 'Cost of Living', count: missingCOL },
      { name: 'Tax', count: missingTax },
      { name: 'Quality of Life', count: missingQOL }
    ].sort((a, b) => b.count - a.count);

    missingComponents.forEach(comp => {
      const pct = ((comp.count / allScores.length) * 100).toFixed(1);
      console.log(`  ${comp.name}: ${comp.count} missing (${pct}%)`);
    });

    // DIAGNOSIS
    console.log('\n=== DIAGNOSIS ===');
    if (compositeScores100.length === allScores.length) {
      console.log('⚠️  PROBLEM DETECTED: ALL composite scores are 100!');
      if (Math.max(...housingBurdens) - Math.min(...housingBurdens) > 0) {
        console.log('⚠️  Housing burden ratios VARY but scores don\'t → PERCENTILE RANKING IS BROKEN!');
      }
    } else if (compositeScoresBelow100.length > 0) {
      console.log('✓ GOOD: Composite scores show variation');
      console.log(`  Range: ${Math.min(...compositeScores)} to ${Math.max(...compositeScores)}`);
    }

    // Show examples of burden vs score relationship
    console.log('\n=== BURDEN vs SCORE EXAMPLES ===');
    const withHousingData = allScores.filter(s => s.housingBurdenRatio !== null && s.housingScore !== null);
    const sortedByBurden = [...withHousingData].sort((a, b) => a.housingBurdenRatio - b.housingBurdenRatio);

    console.log('\nHousing: Best burdens (lowest ratio) should have highest scores:');
    sortedByBurden.slice(0, 5).forEach((s, idx) => {
      console.log(`  ${idx + 1}. ${s.geography.name}, ${s.geography.state}`);
      console.log(`     Burden: ${s.housingBurdenRatio.toFixed(4)}, Score: ${s.housingScore}`);
    });

    console.log('\nHousing: Worst burdens (highest ratio) should have lowest scores:');
    sortedByBurden.slice(-5).reverse().forEach((s, idx) => {
      console.log(`  ${idx + 1}. ${s.geography.name}, ${s.geography.state}`);
      console.log(`     Burden: ${s.housingBurdenRatio.toFixed(4)}, Score: ${s.housingScore}`);
    });

  } catch (error) {
    console.error('Error analyzing V2 scores:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

analyzeV2Scores();
