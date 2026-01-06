const { Client } = require('pg');

const connectionString = 'postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

const cities = [
  { name: 'Baltimore', state: 'MD' },
  { name: 'New York', state: 'NY' },
  { name: 'Los Angeles', state: 'CA' },
  { name: 'Chicago', state: 'IL' },
  { name: 'Kansas City', state: 'MO' }
];

async function queryCities() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database successfully\n');

    // First, let's check what tables exist
    console.log('Checking available tables...\n');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log();

    // Try to find the correct table name
    const geoTableResult = tablesResult.rows.find(row =>
      row.table_name.toLowerCase().includes('city') ||
      row.table_name.toLowerCase().includes('geo')
    );

    if (!geoTableResult) {
      console.log('No city/geo table found. Exiting.');
      return;
    }

    console.log(`Using table: ${geoTableResult.table_name}\n`);

    for (const city of cities) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Searching for: ${city.name}, ${city.state}`);
      console.log('='.repeat(60));

      // Search for cities with this name and state
      const result = await client.query(
        `SELECT * FROM "${geoTableResult.table_name}"
         WHERE name LIKE $1 AND "stateAbbr" = $2
         ORDER BY population DESC NULLS LAST
         LIMIT 5`,
        [`%${city.name}%`, city.state]
      );

      if (result.rows.length === 0) {
        console.log(`❌ No cities found matching "${city.name}" in ${city.state}`);
      } else {
        console.log(`✓ Found ${result.rows.length} city/cities:\n`);
        result.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.name}, ${row.stateAbbr}`);
          if (row.cityId) console.log(`     cityId: ${row.cityId}`);
          if (row.slug) console.log(`     slug: ${row.slug}`);
          if (row.population !== null && row.population !== undefined) {
            console.log(`     population: ${row.population.toLocaleString()}`);
          }
          console.log();
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Query complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
}

queryCities();
