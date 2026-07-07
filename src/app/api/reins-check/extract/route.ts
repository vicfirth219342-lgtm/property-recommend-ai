import { NextRequest, NextResponse } from 'next/server'
import { extractFromText, buildSearchKeywords } from '@/lib/extractProperty'

// URL・PDF・画像テキストから物件情報を抽出
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, content } = body  // type: 'url' | 'pdf_text' | 'image_text'

  if (!content?.trim()) {
    return NextResponse.json({ error: 'content が空です' }, { status: 400 })
  }

  let textToExtract = content as string

  // URLの場合: ページをフェッチしてテキスト取得
  if (type === 'url') {
    try {
      const res = await fetch(content, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PropertyBot/1.0)' },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      // タグを除去してテキストだけ残す
      textToExtract = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 8000)  // 最大8000文字
    } catch (e) {
      return NextResponse.json({ error: `URLの取得に失敗しました: ${String(e)}` }, { status: 422 })
    }
  }

  const prop = extractFromText(textToExtract)
  const keywords = buildSearchKeywords(prop)

  return NextResponse.json({ ...prop, search_keywords: keywords })
}
