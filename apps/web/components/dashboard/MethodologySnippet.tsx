import Link from 'next/link';

interface MethodologySnippetProps {
  points?: string[];
}

/**
 * Brief methodology explanation with link to full methodology page
 */
export function MethodologySnippet({ points }: MethodologySnippetProps) {
  const defaultPoints = [
    'Affordability Ratio = Median Home Value / Median Household Income',
    'Home values from Zillow Home Value Index (ZHVI)',
    'Income from US Census American Community Survey (ACS)',
    'Lower ratio = more affordable',
    'Higher ratio = less affordable',
  ];

  const displayPoints = points || defaultPoints;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">How We Calculate</h3>
      <ul className="space-y-1.5 text-sm text-gray-700 list-disc list-inside">
        {displayPoints.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
      <div className="mt-3">
        <Link href="/methodology/" className="text-sm text-blue-600 hover:underline">
          View full methodology →
        </Link>
      </div>
    </div>
  );
}
