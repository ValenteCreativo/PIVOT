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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pivot-idea-casino.valecreativo.chatgpt.site'),
  title: 'PIVOT! — Hackathon Idea Casino',
  description: 'Research the hackathon. Stress-test the idea. Find the version worth building.',
  openGraph: { title:'PIVOT! — Hackathon Idea Casino', description:'Before you spend 36 hours building it, check the odds.', images:[{url:'/og.png',width:1730,height:909,alt:'PIVOT! Check the odds before you build.'}] },
  twitter: { card:'summary_large_image', title:'PIVOT! — Hackathon Idea Casino', description:'Before you spend 36 hours building it, check the odds.', images:['/og.png'] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
