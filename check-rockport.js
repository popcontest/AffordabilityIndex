const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Check for Rockport in Illinois
  const cities = await prisma.geoCity.findMany({
    where: {
      stateAbbr: 'IL',
      slug: {
        contains: 'rockport'
      }
    },
    select: {
      cityId: true,
      name: true,
      stateAbbr: true,
      slug: true
    }
  });

  console.log('Found cities:', cities);

  // Also check exact slug match
  const exactMatch = await prisma.geoCity.findFirst({
    where: {
      stateAbbr: 'IL',
      slug: 'rockport'
    },
    select: {
      cityId: true,
      name: true,
      stateAbbr: true,
      slug: true
    }
  });

  console.log('Exact match:', exactMatch);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
