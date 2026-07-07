export interface PropertyItem {
  name: string
  url: string
  address: string | null
  current_price: number | null
  last_price: number | null
  monthly_rent: number | null
  management_fee: number | null
  floor_plan: string | null
  area_sqm: number | null
  walk_minutes: number | null
  building_age: number | null
  site: string
  transaction_type: 'sale' | 'rent'
  isNew: boolean
  priceChange: { diff: number; diffMan: number; label: string } | null
}

export interface CustomerSection {
  customerName: string
  customerNo: string
  conditionSummary: string
  candidateCount: number
  transaction_type: 'sale' | 'rent'
  properties: PropertyItem[]
}

export interface AdminReportData {
  date: string
  sections: CustomerSection[]
  appUrl: string
}

const SITE_LABELS: Record<string, string> = {
  suumo: 'SUUMO',
  athome: 'アットホーム',
  homes: "HOME'S",
}

function formatSalePrice(price: number | null): string {
  if (!price) return '価格未定'
  return `${(price / 10000).toLocaleString()}万円`
}

function formatRent(rent: number | null, fee: number | null): string {
  if (!rent) return '賃料未定'
  const rentStr = `${Math.round(rent / 10000)}万円/月`
  if (fee) return `${rentStr}（管理費 ${Math.round(fee / 1000) * 1000 === fee ? `${fee / 10000}万` : `${fee.toLocaleString()}円`}）`
  return rentStr
}

