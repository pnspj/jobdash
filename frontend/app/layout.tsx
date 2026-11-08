import type { Metadata } from 'next';
import Link from 'next/link';
import { NAV_ITEMS } from '@/components/layout/nav';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobDash - 選考状況管理',
  description: '転職活動の選考状況を管理するダッシュボード',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white print:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-slate-900">
              JobDash
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-1 text-slate-600 hover:text-slate-900">
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
