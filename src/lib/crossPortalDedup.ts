// ポータル横断の重複判定。
// 完全一致は dedup_key（既存の仕組み）で拾えるため、ここでは
// 「価格やスペースの表記が微妙に違う同一物件」を検出しつつ、
// 同一建物の別部屋を誤統合しないための構造比較を行う。

export interface DedupCandidate {
  id: string
  name: string
  address: string | null
  area_sqm: number | null
  built_year: number | null
  floor_number: number | null
  room_number: string | null
  current_price: number | null
  monthly_rent: number | null
}

export interface DedupInput {
  property_name: string
  address: string | null
  area_sqm: number | null
  built_year: number | null
  floor_number: number | null
  room_number: string | null
  price: number | null
  monthly_rent: number | null
}

export type DedupDecision =
  | { kind: 'same'; existingId: string }              // 同一物件 → 掲載元として統合
  | { kind: 'review'; existingId: string; reason: string; note: Record<string, unknown> }  // 曖昧 → 手動確認
  | { kind: 'new' }                                    // 別物件

function zenToHan(s: string): string {
  return s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

export function normalizeBuildingName(name: string): string {
  return zenToHan(name)
    .replace(/[\s　・･]/g, '')
    // ポータルが付ける枕詞を除去して建物名を比較しやすくする
    .replace(/^(リフォーム済み。?|新築|中古マンション|【[^】]*】)+/g, '')
    .toLowerCase()
}

export function normalizeAddressForDedup(address: string): string {
  return zenToHan(address)
    .replace(/[\s　]/g, '')
    .replace(/丁目|番地?|号/g, '-')
    .replace(/-+$/, '')
    .toLowerCase()
}

function roomsConflict(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return zenToHan(a).replace(/号室?$/, '') !== zenToHan(b).replace(/号室?$/, '')
}

function floorsConflict(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return false
  return a !== b
}

// 1件の取得物件を既存物件群と比較して判定
export function decideCrossPortalDedup(input: DedupInput, existing: DedupCandidate[]): DedupDecision {
  const inName = normalizeBuildingName(input.property_name)
  const inAddr = input.address ? normalizeAddressForDedup(input.address) : null
  if (!inName) return { kind: 'new' }

  for (const ex of existing) {
    const exName = normalizeBuildingName(ex.name)
    const exAddr = ex.address ? normalizeAddressForDedup(ex.address) : null

    // 建物名も住所もどちらも一致しなければ別物件
    const nameMatch = exName.length > 3 && (exName === inName || exName.includes(inName) || inName.includes(exName))
    const addrMatch = !!(inAddr && exAddr && (inAddr === exAddr || inAddr.startsWith(exAddr) || exAddr.startsWith(inAddr)))
    if (!nameMatch && !addrMatch) continue

    // 別部屋・別階が明示されている場合は絶対に統合しない
    if (roomsConflict(input.room_number, ex.room_number)) continue
    if (floorsConflict(input.floor_number, ex.floor_number)) continue

    // 築年が両方あって食い違えば別物件
    if (input.built_year != null && ex.built_year != null && Math.abs(input.built_year - ex.built_year) > 1) continue

    // 面積比較（同一建物の別部屋を面積で見分ける）
    const areaDiff = (input.area_sqm != null && ex.area_sqm != null)
      ? Math.abs(input.area_sqm - ex.area_sqm)
      : null

    if (areaDiff !== null && areaDiff > 2) continue  // 面積が2㎡超違えば別部屋とみなす

    const note: Record<string, unknown> = {
      name_match: nameMatch, addr_match: addrMatch,
      area_diff: areaDiff,
      input: { name: input.property_name, address: input.address, area: input.area_sqm, built: input.built_year },
      existing: { name: ex.name, address: ex.address, area: ex.area_sqm, built: ex.built_year },
    }

    // 確実に同一: 名前・住所とも一致し、面積差0.5㎡以内
    if (nameMatch && addrMatch && areaDiff !== null && areaDiff <= 0.5) {
      return { kind: 'same', existingId: ex.id }
    }

    // 名前一致 + 面積差0.5㎡以内 + 築年一致（住所欠損など）→ 同一とみなす
    if (nameMatch && areaDiff !== null && areaDiff <= 0.5 &&
        input.built_year != null && ex.built_year != null && input.built_year === ex.built_year) {
      return { kind: 'same', existingId: ex.id }
    }

    // それ以外の部分一致は曖昧 → 自動統合せず手動確認へ
    if (nameMatch || addrMatch) {
      const reason = areaDiff === null
        ? '面積が取得できず同一判定できません'
        : `面積差${areaDiff.toFixed(2)}㎡で同一建物の別部屋の可能性があります`
      return { kind: 'review', existingId: ex.id, reason, note }
    }
  }

  return { kind: 'new' }
}
