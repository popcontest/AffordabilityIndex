import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Affordability Index - rules and guidelines for using our website.',
};

export default function TermsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms of Service',
    description: metadata.description,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 text-sm mb-8">
              Last Updated: December 22, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing and using Affordability Index ("the Service"), you accept and agree to be bound by the
                terms and provision of this agreement. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Affordability Index provides home affordability data and comparisons for US cities, towns, and ZIP codes.
                Our service calculates affordability ratios based on publicly available data from Zillow Research (home values)
                and the US Census Bureau (household income).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Use of Service</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-4">3.1 Permitted Use</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may use the Service for lawful purposes only. You agree not to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful code, viruses, or malware</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use automated systems to scrape or download large amounts of data</li>
                <li>Misrepresent your affiliation with any entity</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-4">3.2 Data Usage</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The affordability data presented on this site is for informational purposes only. You may not
                redistribute, resell, or create derivative works from our data without explicit written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Accuracy and Disclaimers</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-4">4.1 No Warranty</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. We make no warranties about the
                accuracy, reliability, completeness, or timeliness of the data.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-4">4.2 Data Limitations</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our affordability ratios are relative metrics for geographic comparison only. They do not constitute:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Financial advice or mortgage affordability calculations</li>
                <li>Real estate appraisals or valuations</li>
                <li>Investment recommendations</li>
                <li>Guarantees of current market conditions</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                The data combines different time periods (monthly home values and multi-year income averages) and
                may not reflect current market conditions.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-4">4.3 Third-Party Data</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our data is sourced from Zillow Research and the US Census Bureau. We are not responsible for
                errors or omissions in third-party data sources.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, AFFORDABILITY INDEX SHALL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
                INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES
                RESULTING FROM:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Your use or inability to use the Service</li>
                <li>Any reliance on data provided by the Service</li>
                <li>Errors, inaccuracies, or omissions in the data</li>
                <li>Unauthorized access to or alteration of your transmissions or data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service, including its design, text, graphics, and software, is owned by Affordability Index
                and is protected by copyright and other intellectual property laws. The underlying data is attributed
                to its respective sources (Zillow Research, US Census Bureau).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Links to Third-Party Sites</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service may contain links to third-party websites. We are not responsible for the content,
                privacy policies, or practices of third-party sites.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Modifications to Service and Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to modify or discontinue the Service at any time without notice. We may also
                revise these Terms of Service at any time. Your continued use of the Service after changes constitutes
                acceptance of the revised terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may terminate or suspend your access to the Service immediately, without prior notice or liability,
                for any reason, including if you breach these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the United States,
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-gray-700 leading-relaxed">
                <a href="/contact/" className="text-blue-600 hover:text-blue-700 underline">
                  Contact Form
                </a>
              </p>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
