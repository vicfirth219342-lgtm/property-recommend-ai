import { ScrapedProperty } from '@/types'
import crypto from 'crypto'

// 表記ゆれ正規化: 号室・階などを統一形式に
function normalizeRoomNumber(text: string): string {
  return text
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    )
    .replace(/[\s　]+/g, '')
    .replace(/(\d+)号室?$/i, '$1')
    .replace(/(\d+)階?$/i, '$1F')
    .toLowerCase()
}

// 住所正規化
function normalizeAddress(address: string): string {
  return address
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    )
    .replace(/[\s　丁目番地号]/g, '')
    .replace(/東京都|神奈川県|埼玉県|千葉県/g, '')
    .toLowerCase()
}

// 物件名正規化
function normalizePropertyName(name: string): string {
  return name
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    )
    .replace(/[\s　・･]/g, '')
    .replace(/(マンション|コーポ|ハイツ|レジデンス|ガーデン)/g, (m) => m)
    .toLowerCase()
}

// 重複判定キー生成
export function buildDedupKey(prop: ScrapedProperty): string {
  const namePart = normalizePropertyName(prop.name)
  const addrPart = normalizeAddress(prop.address ?? '')
  const pricePart = prop.price ? Math.round(prop.price / 100000) : 'x' // 100万円単位で丸め
  const areaPart = prop.area_sqm ? Math.round(prop.area_sqm * 10) : 'x'
  const roomPart = prop.room_number ? normalizeRoomNumber(prop.room_number) : 'x'

  const raw = `${namePart}|${addrPart}|${pricePart}|${areaPart}|${roomPart}`
  return crypto.createHash('md5').update(raw).digest('hex')
}

// URLハッシュ（サイト内重複チェック用）
export function buildUrlHash(url: string): string {
  const normalized = url.split('?')[0].replace(/\/$/, '')
  return crypto.createHash('md5').update(normalized).digest('hex')
}
