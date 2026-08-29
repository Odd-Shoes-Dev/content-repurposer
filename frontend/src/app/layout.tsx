import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const BASE_URL = 'https://repurposer.blueoxjobs.eu';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Repurposer — Turn One Piece of Content Into Many',
    template: '%s | Repurposer',
  },
  description:
    'Paste any content and instantly get LinkedIn posts, X threads, blog articles, video scripts, newsletters, carousels, and more — powered by AI. Create once, publish everywhere.',
  keywords: [
    'content repurposer',
    'AI content tool',
    'repurpose content',
    'LinkedIn post generator',
    'Twitter thread generator',
    'content marketing AI',
    'social media content generator',
    'blog to LinkedIn',
    'podcast to social media',
  ],
  authors: [{ name: 'Repurposer' }],
  creator: 'Repurposer',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Repurposer',
    title: 'Repurposer — Turn One Piece of Content Into Many',
    description:
      'Paste any content and instantly get LinkedIn posts, X threads, blog articles, video scripts, newsletters, and more — powered by AI.',
    images: [
      {
        url: `${BASE_URL}/logo-1200x630.png`,
        width: 1200,
        height: 630,
        alt: 'Repurposer — AI Content Repurposing Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Repurposer — Turn One Piece of Content Into Many',
    description:
      'Paste any content and instantly get LinkedIn posts, X threads, blog articles, video scripts, and more — powered by AI.',
    images: [`${BASE_URL}/logo-1200x630.png`],
  },
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
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo-30x30.png', sizes: '30x30', type: 'image/png' },
      { url: '/logo-64x64.png', sizes: '64x64', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo-300x300.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <SessionProvider>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
