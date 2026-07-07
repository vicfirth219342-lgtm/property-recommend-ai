import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { buildAdminReportHtml, buildAdminReportSubject } from '@/lib/emailTemplate'

// NEXT_PUBLIC_APP_URL 優先。未設定時は Vercel が自動設定する VERCEL_URL を使用
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3003')

async function getSender() {
  const { resend, FROM_ADDRESS } = await import('@/lib/resend')
  return { resend, FROM_ADDRESS }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)

  if (adminEmails.length === 0) {
    return NextResponse.json({ error: 'ADMIN_EMAILS が設定されていません' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const startedAt = new Date()

  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, name, customer_no, customer_conditions(*), customer_search_urls(*)')
    .eq('status', 'active')
    .is('deleted_at', null)

  if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 })
  if (!customers || customers.length === 0) {
    return NextResponse.json({ message: '有効な顧客がいません', sent: 0 })
  }

  // 全顧客の候補を収集
  const sections = []
  const results: { customer: string; status: string; count?: number }[] = []

  for (const customer of customers) {
    const candidates = await fetchCandidates(supabase, customer)
    if (candidates.length === 0) {
      results.push({ customer: customer.name, status: 'skipped（候補なし）' })
      continue
    }

    const cond = (customer.customer_conditions as Record<string, unknown>[])?.[0] ?? {}
    const summaryParts = [cond.area, cond.property_type].filter(Boolean) as string[]

    sections.push({
      customerName: customer.name,
      customerNo: customer.customer_no ?? '',
      conditionSummary: summaryParts.join('・'),
      candidateCount: candidates.length,
      properties: candidates,
    })
    results.push({ customer: customer.name, status: 'included', count: candidates.length })
  }

  if (sections.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: customers.length,
      duration_ms: Date.now() - startedAt.getTime(),
      message: '提案候補のある顧客がいません',
      results,
    })
  }

  const date = startedAt.toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tokyo',
  }).replace(/\//g, '/')

  const totalProperties = sections.reduce((s, sec) => s + sec.candidateCount, 0)
  const priceChangedCount = sections.reduce(
    (s, sec) => s + sec.properties.filter((p: { priceChange: unknown }) => p.priceChange !== null).length, 0
  )

  const subject = buildAdminReportSubject(date, totalProperties, priceChangedCount)
  const html = buildAdminReportHtml({ date, sections, appUrl: APP_URL })

  const { resend, FROM_ADDRESS } = await getSender()
  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: adminEmails,
    subject,
    html,
  })

  const duration = Date.now() - startedAt.getTime()

  if (sendError) {
    await supabase.from('email_batches').insert({
      recipient: adminEmails.join(', '),
      subject,
      customers_count: sections.length,
      properties_count: totalProperties,
      status: 'failed',
      error_message: sendError.message,
    })
    return NextResponse.json({ error: sendError.message, results }, { status: 500 })
  }

  await supabase.from('email_batches').insert({
    recipient: adminEmails.join(', '),
    subject,
    customers_count: sections.length,
    properties_count: totalProperties,
    status: 'sent',
    error_message: null,
  })

  return NextResponse.json({
    ok: true,
    sent: 1,
    skipped: customers.length - sections.length,
    duration_ms: duration,
    to: adminEmails,
    subject,
    customers_in_report: sections.length,
    total_properties: totalProperties,
    results,
  })
}

// GET: Vercel Cron は GET で呼び出す
export async function GET(req: NextRequest) {
  return POST(req)
}

// ─────────────────────────────────────────
// 顧客の提案候補を取得（条件照合 + 未提案除外）
// ─────────────────────────────────────────
async function fetchCandidates(
  supabase: ReturnType<typeof createServiceClient>,
  customer: {
    id: string
    customer_conditions: Record<string, unknown>[]
    customer_search_urls: { site: string; is_active: boolean }[]
  }
) {
  const cond = customer.customer_conditions?.[0] ?? null
  const activeSites = customer.customer_search_urls
    .filter(u => u.is_active)
    .map(u => u.site)

  const { data: proposed } = await supabase
    .from('proposals')
    .select('property_id')
    .eq('customer_id', customer.id)
  const proposedSet = new Set(proposed?.map(p => p.property_id) ?? [])

  let query = supabase
    .from('properties')
    .select('*')
    .order('first_seen_at', { ascending: false })
    .limit(200)

  if (activeSites.length > 0) query = query.in('site', activeSites)
  if (cond?.budget_min) query = query.gte('current_price', (cond.budget_min as number) * 10000)
  if (cond?.budget_max) query = query.lte('current_price', (cond.budget_max as number) * 10000)
  if (cond?.area_sqm_min) query = query.gte('area_sqm', cond.area_sqm_min)
  if (cond?.area_sqm_max) query = query.lte('area_sqm', cond.area_sqm_max)
  if (cond?.walk_minutes_max) query = query.lte('walk_minutes', cond.walk_minutes_max)
  if (cond?.building_age_max) query = query.lte('building_age', cond.building_age_max)
  if (cond?.area) query = query.ilike('address', `%${cond.area}%`)

  const { data: properties } = await query

  return (properties ?? [])
    .filter(p => !proposedSet.has(p.id))
    .map(p => {
      let priceChange = null
      if (p.last_price !== null && p.current_price !== null && p.last_price !== p.current_price) {
        const diff = p.current_price - p.last_price
        const diffMan = Math.round(diff / 10000)
        priceChange = {
          diff,
          diffMan,
          label: diffMan < 0 ? `${Math.abs(diffMan)}万円値下げ` : `${diffMan}万円値上げ`,
        }
      }
      const isNew = p.first_seen_at
        ? Date.now() - new Date(p.first_seen_at).getTime() < 7 * 24 * 60 * 60 * 1000
        : false
      return { ...p, priceChange, isNew }
    })
}
