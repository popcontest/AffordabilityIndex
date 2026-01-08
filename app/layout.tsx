import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WebVitals } from "@/components/WebVitals";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://affordabilityindex.org';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: '%s | Affordability Index',
    default: 'Affordability Index',
  },
  description: 'Explore home affordability across US cities, towns, and ZIP codes. Compare home values to median household income nationwide.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Affordability Index',
    title: 'Affordability Index',
    description: 'Explore home affordability across US cities, towns, and ZIP codes. Compare home values to median household income nationwide.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Affordability Index',
    description: 'Explore home affordability across US cities, towns, and ZIP codes.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MD27S36LNC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MD27S36LNC');
          `}
        </Script>

        {/* Skip Links for Keyboard Navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-medium focus:shadow-lg"
        >
          Skip to main content
        </a>
        <a
          href="#search"
          className="sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-medium focus:shadow-lg"
        >
          Skip to search
        </a>

        <Header />
        <main id="main-content" className="flex-1" role="main">
          {children}
        </main>
        <Footer />
        <WebVitals />
      </body>
    </html>
  );
}
