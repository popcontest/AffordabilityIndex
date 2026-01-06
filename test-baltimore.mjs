import { prisma } from './lib/prisma.ts';

async function test() {
  console.log('Querying for Baltimore, MD...');

  const baltimore = await prisma.geoCity.findMany({
    where: {
      stateAbbr: 'MD',
      slug: 'baltimore'
    },
    select: {
      cityId: true,
      name: true,
      slug: true,
      stateAbbr: true
    }
  });

  console.log('Baltimore cities found:', baltimore.length);
  console.log(JSON.stringify(baltimore, null, 2));

  console.log('\nAll Maryland cities:');
  const mdCities = await prisma.geoCity.findMany({
    where: {
      stateAbbr: 'MD'
    },
    select: {
      name: true,
      slug: true
    },
    take: 20,
    orderBy: {
      name: 'asc'
    }
  });

  console.log(JSON.stringify(mdCities, null, 2));

  await prisma.$disconnect();
}

test().catch(console.error);
