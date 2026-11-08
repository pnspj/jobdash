import type { Metadata } from 'next';
import Link from 'next/link';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobDash - 選考状況管理',
  description: '転職活動の選考状況を管理するダッシュボード',
};

const NAV_ITEMS = [
  { href: '/', label: '企業一覧' },
  { href: '/calendar', label: 'カレンダー' },
  { href: '/agents', label: 'エージェント' },
  { href: '/reports', label: '連絡用テキスト' },
  { href: '/stats', label: '集計' },
  { href: '/settings', label: 'データ管理' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-slate-900">
              JobDash
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="text-slate-600 hover:text-slate-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
