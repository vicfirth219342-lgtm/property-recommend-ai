// 手動取込用: アップロードされたHTML文字列をPlaywrightのPageとして安全に読み込む。
// 自動クロールの scrapeOnePage() をそのまま再利用するための「取得(fetch)」に相当する層。
//
// javaScriptEnabled:false は page.evaluate/$eval 自体を無効化し scrapeOnePage が動かなくなるため採用できない。
// 代わりに全ネットワークリクエストを遮断することで、埋め込みJSが実行されても外部通信・データ持ち出しが
// 一切発生しないことを保証する（ポップアップ・ダウンロードも遮断）。
import { chromium, type Browser, type Page } from 'playwright'

export interface SandboxedLoadResult<T> {
  data: T
  requestsAttempted: string[]  // テスト用: 遮断されたリクエストURL一覧（0件であるべき）
}

// page.setContent() は about:blank を基底URLとするため、ポータルHTML内の相対リンク
// （例: athomeの /mansion/123/ ）が解決できない。既に <base> タグが無い場合のみ挿入する。
function injectBaseTag(html: string, baseUrl: string): string {
  if (/<base[\s>]/i.test(html)) return html  // 二重挿入防止
  const tag = `<base href="${baseUrl}">`
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}${tag}`)
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${tag}</head>`)
  return tag + html
}

export async function withSandboxedHtmlPage<T>(
  html: string,
  fn: (page: Page) => Promise<T>,
  baseUrl?: string,
): Promise<SandboxedLoadResult<T>> {
  const browser: Browser = await chromium.launch({ headless: true })
  const requestsAttempted: string[] = []
  try {
    const context = await browser.newContext({ acceptDownloads: false })
    const page = await context.newPage()

    // 全ネットワークリクエストを遮断（外部通信を完全に断つ）
    await page.route('**/*', (route) => {
      requestsAttempted.push(route.request().url())
      route.abort()
    })
    // ポップアップ・alert/confirm/prompt を即座に閉じる
    page.on('dialog', (d) => d.dismiss().catch(() => {}))
    page.on('popup', (p) => p.close().catch(() => {}))

    const finalHtml = baseUrl ? injectBaseTag(html, baseUrl) : html
    await page.setContent(finalHtml, { waitUntil: 'domcontentloaded' })
    const data = await fn(page)
    return { data, requestsAttempted }
  } finally {
    await browser.close()
  }
}
