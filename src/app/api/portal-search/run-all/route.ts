import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { buildDedupKey, buildUrlHash } from '@/lib/dedup'
import { matchProperty } from '@/lib/conditionMatch'
import { PORTAL_CRAWLERS, ALL_PORTALS, type NormalizedProperty } from '@/lib/portalCrawlers'
import { decideCrossPortalDedup, type DedupCandidate } from '@/lib/crossPortalDedup'
import type { SiteName } from '@/types'

// クローラー実行を含むため長時間許可（ローカル実行前提）
export const maxDuration = 300

// 実行順序: SUUMO → 30秒待機 → HOME'S → 30秒待機 → athome
// （athomeがbot検知されやすいため最後に回し、ポータル間隔を空けてbot対策とする）
const PORTAL_RUN_ORDER: SiteName[] = ['suumo', 'homes', 'athome']
const PORTAL_INTERVAL_MS = 30000

const IS_VERCEL = Boolean(process.env.VERCEL)

// クローラーは価格を円で返すが、properties.price / current_price は
// 条件照合・レインズ照合が前提とする万円単位で保存する
function toMan(priceYen: number | null): number | null {
  return priceYen != null ? Math.round(priceYen / 10000) : null
}

interface RunAllBody {
  customer_id: string
  portals?: SiteName[]
  force_refresh?: boolean       // true: 重複打ち切りせず全ページ確認
  max_pages?: number
  auto_reins_queue?: boolean    // true: MATCH物件をレインズ照合キューへ投入（照合自体は実行しない）
  created_by?: string
}

