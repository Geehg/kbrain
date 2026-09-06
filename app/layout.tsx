import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kbrain-ai-command-deck.kuriworks.chatgpt.site'),
  title: 'KBRAIN AI Command Deck',
  description: 'NOVA KINE을 위한 AI 에이전트 키맵·매크로 configurator',
  openGraph: {
    title: 'KBRAIN AI Command Deck',
    description: 'NOVA KINE Control Configurator',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'KBRAIN AI Command Deck' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KBRAIN AI Command Deck',
    description: 'NOVA KINE Control Configurator',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
