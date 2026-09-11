import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Kitaab Bazaar | Second-Hand Engineering Textbooks Marketplace',
  description: 'Production SIWE EIP-4361 authentication with ERC-1271 smart account support and backend verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
