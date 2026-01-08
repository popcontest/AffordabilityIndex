import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function TestScoresPage() {
  // Get top 10 most affordable ZIPs
  const topAffordable = await prisma.affordabilitySnapshot.findMany({
    where: {
      geoType: 'ZCTA',
      trueAffordabilityScore: { not: null },
    },
    orderBy: {
      trueAffordabilityScore: 'desc',
    },
    take: 10,
    // Note: We fetch geo data separately since we handle joins manually
  });

  // Get bottom 10 least affordable ZIPs
  const leastAffordable = await prisma.affordabilitySnapshot.findMany({
    where: {
      geoType: 'ZCTA',
      trueAffordabilityScore: { not: null },
      medianIncome: { gte: 20000 }, // Filter out bad data
    },
    orderBy: {
      trueAffordabilityScore: 'asc',
    },
    take: 10,
  });

  // Get geo data for top affordable
  const topZips = await prisma.geoZcta.findMany({
    where: {
      zcta: { in: topAffordable.map(s => s.geoId) },
    },
  });

  const bottomZips = await prisma.geoZcta.findMany({
    where: {
      zcta: { in: leastAffordable.map(s => s.geoId) },
    },
  });

  // Merge data
  const topWithGeo = topAffordable.map(snap => ({
    ...snap,
    geo: topZips.find(z => z.zcta === snap.geoId),
  }));

  const bottomWithGeo = leastAffordable.map(snap => ({
    ...snap,
    geo: bottomZips.find(z => z.zcta === snap.geoId),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
        </div>

        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          True Affordability Scores Test Page
        </h1>
        <p className="text-gray-600 mb-8">
          Showing real calculated scores from the database
        </p>

        {/* Most Affordable */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-green-600 mb-4 flex items-center gap-2">
            🏆 Top 10 Most Affordable ZIP Codes
          </h2>
          <div className="space-y-4">
            {topWithGeo.map((item, idx) => {
              const personaScores = item.personaScores ? JSON.parse(item.personaScores as string) : null;
              const leftOver = (item.netDisposableIncome || 0) - (item.annualHousingCost || 0);

              return (
                <div key={item.id} className="border-l-4 border-green-500 pl-4 py-2 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        #{idx + 1} ZIP {item.geoId} - {item.geo?.city || 'Unknown'}, {item.geo?.stateAbbr || '?'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 grid grid-cols-2 gap-x-4">
                        <div>Home Value: ${item.homeValue?.toLocaleString()}</div>
                        <div>Income: ${item.medianIncome?.toLocaleString()}</div>
                        <div>Simple Ratio: {item.simpleRatio?.toFixed(1)}</div>
                        <div className="font-bold text-green-600">
                          True Score: {item.trueAffordabilityScore?.toFixed(1)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm bg-green-50 inline-block px-3 py-1 rounded">
                        💰 ${Math.round(leftOver/12).toLocaleString()}/month left over
                      </div>
                      {personaScores && (
                        <div className="mt-2 text-xs text-gray-500 flex gap-3">
                          <span>Single: {personaScores.single?.toFixed(1)}</span>
                          <span>Couple: {personaScores.couple?.toFixed(1)}</span>
                          <span>Family: {personaScores.family?.toFixed(1)}</span>
                          <span>Remote: {personaScores.remote?.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Least Affordable */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2">
            ❌ 10 Least Affordable ZIP Codes
          </h2>
          <div className="space-y-4">
            {bottomWithGeo.map((item, idx) => {
              const leftOver = (item.netDisposableIncome || 0) - (item.annualHousingCost || 0);

              return (
                <div key={item.id} className="border-l-4 border-red-500 pl-4 py-2 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        #{idx + 1} ZIP {item.geoId} - {item.geo?.city || 'Unknown'}, {item.geo?.stateAbbr || '?'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 grid grid-cols-2 gap-x-4">
                        <div>Home Value: ${item.homeValue?.toLocaleString()}</div>
                        <div>Income: ${item.medianIncome?.toLocaleString()}</div>
                        <div>Simple Ratio: {item.simpleRatio?.toFixed(1)}</div>
                        <div className="font-bold text-red-600">
                          True Score: {item.trueAffordabilityScore?.toFixed(1)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm bg-red-50 inline-block px-3 py-1 rounded">
                        💸 ${Math.round(Math.abs(leftOver)/12).toLocaleString()}/month {leftOver < 0 ? 'SHORT' : 'left'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">📊 Database Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{topAffordable.length}</div>
              <div className="text-sm text-gray-600">Top Scores Loaded</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{leastAffordable.length}</div>
              <div className="text-sm text-gray-600">Bottom Scores Loaded</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {topAffordable[0]?.trueAffordabilityScore?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Highest Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
