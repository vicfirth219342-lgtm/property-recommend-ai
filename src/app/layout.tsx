import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'

const noto = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: '物件提案システム',
  description: '顧客別・未提案物件通知システム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${noto.className} min-h-full`}>
        <nav className="bg-slate-800 text-white px-6 py-3 flex gap-6 items-center">
          <span className="font-bold text-lg">物件提案システム</span>
          <a href="/dashboard" className="hover:text-slate-300 text-sm">ダッシュボード</a>
          <a href="/customers" className="hover:text-slate-300 text-sm">顧客管理</a>
          <a href="/properties" className="hover:text-slate-300 text-sm">物件一覧</a>
          {/* ポータル関連（手動探索/レインズ掲載確認/照合キュー/エリア管理）はポータル停止に伴い非表示。ページは残置 */}
        </nav>
        <main className="min-h-screen bg-slate-50">{children}</main>
      </body>
    </html>
  )
}
