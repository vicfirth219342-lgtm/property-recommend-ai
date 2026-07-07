import { NextResponse } from 'next/server'

// ダッシュボードの「今すぐ送信」ボタン用ラッパー
// CRON_SECRET をサーバー側で付与して daily-notify を呼び出す
export async function POST() {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET が設定されていません' }, { status: 500 })
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3003')

  const res = await fetch(`${baseUrl}/api/cron/daily-notify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
