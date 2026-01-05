import { useMemo } from 'react';
import { LaptopIcon } from '@/components/icons/LaptopIcon';
import { HouseIcon } from '@/components/icons/HouseIcon';
import { SunriseIcon } from '@/components/icons/SunriseIcon';
import { FamilyIcon } from '@/components/icons/FamilyIcon';
import { TrendUpIcon } from '@/components/icons/TrendUpIcon';
import { GraduationIcon } from '@/components/icons/GraduationIcon';
import type { ComponentType } from 'react';

interface PersonaCardsProps {
  ratio: number;
  medianHomeValue: number;
  medianIncome: number;
  cityName: string;
  stateAbbr: string;
  population?: number | null;
}

interface Persona {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  fit: 'excellent' | 'good' | 'challenging';
}

export function PersonaCards({
  ratio,
  medianHomeValue,
  medianIncome,
  cityName,
  stateAbbr,
  population,
}: PersonaCardsProps) {
  // Memoize personas array to prevent recreation on every render (includes Icon components)
  const personas = useMemo(() => {
    // Determine which personas are a good fit based on affordability
    const isHighlyAffordable = ratio < 3.5;
    const isModeratelyAffordable = ratio >= 3.5 && ratio < 5.0;
    const isSmallTown = (population ?? 0) < 10000;

    const result: Persona[] = [];

    // Remote Workers
    if (isHighlyAffordable || isModeratelyAffordable) {
      result.push({
        Icon: LaptopIcon,
        title: 'Remote Workers & Digital Nomads',
        description: `With housing costs ${Math.round((1 - 1/ratio) * 100)}% lower than income-equivalent areas, you can save $${Math.round((medianHomeValue * 0.005) * (ratio - 2.5)).toLocaleString()}/month while working from anywhere. Perfect for building wealth while maintaining your big-city salary.`,
        fit: isHighlyAffordable ? 'excellent' : 'good',
      });
    }

    // First-time Buyers
    if (medianHomeValue < 400000) {
      result.push({
        Icon: HouseIcon,
        title: 'First-Time Homebuyers',
        description: `With median homes at $${medianHomeValue.toLocaleString()}, you can get into homeownership with as little as $${Math.round(medianHomeValue * 0.035).toLocaleString()} down (3.5% FHA). Stop renting and start building equity for ${Math.round(medianHomeValue * 0.07 / 12).toLocaleString()}/month.`,
        fit: isHighlyAffordable ? 'excellent' : 'good',
      });
    }

    // Retirees
    if (isHighlyAffordable) {
      result.push({
        Icon: SunriseIcon,
        title: 'Retirees & Empty Nesters',
        description: `Stretch your retirement savings further with highly affordable housing. Your fixed income goes much further here. Downsize from expensive metros and unlock $${Math.round((500000 - medianHomeValue) / 1000)}K+ in home equity.`,
        fit: 'excellent',
      });
    }

    // Young Families
    if (isSmallTown || isHighlyAffordable) {
      result.push({
        Icon: FamilyIcon,
        title: 'Young Families Seeking Space',
        description: `Trade urban density for ${isSmallTown ? 'tight-knit community and' : ''} affordable square footage. Get the yard, garage, and extra bedrooms you need without breaking the bank. Perfect for families prioritizing space over city amenities.`,
        fit: isSmallTown && isHighlyAffordable ? 'excellent' : 'good',
      });
    }

    // Investors
    if (ratio < 4.0) {
      result.push({
        Icon: TrendUpIcon,
        title: 'Real Estate Investors',
        description: `Strong affordability means healthy rental market potential. Lower entry costs and steady demand from locals and relocators make this a smart buy-and-hold or rental property market.`,
        fit: ratio < 3.0 ? 'excellent' : 'good',
      });
    }

    // Career Changers / Lower Income
    if (medianIncome < 65000 && isHighlyAffordable) {
      result.push({
        Icon: GraduationIcon,
        title: 'Career Changers & Service Workers',
        description: `Homeownership is realistic here on service industry or entry-level salaries ($${medianIncome.toLocaleString()} median). Teachers, nurses, tradespeople can actually afford to live where they work.`,
        fit: 'excellent',
      });
    }

    return result;
  }, [ratio, medianHomeValue, medianIncome, population]);

  const fitColors = {
    excellent: 'border-green-300 bg-green-50',
    good: 'border-blue-300 bg-blue-50',
    challenging: 'border-yellow-300 bg-yellow-50',
  };

  const fitLabels = {
    excellent: 'Excellent Fit',
    good: 'Good Fit',
    challenging: 'Consider Trade-offs',
  };

  const fitBadgeColors = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    challenging: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Who Should Consider {cityName}?
        </h2>
        <p className="text-gray-600">
          Based on affordability metrics, this area is especially well-suited for:
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {personas.map((persona, index) => {
          const { Icon } = persona;
          return (
            <div
              key={index}
              className={`border-2 rounded-lg p-5 ${fitColors[persona.fit]} transition hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon className="w-10 h-10 text-ai-warm" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {persona.title}
                    </h3>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${fitBadgeColors[persona.fit]}`}>
                      {fitLabels[persona.fit]}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {persona.description}
              </p>
            </div>
          );
        })}
      </div>

      {personas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Affordability data is being calculated for this area.</p>
        </div>
      )}
    </div>
  );
}
