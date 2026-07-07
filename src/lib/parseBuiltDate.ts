export interface ParsedBuiltDate {
  builtYear: number | null
  builtMonth: number | null
  buildingAge: number | null
}

// 元号の開始年（元年）
const GENGO_BASE: Record<string, number> = {
  '明治': 1867,
  '大正': 1911,
  '昭和': 1925,
  '平成': 1988,
  '令和': 2018,
}

function calcBuildingAge(builtYear: number, builtMonth: number | null): number {
  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1  // 1-indexed
  if (builtMonth === null) return nowYear - builtYear
  const diffMonths = (nowYear - builtYear) * 12 + (nowMonth - builtMonth)
  return Math.max(0, Math.floor(diffMonths / 12))
}

/**
 * 築年月を示す文字列を解析し、西暦年・月・築年数を返す。
 *
 * 対応フォーマット:
 *   2001年3月 / 2001年03月
 *   2001/3 / 2001-03
 *   平成18年5月 / 令和2年1月 / 昭和64年1月
 *   新築 / 築後未入居
 *   築10年 / 築25年
 */
export function parseBuiltDate(text: string): ParsedBuiltDate {
  if (!text) return { builtYear: null, builtMonth: null, buildingAge: null }

  const s = text.trim()

  // 新築 / 築後未入居 → 築0年
  if (/新築|築後未入居/.test(s)) {
    const now = new Date()
    return { builtYear: now.getFullYear(), builtMonth: now.getMonth() + 1, buildingAge: 0 }
  }

  // 元号年月: 平成18年5月 / 令和2年1月
  const gengoMatch = s.match(/(明治|大正|昭和|平成|令和)(\d+)年(?:(\d{1,2})月)?/)
  if (gengoMatch) {
    const base = GENGO_BASE[gengoMatch[1]]
    const yr = parseInt(gengoMatch[2])
    const mo = gengoMatch[3] ? parseInt(gengoMatch[3]) : null
    const builtYear = base + yr
    return { builtYear, builtMonth: mo, buildingAge: calcBuildingAge(builtYear, mo) }
  }

  // 西暦年月: 2001年3月 / 2001年03月
  const ymMatch = s.match(/(\d{4})年(?:(\d{1,2})月)?/)
  if (ymMatch) {
    const builtYear = parseInt(ymMatch[1])
    const builtMonth = ymMatch[2] ? parseInt(ymMatch[2]) : null
    return { builtYear, builtMonth, buildingAge: calcBuildingAge(builtYear, builtMonth) }
  }

  // スラッシュ/ハイフン: 2001/3 / 2001-03
  const slashMatch = s.match(/(\d{4})[\/\-](\d{1,2})/)
  if (slashMatch) {
    const builtYear = parseInt(slashMatch[1])
    const builtMonth = parseInt(slashMatch[2])
    return { builtYear, builtMonth, buildingAge: calcBuildingAge(builtYear, builtMonth) }
  }

  // 相対築年数: 築10年 / 築25年
  const relMatch = s.match(/築(\d+)年/)
  if (relMatch) {
    const age = parseInt(relMatch[1])
    const now = new Date()
    const builtYear = now.getFullYear() - age
    return { builtYear, builtMonth: null, buildingAge: age }
  }

  return { builtYear: null, builtMonth: null, buildingAge: null }
}

/** 表示用ラベルを生成 */
export function formatBuiltDateLabel(
  builtYear: number | null,
  builtMonth: number | null,
  buildingAge: number | null
): string {
  if (buildingAge === 0) return '新築'
  if (builtYear && builtMonth && buildingAge !== null) {
    return `${builtYear}年${builtMonth}月（築${buildingAge}年）`
  }
  if (builtYear && buildingAge !== null) {
    return `${builtYear}年（築${buildingAge}年）`
  }
  if (buildingAge !== null) {
    return `築${buildingAge}年`
  }
  return '築年数不明'
}
