import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Topshot | Pickleball Inventory & Order Management',
  description: 'Enterprise barcode-driven inventory and Delhivery order dispatch system for Topshot Pickleball.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-lime-400 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
