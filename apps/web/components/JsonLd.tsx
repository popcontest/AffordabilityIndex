/**
 * JSON-LD structured data component
 * Safely injects JSON-LD script tags for SEO
 */

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 0),
      }}
    />
  );
}

/**
 * Generate BreadcrumbList JSON-LD
 * @param items - Array of breadcrumb items with name and url
 * @returns JSON-LD object
 */
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Place JSON-LD
 * @param name - Place name
 * @param stateAbbr - State abbreviation
 * @param url - Canonical URL
 * @returns JSON-LD object
 */
export function generatePlaceJsonLd(
  name: string,
  stateAbbr: string,
  url: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name,
    url,
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: stateAbbr,
    },
  };
}

/**
 * Generate Dataset JSON-LD for methodology/data pages
 * @param name - Dataset name
 * @param description - Dataset description
 * @param url - Canonical URL
 * @returns JSON-LD object
 */
export function generateDatasetJsonLd(
  name: string,
  description: string,
  url: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    creator: {
      '@type': 'Organization',
      name: 'Affordability Index',
    },
    includedInDataCatalog: {
      '@type': 'DataCatalog',
      name: 'Affordability Index',
    },
  };
}
