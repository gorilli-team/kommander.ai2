import { Metadata } from 'next';

export const siteConfig = {
  name: 'Kommander.ai',
  title: 'Kommander.ai - AI-Powered Customer Support Assistant',
  description: 'Transform your customer support with intelligent AI chatbots. Kommander.ai provides advanced conversational AI solutions for businesses to enhance customer experience and automate support workflows.',
  url: 'https://kommander.ai',
  ogImage: 'https://kommander.ai/og-image.jpg',
  creator: 'Kommander.ai Team',
  keywords: [
    'AI chatbot',
    'customer support',
    'conversational AI',
    'business automation',
    'customer service',
    'chatbot platform',
    'AI assistant',
    'machine learning',
    'natural language processing',
    'customer experience'
  ],
  authors: [
    {
      name: 'Kommander.ai Team',
      url: 'https://kommander.ai',
    },
  ],
  locale: 'en_US',
  type: 'website',
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  publisher: siteConfig.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.title,
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@kommander_ai',
    site: '@kommander_ai',
  },
  alternates: {
    canonical: siteConfig.url,
  },
  category: 'technology',
  classification: 'Business Software',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  verification: {
    google: 'your-google-site-verification-code',
    yandex: 'your-yandex-verification-code',
    me: ['your-email@kommander.ai'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': siteConfig.name,
    'application-name': siteConfig.name,
    'msapplication-TileColor': '#2563eb',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#2563eb',
  },
};

export function generatePageMetadata({
  title,
  description,
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  tags,
  noIndex = false,
}: {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
  noIndex?: boolean;
}): Metadata {
  const pageUrl = url ? `${siteConfig.url}${url}` : siteConfig.url;
  const pageImage = image || siteConfig.ogImage;
  const pageDescription = description || siteConfig.description;

  return {
    title,
    description: pageDescription,
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type,
      locale: siteConfig.locale,
      url: pageUrl,
      title,
      description: pageDescription,
      siteName: siteConfig.name,
      images: [
        {
          url: pageImage,
          width: 1200,
          height: 630,
          alt: title,
          type: 'image/jpeg',
        },
      ],
      publishedTime,
      modifiedTime,
      authors,
      tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: pageDescription,
      images: [pageImage],
      creator: '@kommander_ai',
      site: '@kommander_ai',
    },
  };
}
