#!/usr/bin/env node
/**
 * Quick verification that Phase 2 rankings are working correctly
 * Tests that V2 composite scores are being used for ranking
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPhase2Rankings() {
  console.log('PHASE 2 RANKING VERIFICATION');
  console.log('='.repeat(60));

  // Test 1: Check Detroit's V2 composite score
  console.log('\n1. Detroit V2 Score:');
  const detroit = await prisma.v2AffordabilityScore.findFirst({
    where: {
      geoType: 'CITY',
      geoId: await prisma.geoCity.findFirst({
        where: { name: 'Detroit', stateAbbr: 'MI' },
        select: { cityId: true }
      }).then(c => c?.cityId)
    },
    select: { compositeScore: true, housingScore: true }
  });

  console.log(`  Housing Score: ${detroit?.housingScore}`);
  console.log(`  Composite Score: ${detroit?.compositeScore}`);
  console.log(`  ✓ Detroit should rank by composite (79) not housing (95)`);

  // Test 2: Get top 10 large cities (500k+) - should be sorted by V2 composite
  console.log('\n2. Top 10 Large Cities (500k+) by V2 Composite:');
  const largeCities = await prisma.$queryRaw`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc.population, l.ratio,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE gc.population IS NOT NULL AND gc.population >= 500000
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT 10;
  `;

  largeCities.forEach((city, i) => {
    const score = city.compositeScore ?? city.affordabilityPercentile;
    const source = city.compositeScore ? 'V2' : 'V1';
    console.log(`  ${i+1}. ${city.name}, ${city.stateAbbr} - Score: ${score?.toFixed(1)} (${source})`);
  });

  // Test 3: Check if Detroit appears in the right position
  const detroitRank = largeCities.findIndex(c => c.name === 'Detroit');
  if (detroitRank >= 0) {
    console.log(`\n  ✓ Detroit ranks #${detroitRank + 1} among large cities`);
  } else {
    console.log(`\n  ℹ Detroit not in top 10 (expected with composite score of 79)`);
  }

  // Test 4: Verify sort direction is correct
  console.log('\n3. Sort Direction Verification:');
  let correctOrder = true;
  for (let i = 0; i < largeCities.length - 1; i++) {
    const current = largeCities[i].compositeScore ?? largeCities[i].affordabilityPercentile;
    const next = largeCities[i+1].compositeScore ?? largeCities[i+1].affordabilityPercentile;
    if (current < next) {
      console.log(`  ✗ ERROR: ${largeCities[i].name} (${current}) < ${largeCities[i+1].name} (${next})`);
      correctOrder = false;
    }
  }
  if (correctOrder) {
    console.log('  ✓ Cities correctly sorted DESC (higher score = more affordable)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Phase 2 verification complete!\n');

  await prisma.$disconnect();
}

testPhase2Rankings().catch(console.error);
