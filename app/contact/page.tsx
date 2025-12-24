import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Affordability Index team - questions, feedback, and data inquiries.',
};

export default function ContactPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Us',
    description: metadata.description,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Contact Us</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed mb-8">
              Have questions, feedback, or data inquiries? We'd love to hear from you.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">General Inquiries</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For general questions about Affordability Index, our methodology, or data sources, please email us at:
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <a href="mailto:info@affordabilityindex.com" className="text-blue-600 hover:text-blue-700 underline font-medium">
                  info@affordabilityindex.com
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Issues</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you notice any data inaccuracies or have questions about specific metrics, please contact:
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <a href="mailto:data@affordabilityindex.com" className="text-blue-600 hover:text-blue-700 underline font-medium">
                  data@affordabilityindex.com
                </a>
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Please include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>The specific location (city, town, or ZIP code)</li>
                <li>The metric in question (home value, income, affordability ratio)</li>
                <li>A description of the issue or discrepancy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Media & Press</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For media inquiries, interviews, or press releases:
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <a href="mailto:press@affordabilityindex.com" className="text-blue-600 hover:text-blue-700 underline font-medium">
                  press@affordabilityindex.com
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy & Legal</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For privacy-related requests or legal inquiries:
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <a href="mailto:legal@affordabilityindex.com" className="text-blue-600 hover:text-blue-700 underline font-medium">
                  legal@affordabilityindex.com
                </a>
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Please review our <a href="/privacy/" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</a> and{' '}
                <a href="/terms/" className="text-blue-600 hover:text-blue-700 underline">Terms of Service</a> for more information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Response Time</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We aim to respond to all inquiries within 2-3 business days. During peak periods, response times may be longer.
              </p>
            </section>

            <section className="mb-8 bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Note on Data Sources</h3>
              <p className="text-gray-700 leading-relaxed text-sm">
                Affordability Index aggregates data from Zillow Research and the US Census Bureau. For questions about
                the underlying data collection methodologies, please refer to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 text-sm space-y-1 mt-2">
                <li>
                  <a href="https://www.zillow.com/research/data/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                    Zillow Research Data
                  </a>
                </li>
                <li>
                  <a href="https://www.census.gov/programs-surveys/acs" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                    US Census Bureau ACS
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
