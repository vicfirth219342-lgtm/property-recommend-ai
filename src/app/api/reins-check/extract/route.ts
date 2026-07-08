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
      // ブロック要素の境界で改行を保持してテキスト化
      // （改行を潰すと「物件名\nクレッセント...」→「物件名 クレッセント...」となりラベル認識が壊れる）
      textToExtract = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|tr|td|th|h[1-6]|section|article|header|footer)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/[ \t]+/g, ' ')       // 水平方向の空白のみ圧縮（改行は保持）
        .replace(/\n[ \t]+/g, '\n')    // 行頭空白を除去
        .replace(/[ \t]+\n/g, '\n')    // 行末空白を除去
        .replace(/\n{3,}/g, '\n\n')    // 3連続以上の改行を2つに圧縮
        .slice(0, 12000)
    } catch (e) {
      return NextResponse.json({ error: `URLの取得に失敗しました: ${String(e)}` }, { status: 422 })
    }
  }

  const prop = extractFromText(textToExtract)
  const keywords = buildSearchKeywords(prop)

  return NextResponse.json({ ...prop, search_keywords: keywords })
}
