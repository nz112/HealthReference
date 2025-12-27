import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Health References - Scientific Evidence for Health',
  description: 'Get evidence-based health recommendations from scientific publications',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

