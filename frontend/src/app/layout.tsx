import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Skripsiku — Asisten Penulisan Akademik AI',
  description:
    'Skripsiku adalah asisten AI akademik canggih untuk skripsi, tesis, dan jurnal ilmiah. Bantu menulis, merevisi, dan mengoptimalkan karya akademik Anda dalam Bahasa Indonesia dan Inggris.',
  keywords: ['skripsi', 'tesis', 'jurnal', 'AI', 'akademik', 'penulisan', 'research assistant'],
  openGraph: {
    title: 'Skripsiku — Asisten Penulisan Akademik AI',
    description: 'Tulis dan sempurnakan karya akademik dengan bantuan AI terkini.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="bg-navy-900 font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#121D33',
              color: '#f1f5f9',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#white' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#white' } },
          }}
        />
      </body>
    </html>
  );
}