function buildPropRows(section: CustomerSection, appUrl: string): string {
  return section.properties.slice(0, 10).map((p, idx) => {
    const isSale = p.transaction_type === 'sale'

    // 価格表示
    let priceHtml: string
    if (p.priceChange) {
      const displayPrice = isSale ? formatSalePrice(p.current_price) : formatRent(p.monthly_rent, p.management_fee)
      const displayLast  = isSale ? formatSalePrice(p.last_price)    : formatRent(p.last_price, null)
      priceHtml = `
        <strong style="color:#1a1a1a;">${displayPrice}</strong>
        <span style="display:inline-block;margin-left:6px;background:${p.priceChange.diff < 0 ? '#FEE2E2' : '#DCFCE7'};color:${p.priceChange.diff < 0 ? '#DC2626' : '#16A34A'};font-size:11px;font-weight:700;padding:1px 7px;border-radius:20px;">
          ${p.priceChange.diff < 0 ? '▼' : '▲'} ${p.priceChange.label}
        </span>
        <span style="font-size:11px;color:#9ca3af;text-decoration:line-through;margin-left:4px;">${displayLast}</span>`
    } else {
      const displayPrice = isSale ? formatSalePrice(p.current_price) : formatRent(p.monthly_rent, p.management_fee)
      priceHtml = `<strong style="color:#1a1a1a;">${displayPrice}</strong>`
    }

    const newBadge = p.isNew
      ? `<span style="background:#3B82F6;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;margin-right:4px;">新着</span>`
      : ''

    const specs = [
      p.floor_plan,
      p.area_sqm ? `${p.area_sqm}㎡` : null,
      p.walk_minutes ? `徒歩${p.walk_minutes}分` : null,
      p.building_age ? `築${p.building_age}年` : null,
    ].filter(Boolean).join('　')

    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 8px;vertical-align:top;color:#6b7280;font-size:12px;white-space:nowrap;">${idx + 1}</td>
        <td style="padding:10px 8px;vertical-align:top;">
          <div style="margin-bottom:3px;">${newBadge}<span style="font-size:10px;color:#94a3b8;">${SITE_LABELS[p.site] ?? p.site}</span></div>
          <a href="${p.url}" style="font-size:13px;font-weight:600;color:#1e40af;text-decoration:none;line-height:1.4;">${p.name}</a>
          ${p.address ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${p.address}</div>` : ''}
        </td>
        <td style="padding:10px 8px;vertical-align:top;white-space:nowrap;">
          ${priceHtml}
          ${specs ? `<div style="font-size:11px;color:#9ca3af;margin-top:3px;">${specs}</div>` : ''}
        </td>
      </tr>
    `
  }).join('')
}

function buildCustomerBlock(section: CustomerSection, appUrl: string): string {
  const propRows = buildPropRows(section, appUrl)
  const typeLabel = section.transaction_type === 'sale' ? '売買' : '賃貸'
  const priceLabel = section.transaction_type === 'sale' ? '価格 / スペック' : '賃料 / スペック'
  const moreNote = section.candidateCount > 10
    ? `<p style="margin:8px 0 0;font-size:12px;color:#9ca3af;text-align:right;">他 ${section.candidateCount - 10} 件</p>`
    : ''

  return `
    <div style="margin-bottom:28px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
        <tr>
          <td>
            <h3 style="margin:0;font-size:15px;font-weight:700;color:#1e293b;border-left:3px solid #1e293b;padding-left:10px;">
              ${section.customerName}
              <span style="font-size:12px;font-weight:400;color:#64748b;margin-left:6px;">${section.customerNo}</span>
              <span style="font-size:11px;font-weight:600;margin-left:8px;background:${section.transaction_type === 'sale' ? '#e0f2fe' : '#fce7f3'};color:${section.transaction_type === 'sale' ? '#0369a1' : '#9d174d'};padding:1px 6px;border-radius:4px;">${typeLabel}</span>
            </h3>
            ${section.conditionSummary ? `<p style="margin:4px 0 0 13px;font-size:12px;color:#64748b;">${section.conditionSummary}</p>` : ''}
          </td>
          <td style="text-align:right;vertical-align:top;">
            <span style="font-size:12px;color:#64748b;">候補 <strong style="color:#1e293b;">${section.candidateCount}</strong> 件</span>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px;font-size:11px;color:#94a3b8;font-weight:500;text-align:left;width:24px;">#</th>
            <th style="padding:8px;font-size:11px;color:#94a3b8;font-weight:500;text-align:left;">物件名 / 所在地</th>
            <th style="padding:8px;font-size:11px;color:#94a3b8;font-weight:500;text-align:left;">${priceLabel}</th>
          </tr>
        </thead>
        <tbody>${propRows}</tbody>
      </table>
      ${moreNote}
    </div>
  `
}

// ────────────────────────────────────────────
// HTML メール（売買/賃貸セクション分割）
// ────────────────────────────────────────────
export function buildAdminReportHtml(data: AdminReportData): string {
  const { date, sections, appUrl } = data

  const saleSections = sections.filter(s => s.transaction_type === 'sale')
  const rentSections = sections.filter(s => s.transaction_type === 'rent')

  const totalProperties = sections.reduce((sum, s) => sum + s.candidateCount, 0)
  const priceChangedTotal = sections.reduce(
    (sum, s) => sum + s.properties.filter(p => p.priceChange !== null).length, 0
  )

  function buildGroup(label: string, color: string, groupSections: CustomerSection[]): string {
    if (groupSections.length === 0) return ''
    const count = groupSections.reduce((s, sec) => s + sec.candidateCount, 0)
    return `
      <div style="margin-bottom:8px;">
        <div style="background:${color};border-radius:6px;padding:10px 16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:14px;font-weight:700;color:#fff;">【${label} 提案候補】</span>
          <span style="font-size:12px;color:rgba(255,255,255,0.85);">${groupSections.length}顧客 / ${count}件</span>
        </div>
        ${groupSections.map(s => buildCustomerBlock(s, appUrl)).join('<div style="border-top:1px solid #f1f5f9;margin:20px 0;"></div>')}
      </div>
    `
  }

  const saleHtml = buildGroup('売買', '#1e40af', saleSections)
  const rentHtml = buildGroup('賃貸', '#7e22ce', rentSections)
  const divider = saleSections.length > 0 && rentSections.length > 0
    ? `<div style="border-top:2px solid #e2e8f0;margin:28px 0;"></div>`
    : ''

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">

          <!-- ヘッダー -->
          <tr>
            <td style="background:#1e293b;border-radius:10px 10px 0 0;padding:20px 28px;">
              <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:0.12em;">DAILY REPORT</p>
              <h1 style="margin:4px 0 0;font-size:18px;font-weight:700;color:#fff;">${date} 提案候補レポート</h1>
            </td>
          </tr>

          <!-- サマリー -->
          <tr>
            <td style="background:#fff;padding:20px 28px;border-bottom:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" align="center" style="padding:12px;background:#f8fafc;border-radius:8px;">
                    <div style="font-size:26px;font-weight:700;color:#1e293b;">${sections.length}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:2px;">対象顧客</div>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" align="center" style="padding:12px;background:#f8fafc;border-radius:8px;">
                    <div style="font-size:26px;font-weight:700;color:#1e293b;">${totalProperties}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:2px;">提案候補合計</div>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" align="center" style="padding:12px;background:#fffbeb;border-radius:8px;">
                    <div style="font-size:26px;font-weight:700;color:#d97706;">${priceChangedTotal}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:2px;">価格変動</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 本文 -->
          <tr>
            <td style="background:#fff;padding:28px;">
              ${saleHtml}
              ${divider}
              ${rentHtml}
              <div style="text-align:center;margin-top:24px;">
                <a href="${appUrl}/customers"
                   style="display:inline-block;background:#1e293b;color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                  管理画面で全件確認 →
                </a>
              </div>
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="background:#f8fafc;border-radius:0 0 10px 10px;padding:16px 28px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                このメールは物件提案システムから毎朝9時（JST）に自動送信されています。
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// ────────────────────────────────────────────
// 件名
// ────────────────────────────────────────────
export function buildAdminReportSubject(date: string, totalProperties: number, priceChangedCount: number): string {
  const priceNote = priceChangedCount > 0 ? `・価格変動${priceChangedCount}件` : ''
  return `【${date} 提案候補】${totalProperties}件${priceNote}`
}
