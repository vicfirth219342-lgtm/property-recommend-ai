import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { parseUploadedHtml } from '@/lib/manualImport/parseHtml'
import type { SiteName, TransactionType } from '@/types'

export const maxDuration = 120
const BATCH_SIZE = 5

// POST /api/portal-search/manual-import/batch { job_id }
// 未処理ファイルを最大5件解析し、manual_import_candidates に保存する。
// フロントは detected_count === 0 を確認しつつ files_parsed === file_count になるまで繰り返し呼ぶ。
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const jobId = body.job_id as string | undefined
  if (!jobId) return NextResponse.json({ error: 'job_id は必須です' }, { status: 400 })

  const { data: job, error: jobErr } = await supabase.from('manual_import_jobs').select('*').eq('id', jobId).single()
  if (jobErr || !job) return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 })

  const { data: pendingFiles } = await supabase
    .from('manual_import_files')
    .select('id, file_name, portal, page_number, raw_html, reused_from_file_id')
    .eq('job_id', jobId).eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (!pendingFiles || pendingFiles.length === 0) {
    // 全ファイル処理済み → previewed へ
    const { data: candStats } = await supabase
      .from('manual_import_candidates')
      .select('duplicate_status, parse_status')
      .eq('job_id', jobId)
    const detected = candStats?.length ?? 0
    const dup = candStats?.filter(c => c.duplicate_status !== 'new').length ?? 0
    const needsCheck = candStats?.filter(c => c.parse_status === 'needs_manual_check').length ?? 0

    // ページ欠落検出（page_numberが取れているファイルのみ対象）
    const { data: pageFiles } = await supabase
      .from('manual_import_files').select('page_number').eq('job_id', jobId).not('page_number', 'is', null)
    const pageNumbers = (pageFiles ?? []).map(f => f.page_number as number).sort((a, b) => a - b)
    const missingPages: number[] = []
    if (pageNumbers.length > 1) {
      for (let n = pageNumbers[0]; n <= pageNumbers[pageNumbers.length - 1]; n++) {
        if (!pageNumbers.includes(n)) missingPages.push(n)
      }
    }

    if (job.status !== 'previewed') {
      await supabase.from('manual_import_jobs').update({
        status: 'previewed', detected_count: detected, duplicate_count: dup,
        needs_manual_check_count: needsCheck, missing_pages: missingPages,
        updated_at: new Date().toISOString(),
      }).eq('id', jobId)
    }
    return NextResponse.json({ ok: true, done: true, files_parsed: job.files_parsed, file_count: job.file_count })
  }

  // ── 既存重複判定用: このジョブ・この顧客に紐づく properties の dedup_key を先読み ──
  const { data: existingProps } = await supabase
    .from('properties').select('dedup_key').eq('transaction_type', job.transaction_type).limit(5000)
  const existingKeys = new Set((existingProps ?? []).map(p => p.dedup_key).filter(Boolean))

  // このバッチ内・このジョブ内で既に登場した dedup_key（同一ファイル内／ページ間重複判定）
  const { data: alreadyInJob } = await supabase
    .from('manual_import_candidates').select('dedup_key').eq('job_id', jobId)
  const seenInJob = new Set((alreadyInJob ?? []).map(c => c.dedup_key).filter(Boolean))

  let parsedThisBatch = 0

  for (const file of pendingFiles) {
    // 別顧客の既存解析結果を再利用（再解析しない）
    if (file.reused_from_file_id) {
      const { data: sourceCandidates } = await supabase
        .from('manual_import_candidates').select('*').eq('file_id', file.reused_from_file_id)
      const rows = (sourceCandidates ?? []).map(c => ({
        job_id: jobId, file_id: file.id, portal: c.portal, property_name: c.property_name,
        price: c.price, area_sqm: c.area_sqm, layout: c.layout, built_year: c.built_year,
        walk_minutes: c.walk_minutes, detail_url: c.detail_url, portal_property_id: c.portal_property_id,
        dedup_key: c.dedup_key, parse_status: c.parse_status,
        duplicate_status: c.dedup_key && (existingKeys.has(c.dedup_key) || seenInJob.has(c.dedup_key)) ? 'duplicate_existing_db' : 'new',
        missing_fields: c.missing_fields, raw_data: c.raw_data,
      }))
      if (rows.length > 0) {
        await supabase.from('manual_import_candidates').insert(rows)
        rows.forEach(r => r.dedup_key && seenInJob.add(r.dedup_key))
      }
      await supabase.from('manual_import_files').update({ status: 'parsed', detected_count: rows.length }).eq('id', file.id)
      parsedThisBatch++
      continue
    }

    if (!file.raw_html) {
      await supabase.from('manual_import_files').update({ status: 'parse_error', error_message: 'HTML本文が見つかりません' }).eq('id', file.id)
      parsedThisBatch++
      continue
    }

    const result = await parseUploadedHtml(file.raw_html, file.portal as SiteName, job.transaction_type as TransactionType)

    if (result.portalMismatch) {
      await supabase.from('manual_import_files').update({
        status: 'invalid_portal', raw_html: null,
        error_message: `選択ポータルと不一致（検出: ${result.detectedPortal}）`,
      }).eq('id', file.id)
      parsedThisBatch++
      continue
    }
    if (result.isEmpty) {
      await supabase.from('manual_import_files').update({ status: 'empty_html', raw_html: null }).eq('id', file.id)
      parsedThisBatch++
      continue
    }
    if (!result.ok) {
      await supabase.from('manual_import_files').update({ status: 'parse_error', raw_html: null, error_message: result.error ?? 'parse_error' }).eq('id', file.id)
      parsedThisBatch++
      continue
    }
    if (result.error === 'no_results') {
      await supabase.from('manual_import_files').update({ status: 'no_results', raw_html: null, detected_count: 0 }).eq('id', file.id)
      parsedThisBatch++
      continue
    }

    // 同一ファイル内重複を除去しつつ candidates を作る
    const fileLocalKeys = new Set<string>()
    const rows = result.candidates.map(c => {
      let dupStatus = 'new'
      if (fileLocalKeys.has(c.dedup_key)) dupStatus = 'duplicate_in_file'
      else if (seenInJob.has(c.dedup_key)) dupStatus = 'duplicate_in_batch'
      else if (existingKeys.has(c.dedup_key)) dupStatus = 'duplicate_existing_db'
      fileLocalKeys.add(c.dedup_key)
      seenInJob.add(c.dedup_key)
      return {
        job_id: jobId, file_id: file.id, portal: c.portal, property_name: c.property_name,
        price: c.price ?? c.monthly_rent, area_sqm: c.area_sqm, layout: c.layout,
        built_year: c.built_year, walk_minutes: c.walk_minutes, detail_url: c.detail_url,
        portal_property_id: c.portal_property_id, dedup_key: c.dedup_key,
        parse_status: c.needs_manual_check ? 'needs_manual_check' : 'ok',
        duplicate_status: dupStatus,
        is_selected: !c.needs_manual_check,
        missing_fields: c.missing_fields, raw_data: c.raw,
      }
    })

    if (rows.length > 0) await supabase.from('manual_import_candidates').insert(rows)

    await supabase.from('manual_import_files').update({
      status: 'parsed', raw_html: null, detected_count: rows.length,
    }).eq('id', file.id)
    parsedThisBatch++
  }

  const newFilesParsed = (job.files_parsed ?? 0) + parsedThisBatch
  await supabase.from('manual_import_jobs').update({
    files_parsed: newFilesParsed, updated_at: new Date().toISOString(),
  }).eq('id', jobId)

  return NextResponse.json({
    ok: true, done: false, files_parsed: newFilesParsed, file_count: job.file_count,
  })
}