// POST /api/portal-search/run-all — 全ポータル一括検索
export async function POST(req: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: 'クローラーはローカル環境専用です' }, { status: 503 })
  }

  const supabase = createServiceClient()
  const body = (await req.json().catch(() => ({}))) as RunAllBody
  const {
    customer_id,
    portals = ALL_PORTALS,
    force_refresh = false,
    max_pages,
    auto_reins_queue = false,
    created_by,
  } = body

  if (!customer_id) return NextResponse.json({ error: 'customer_id は必須です' }, { status: 400 })
  const requestedPortals = new Set(portals.filter((p): p is SiteName => ALL_PORTALS.includes(p)))
  // 選択されたポータルのみ、固定順序（SUUMO → HOME'S → athome）で実行する
  const targetPortals = PORTAL_RUN_ORDER.filter(p => requestedPortals.has(p))
  if (targetPortals.length === 0) return NextResponse.json({ error: '対象ポータルがありません' }, { status: 400 })

  // ── 1. 顧客条件取得 ──────────────────────────────
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, name, customer_conditions(*)')
    .eq('id', customer_id)
    .is('deleted_at', null)
    .single()
  if (custErr || !customer) return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 })

  const cond = (customer.customer_conditions as Record<string, unknown>[])?.[0] ?? null
  const txType = (cond?.transaction_type as string) ?? 'sale'

  // ── ジョブ作成 ──────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from('portal_search_jobs')
    .insert({
      customer_id,
      transaction_type: txType,
      status: 'running',
      target_portals: targetPortals,
      started_at: new Date().toISOString(),
      created_by: created_by ?? null,
    })
    .select('id')
    .single()
  if (jobErr) {
    return NextResponse.json(
      { error: `ジョブ作成に失敗しました（migration_portal_search.sql 未適用の可能性）: ${jobErr.message}` },
      { status: 500 },
    )
  }
  const jobId = job.id as string

  // ── 2. 各ポータルの検索URL取得 ────────────────────
  const { data: searchUrls } = await supabase
    .from('customer_search_urls')
    .select('id, site, url, transaction_type, is_active')
    .eq('customer_id', customer_id)
    .eq('is_active', true)
    .eq('transaction_type', txType)

  // ── 既存物件・掲載元を一括ロード ──────────────────
  const { data: existingProps } = await supabase
    .from('properties')
    .select('id, name, address, area_sqm, built_year, floor_number, room_number, current_price, monthly_rent, dedup_key')
    .eq('transaction_type', txType)
    .limit(5000)
  const knownDedupKeys = new Set<string>((existingProps ?? []).map(p => p.dedup_key).filter(Boolean))
  const dedupToId = new Map<string, string>()
  for (const p of existingProps ?? []) if (p.dedup_key) dedupToId.set(p.dedup_key, p.id)
  const dedupCandidates: DedupCandidate[] = (existingProps ?? []).map(p => ({
    id: p.id, name: p.name, address: p.address, area_sqm: p.area_sqm,
    built_year: p.built_year, floor_number: p.floor_number, room_number: p.room_number,
    current_price: p.current_price, monthly_rent: p.monthly_rent,
  }))

  // 集計
  let totalFetched = 0, totalSaved = 0, totalNew = 0, totalDuplicates = 0, crossPortalDups = 0
  const errors: string[] = []
  // このジョブで確認できた property_id（新規+既知）: 照合・紐付け・掲載継続判定に使う
  const touchedPropertyIds = new Set<string>()
  const seenListingKeys = new Set<string>()  // `${property_id}|${portal}`

  // ── 3〜7. ポータル×検索URLごとにクロール → 保存 → 紐付け → 重複排除 ──
  // 1つのポータルに複数の検索URLがある場合はすべて処理する（1URL = 1結果行）
  for (let portalIdx = 0; portalIdx < targetPortals.length; portalIdx++) {
    const portal = targetPortals[portalIdx]
    // ポータルが切り替わるタイミングで30秒待機（bot対策）。最初のポータルは待機しない
    if (portalIdx > 0) {
      await new Promise(r => setTimeout(r, PORTAL_INTERVAL_MS))
    }
    const portalUrls = (searchUrls ?? []).filter(s => s.site === portal)

    // URL未生成のポータルはエラーとして記録し継続
    if (portalUrls.length === 0) {
      await supabase.from('portal_search_job_results').insert({
        job_id: jobId, portal, status: 'url_missing',
        error_message: `${portal} の有効な検索URLがありません。顧客編集画面でURLを生成してください。`,
        started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
      })
      errors.push(`${portal}: 検索URLなし`)
      continue
    }

    for (const su of portalUrls) {
    const startedAt = new Date().toISOString()
    const { data: resultRow } = await supabase.from('portal_search_job_results').insert({
      job_id: jobId, portal, search_url_id: su.id, search_url: su.url,
      status: 'running', started_at: startedAt,
    }).select('id').single()
    const resultId = resultRow?.id

    try {
      const crawler = PORTAL_CRAWLERS[portal]
      // force_refresh 時は重複でも打ち切らない（既存クローラーは stopOnDuplicateCount=999 のため同じ）
      const crawlKeys = force_refresh ? new Set<string>() : new Set(knownDedupKeys)
      const result = await crawler.crawl({
        searchUrl: su.url,
        customerId: customer_id,
        transactionType: txType as 'sale' | 'rent',
        maxPages: max_pages ?? 5,
        knownDedupKeys: crawlKeys,
      })

      // クローラーエラー（0件取得とは区別する）
      if (result.status === 'fetch_error') {
        await supabase.from('portal_search_job_results').update({
          status: 'fetch_error',
          fetched_count: result.fetchedCount,
          duplicate_count: result.duplicateCount,
          error_message: result.error ?? 'クロール中にエラーが発生しました',
          completed_at: new Date().toISOString(),
        }).eq('id', resultId)
        errors.push(`${portal}: ${result.error ?? 'fetch_error'}`)
        continue
      }

      const fetched = result.fetchedCount + result.duplicateCount
      totalFetched += fetched
      totalDuplicates += result.duplicateCount

      // 0件取得は no_results として正常記録（エラー扱いにしない）
      if (fetched === 0 && result.properties.length === 0 && result.seenProperties.length === 0) {
        await supabase.from('portal_search_job_results').update({
          status: 'no_results', fetched_count: 0,
          completed_at: new Date().toISOString(),
        }).eq('id', resultId)
        continue
      }

      let savedCount = 0, newCount = 0, dupCount = result.duplicateCount

      // ── 新規候補の保存（ポータル横断重複排除を挟む） ──
      for (const np of result.properties) {
        const dedupKey = buildDedupKey(np.raw)

        // 完全一致（dedup_key）→ 既存物件に掲載元を追加
        let propertyId = dedupToId.get(dedupKey) ?? null
        let isNewProperty = false

        if (!propertyId) {
          // 構造比較によるポータル横断重複判定
          const decision = decideCrossPortalDedup({
            property_name: np.property_name, address: np.address,
            area_sqm: np.area_sqm, built_year: np.built_year,
            floor_number: np.floor_number, room_number: np.room_number,
            price: np.price, monthly_rent: np.monthly_rent,
          }, dedupCandidates)

          if (decision.kind === 'same') {
            propertyId = decision.existingId
            crossPortalDups++
          } else {
            // 'new' と 'review' はどちらも新規保存（review は統合せず確認キューへ）
            const now = np.fetched_at
            const { data: inserted, error: insErr } = await supabase.from('properties').insert({
              site: portal,
              transaction_type: txType,
              name: np.property_name,
              address: np.address,
              price: toMan(np.price),
              current_price: toMan(np.price),
              monthly_rent: np.monthly_rent,
              management_fee: np.management_fee,
              area_sqm: np.area_sqm,
              floor_plan: np.raw.floor_plan,
              building_age: np.raw.building_age,
              built_year: np.built_year,
              built_month: np.built_month,
              walk_minutes: np.walk_minutes,
              url: np.source_url,
              thumbnail_url: np.image_urls[0] ?? null,
              room_number: np.room_number,
              dedup_key: dedupKey,
              raw_hash: buildUrlHash(np.source_url),
              first_seen_at: now,
              last_seen_at: now,
            }).select('id').single()

            if (insErr || !inserted) {
              errors.push(`${portal} 保存失敗: ${insErr?.message}`)
              continue
            }
            propertyId = inserted.id
            isNewProperty = true
            newCount++
            knownDedupKeys.add(dedupKey)
            dedupToId.set(dedupKey, propertyId!)
            dedupCandidates.push({
              id: propertyId!, name: np.property_name, address: np.address,
              area_sqm: np.area_sqm, built_year: np.built_year,
              floor_number: np.floor_number, room_number: np.room_number,
              current_price: np.price, monthly_rent: np.monthly_rent,
            })

            // 曖昧な重複 → duplicate_review へ（自動統合しない）
            if (decision.kind === 'review') {
              await supabase.from('duplicate_reviews').upsert({
                property_id_a: decision.existingId,
                property_id_b: propertyId,
                reason: decision.reason,
                similarity_note: decision.note,
                status: 'pending',
              }, { onConflict: 'property_id_a,property_id_b', ignoreDuplicates: true })
            }
          }
        } else {
          crossPortalDups += 0  // dedup_key 一致は通常の重複としてカウント済み
        }

        savedCount++
        touchedPropertyIds.add(propertyId!)

        // 掲載元を upsert
        await upsertListing(supabase, propertyId!, portal, np)
        seenListingKeys.add(`${propertyId}|${portal}`)

        // customer_property_sources へ紐付け（初回紐付け日時 = crawled_at は insert 時のみ）
        await supabase.from('customer_property_sources').upsert({
          customer_id, property_id: propertyId, portal, search_url: su.url,
        }, { onConflict: 'customer_id,property_id,portal', ignoreDuplicates: true })

        if (isNewProperty) totalNew++
      }

      // ── 既知物件（掲載継続）: last_seen・価格変動・紐付け ──
      for (const np of result.seenProperties) {
        const dedupKey = buildDedupKey(np.raw)
        const propertyId = dedupToId.get(dedupKey)
        if (!propertyId) continue
        touchedPropertyIds.add(propertyId)
        seenListingKeys.add(`${propertyId}|${portal}`)

        // 価格変動チェック（current_price は万円、monthly_rent は円）
        const ex = (existingProps ?? []).find(p => p.id === propertyId)
        const newPrice = txType === 'sale' ? toMan(np.price) : np.monthly_rent
        const oldPrice = txType === 'sale' ? ex?.current_price : ex?.monthly_rent
        const now = new Date().toISOString()
        if (txType === 'sale' && newPrice != null && oldPrice != null && newPrice !== oldPrice) {
          await supabase.from('properties').update({
            last_price: oldPrice, current_price: newPrice, last_seen_at: now,
          }).eq('id', propertyId)
        } else {
          await supabase.from('properties').update({ last_seen_at: now }).eq('id', propertyId)
        }

        await upsertListing(supabase, propertyId, portal, np)
        await supabase.from('customer_property_sources').upsert({
          customer_id, property_id: propertyId, portal, search_url: su.url,
        }, { onConflict: 'customer_id,property_id,portal', ignoreDuplicates: true })
      }

      totalSaved += savedCount

      await supabase.from('portal_search_job_results').update({
        status: 'completed',
        fetched_count: fetched,
        saved_count: savedCount,
        new_count: newCount,
        duplicate_count: dupCount,
        completed_at: new Date().toISOString(),
      }).eq('id', resultId)

      // last_crawled_at 更新
      await supabase.from('customer_search_urls')
        .update({ last_crawled_at: new Date().toISOString() })
        .eq('id', su.id)

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await supabase.from('portal_search_job_results').update({
        status: msg.toLowerCase().includes('timeout') ? 'timeout' : 'save_error',
        error_message: msg,
        completed_at: new Date().toISOString(),
      }).eq('id', resultId)
      errors.push(`${portal}: ${msg}`)
    }

    // URL間・ポータル間の待機（bot対策）
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000))
    }
  }

  // ── 掲載終了の可能性: 今回確認できなかった掲載元の連続未取得回数を加算 ──
  // 対象: この顧客に紐付く物件 × 今回クロールしたポータル
  const crawledPortals = targetPortals.filter(p => (searchUrls ?? []).some(s => s.site === p))
  if (crawledPortals.length > 0) {
    const { data: custSources } = await supabase
      .from('customer_property_sources')
      .select('property_id')
      .eq('customer_id', customer_id)
    const custPropIds = [...new Set((custSources ?? []).map(s => s.property_id))]
    if (custPropIds.length > 0) {
      const { data: listings } = await supabase
        .from('property_portal_listings')
        .select('id, property_id, portal, consecutive_miss_count')
        .in('property_id', custPropIds)
        .in('portal', crawledPortals)
        .eq('is_active', true)
      for (const li of listings ?? []) {
        if (seenListingKeys.has(`${li.property_id}|${li.portal}`)) continue
        const missCount = (li.consecutive_miss_count ?? 0) + 1
        // 1回の未取得では即断せず、3回連続で未取得なら掲載終了とみなす
        await supabase.from('property_portal_listings').update({
          consecutive_miss_count: missCount,
          is_active: missCount < 3,
        }).eq('id', li.id)
      }
    }
  }

  // ── 8. 顧客条件照合 ──────────────────────────────
  let matched = 0, manualCheck = 0, noMatch = 0
  const matchedPropertyIds: string[] = []
  if (touchedPropertyIds.size > 0) {
    const { data: touchedProps } = await supabase
      .from('properties')
      .select('*')
      .in('id', [...touchedPropertyIds])
    for (const p of touchedProps ?? []) {
      const m = matchProperty(p, cond)
      if (m.status === 'MATCH') { matched++; matchedPropertyIds.push(p.id) }
      else if (m.status === 'NEED_MANUAL_CHECK') manualCheck++
      else noMatch++
    }
  }

  // ── 10. MATCH物件をレインズ照合キューへ（設定ONの場合のみ。照合自体は実行しない） ──
  let reinsQueued = 0
  if (auto_reins_queue && matchedPropertyIds.length > 0) {
    const { data: existingQueue } = await supabase
      .from('reins_check_queue')
      .select('property_id')
      .eq('customer_id', customer_id)
      .in('property_id', matchedPropertyIds)
    const queuedSet = new Set((existingQueue ?? []).map(q => q.property_id))
    for (const pid of matchedPropertyIds) {
      if (queuedSet.has(pid)) continue
      const { error: qErr } = await supabase.from('reins_check_queue').insert({
        customer_id, property_id: pid, status: 'queued', requested_by: created_by ?? 'portal_search',
      })
      if (!qErr) reinsQueued++
    }
  }

  // ── 9. 集計保存 ──────────────────────────────────
  const { data: jobResults } = await supabase
    .from('portal_search_job_results')
    .select('status')
    .eq('job_id', jobId)
  const resultStatuses = (jobResults ?? []).map(r => r.status)
  const failCount = resultStatuses.filter(s => ['fetch_error', 'save_error', 'timeout', 'url_missing'].includes(s)).length
  const jobStatus =
    failCount === 0 ? 'completed'
    : failCount >= resultStatuses.length ? 'failed'
    : 'partial_failed'

  await supabase.from('portal_search_jobs').update({
    status: jobStatus,
    completed_at: new Date().toISOString(),
    total_fetched: totalFetched,
    total_saved: totalSaved,
    total_new: totalNew,
    total_duplicates: totalDuplicates,
    total_matched: matched,
    total_manual_check: manualCheck,
    total_no_match: noMatch,
    cross_portal_dups: crossPortalDups,
    error_summary: errors.length ? errors.join(' / ') : null,
  }).eq('id', jobId)

  return NextResponse.json({
    ok: true,
    job_id: jobId,
    status: jobStatus,
    total_fetched: totalFetched,
    total_saved: totalSaved,
    total_new: totalNew,
    total_duplicates: totalDuplicates,
    cross_portal_dups: crossPortalDups,
    total_matched: matched,
    total_manual_check: manualCheck,
    total_no_match: noMatch,
    reins_queued: reinsQueued,
    errors,
  })
}

// 掲載元 upsert（既存行は価格・last_seen を更新し miss カウントをリセット）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertListing(supabase: any, propertyId: string, portal: string, np: NormalizedProperty) {
  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from('property_portal_listings')
    .select('id')
    .eq('property_id', propertyId)
    .eq('portal', portal)
    .maybeSingle()

  const listedPriceMan = np.price != null ? Math.round(np.price / 10000) : null
  if (existing) {
    await supabase.from('property_portal_listings').update({
      source_url: np.source_url,
      portal_property_id: np.portal_property_id,
      listed_price: listedPriceMan,
      listed_rent: np.monthly_rent,
      last_seen_at: now,
      consecutive_miss_count: 0,
      is_active: true,
    }).eq('id', existing.id)
  } else {
    await supabase.from('property_portal_listings').insert({
      property_id: propertyId,
      portal,
      portal_property_id: np.portal_property_id,
      source_url: np.source_url,
      listed_price: listedPriceMan,
      listed_rent: np.monthly_rent,
      fetched_at: np.fetched_at,
      last_seen_at: now,
    })
  }
}
