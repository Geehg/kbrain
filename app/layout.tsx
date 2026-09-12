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
  title: 'LUMINKEY · NOVA KINE Tri-Mode Keyboard',
  description: 'NOVA KINE을 위한 AI 에이전트 키맵·매크로 configurator',
  openGraph: {
    title: 'LUMINKEY · NOVA KINE Tri-Mode Keyboard',
    description: 'NOVA KINE Control Configurator',
  },
  twitter: {
    card: 'summary',
    title: 'LUMINKEY · NOVA KINE Tri-Mode Keyboard',
    description: 'NOVA KINE Control Configurator',
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
