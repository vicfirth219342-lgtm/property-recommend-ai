import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { matchProperty } from '@/lib/conditionMatch'
import { decideCrossPortalDedup, type DedupCandidate } from '@/lib/crossPortalDedup'

export const maxDuration = 120

function toMan(priceYen: number | null): number | null {
  return priceYen != null ? Math.round(priceYen / 10000) : null
}

// POST /api/portal-search/manual-import/confirm { job_id }
// previewed のみ確定可能。冪等: confirming/completed 中の再呼び出しは新規保存せず現状を返す。
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const jobId = body.job_id as string | undefined
  if (!jobId) return NextResponse.json({ error: 'job_id は必須です' }, { status: 400 })

  const { data: job, error: jobErr } = await supabase.from('manual_import_jobs').select('*').eq('id', jobId).single()
  if (jobErr || !job) return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 })

  // 冪等性: completed/partial_failed は既存結果をそのまま返す（再保存しない）
  if (job.status === 'completed' || job.status === 'partial_failed') {
    return NextResponse.json({ ok: true, already: true, status: job.status, job })
  }
  if (job.status === 'confirming') {
    return NextResponse.json({ ok: true, already: true, status: 'confirming', job, message: '処理中です。しばらく待って再度確認してください' })
  }
  if (job.status !== 'previewed') {
    return NextResponse.json({ error: `previewed状態のジョブのみ確定できます（現在: ${job.status}）` }, { status: 400 })
  }

  // confirming へCAS的に遷移（previewedのときだけ更新される）
  const { data: casRow } = await supabase
    .from('manual_import_jobs').update({ status: 'confirming', updated_at: new Date().toISOString() })
    .eq('id', jobId).eq('status', 'previewed').select('id').maybeSingle()
  if (!casRow) {
    // 別リクエストが先に confirming/completed へ進めていた
    const { data: latest } = await supabase.from('manual_import_jobs').select('*').eq('id', jobId).single()
    return NextResponse.json({ ok: true, already: true, status: latest?.status, job: latest })
  }

  try {
    const { data: candidates } = await supabase
      .from('manual_import_candidates')
      .select('*')
      .eq('job_id', jobId)
      .eq('is_selected', true)
      .in('duplicate_status', ['new'])
      .eq('parse_status', 'ok')

    const { data: cond } = await supabase.from('customer_conditions').select('*').eq('customer_id', job.customer_id).single()

    const { data: existingProps } = await supabase
      .from('properties')
      .select('id, name, address, area_sqm, built_year, floor_number, room_number, current_price, monthly_rent, dedup_key')
      .eq('transaction_type', job.transaction_type).limit(5000)
    const dedupToId = new Map<string, string>()
    for (const p of existingProps ?? []) if (p.dedup_key) dedupToId.set(p.dedup_key, p.id)
    const dedupCandidates: DedupCandidate[] = (existingProps ?? []).map(p => ({
      id: p.id, name: p.name, address: p.address, area_sqm: p.area_sqm,
      built_year: p.built_year, floor_number: p.floor_number, room_number: p.room_number,
      current_price: p.current_price, monthly_rent: p.monthly_rent,
    }))

    let newCount = 0, matched = 0, manualCheck = 0, noMatch = 0, saveErrors = 0

    for (const c of candidates ?? []) {
      try {
        let propertyId = c.dedup_key ? dedupToId.get(c.dedup_key) ?? null : null

        if (!propertyId) {
          const decision = decideCrossPortalDedup({
            property_name: c.property_name, address: null, area_sqm: c.area_sqm,
            built_year: c.built_year, floor_number: null, room_number: null,
            price: c.price, monthly_rent: job.transaction_type === 'rent' ? c.price : null,
          }, dedupCandidates)

          if (decision.kind === 'same') {
            propertyId = decision.existingId
          } else {
            const raw = c.raw_data as Record<string, unknown> | null
            const { data: inserted, error: insErr } = await supabase.from('properties').insert({
              site: c.portal, transaction_type: job.transaction_type, name: c.property_name,
              address: raw?.address ?? null,
              price: job.transaction_type === 'sale' ? toMan(c.price) : null,
              current_price: job.transaction_type === 'sale' ? toMan(c.price) : null,
              monthly_rent: job.transaction_type === 'rent' ? c.price : null,
              area_sqm: c.area_sqm, floor_plan: c.layout, built_year: c.built_year,
              walk_minutes: c.walk_minutes, url: c.detail_url, room_number: raw?.room_number ?? null,
              dedup_key: c.dedup_key, first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
            }).select('id').single()
            if (insErr || !inserted) { saveErrors++; continue }
            const newId: string = inserted.id
            propertyId = newId
            newCount++
            if (c.dedup_key) dedupToId.set(c.dedup_key, newId)
            dedupCandidates.push({ id: newId, name: c.property_name, address: null, area_sqm: c.area_sqm, built_year: c.built_year, floor_number: null, room_number: null, current_price: toMan(c.price), monthly_rent: c.price })

            if (decision.kind === 'review') {
              await supabase.from('duplicate_reviews').upsert({
                property_id_a: decision.existingId, property_id_b: propertyId,
                reason: decision.reason, similarity_note: decision.note, status: 'pending',
              }, { onConflict: 'property_id_a,property_id_b', ignoreDuplicates: true })
            }
          }
        }

        await supabase.from('manual_import_candidates').update({ saved_property_id: propertyId }).eq('id', c.id)

        // property_portal_listings upsert
        const { data: existingListing } = await supabase.from('property_portal_listings')
          .select('id').eq('property_id', propertyId).eq('portal', c.portal).maybeSingle()
        const listedPriceMan = job.transaction_type === 'sale' ? toMan(c.price) : null
        if (existingListing) {
          await supabase.from('property_portal_listings').update({
            source_url: c.detail_url, portal_property_id: c.portal_property_id,
            listed_price: listedPriceMan, listed_rent: job.transaction_type === 'rent' ? c.price : null,
            last_seen_at: new Date().toISOString(), consecutive_miss_count: 0, is_active: true,
            ingestion_method: 'manual_html',
          }).eq('id', existingListing.id)
        } else {
          await supabase.from('property_portal_listings').insert({
            property_id: propertyId, portal: c.portal, portal_property_id: c.portal_property_id,
            source_url: c.detail_url, listed_price: listedPriceMan, listed_rent: job.transaction_type === 'rent' ? c.price : null,
            fetched_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
            ingestion_method: 'manual_html',
          })
        }

        // customer_property_sources upsert（取得経路を記録）
        const { data: fileRow } = await supabase.from('manual_import_candidates')
          .select('file_id, manual_import_files(file_name, page_number)')
          .eq('id', c.id).single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fileInfo = (fileRow as any)?.manual_import_files
        await supabase.from('customer_property_sources').upsert({
          customer_id: job.customer_id, property_id: propertyId, portal: c.portal,
          search_url: c.detail_url, ingestion_method: 'manual_html',
          manual_import_job_id: jobId, manual_import_file_id: c.file_id,
          source_file_name: fileInfo?.file_name ?? null, source_page_number: fileInfo?.page_number ?? null,
        }, { onConflict: 'customer_id,property_id,portal', ignoreDuplicates: true })

        // conditionMatch
        const { data: savedProp } = await supabase.from('properties').select('*').eq('id', propertyId).single()
        if (savedProp) {
          const m = matchProperty(savedProp, cond)
          await supabase.from('manual_import_candidates').update({ condition_status: m.status }).eq('id', c.id)
          if (m.status === 'MATCH') matched++
          else if (m.status === 'NEED_MANUAL_CHECK') manualCheck++
          else noMatch++
        }
      } catch {
        saveErrors++
      }
    }

    const finalStatus = saveErrors > 0 ? 'partial_failed' : 'completed'
    await supabase.from('manual_import_jobs').update({
      status: finalStatus, new_count: newCount, updated_at: new Date().toISOString(),
      error_summary: saveErrors > 0 ? `${saveErrors}件の保存に失敗しました` : null,
    }).eq('id', jobId)

    return NextResponse.json({
      ok: true, status: finalStatus, new_count: newCount, matched, manual_check: manualCheck, no_match: noMatch, save_errors: saveErrors,
    })
  } catch (e) {
    await supabase.from('manual_import_jobs').update({
      status: 'failed', error_summary: e instanceof Error ? e.message : String(e), updated_at: new Date().toISOString(),
    }).eq('id', jobId)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
