import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobDash - 選考状況管理',
  description: '転職活動の選考状況を管理するダッシュボード',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
            <Link href="/" className="text-lg font-bold text-slate-900">
              JobDash
            </Link>
            <span className="ml-3 text-sm text-slate-500">転職活動 選考状況管理</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
