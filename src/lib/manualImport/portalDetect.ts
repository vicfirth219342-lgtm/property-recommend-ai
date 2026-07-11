import type { SiteName } from '@/types'

const DOMAIN_MAP: Array<[RegExp, SiteName]> = [
  [/suumo\.jp/i, 'suumo'],
  [/athome\.co\.jp/i, 'athome'],
  [/homes\.co\.jp/i, 'homes'],
]

const TITLE_MAP: Array<[RegExp, SiteName]> = [
  [/【SUUMO】/i, 'suumo'],
  [/【アットホーム】/i, 'athome'],
  [/【(ホームズ|HOME'S|LIFULL HOME'S)】/i, 'homes'],
]

// HTML内の title / canonical / og:url / ドメイン文字列からポータルを推定する
export function detectPortalFromHtml(html: string): SiteName | null {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (titleMatch) {
    for (const [re, portal] of TITLE_MAP) if (re.test(titleMatch[1])) return portal
  }

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
  const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)
  const urlCandidates = [canonicalMatch?.[1], ogUrlMatch?.[1]].filter((v): v is string => !!v)
  for (const url of urlCandidates) {
    for (const [re, portal] of DOMAIN_MAP) if (re.test(url)) return portal
  }

  // 最終手段: HTML全体からドメイン文字列を探す（頻出数が最も多いものを採用）
  const counts: Partial<Record<SiteName, number>> = {}
  for (const [re, portal] of DOMAIN_MAP) {
    const m = html.match(new RegExp(re.source, 'gi'))
    if (m) counts[portal] = (counts[portal] ?? 0) + m.length
  }
  const best = (Object.entries(counts) as Array<[SiteName, number]>).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : null
}
