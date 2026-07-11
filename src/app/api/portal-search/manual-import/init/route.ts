import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'
import { extractHtmlFromZip, ZIP_LIMITS } from '@/lib/manualImport/zipExtract'
import { extractPageNumber } from '@/lib/manualImport/parseHtml'
import type { SiteName } from '@/types'

const ALLOWED_PORTALS: SiteName[] = ['suumo', 'homes', 'athome']

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex')
}

// POST /api/portal-search/manual-import/init
// FormData: customer_id, portal, transaction_type?, html_files[]?, zip_file?, html_text?, source_url?
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'multipart/form-data で送信してください' }, { status: 400 })

  const customerId = form.get('customer_id') as string | null
  const portal = form.get('portal') as string | null
  const transactionType = (form.get('transaction_type') as string | null) ?? 'sale'
  const sourceUrl = (form.get('source_url') as string | null) ?? null
  const htmlText = form.get('html_text') as string | null
  const htmlFiles = form.getAll('html_files') as File[]
  const zipFile = form.get('zip_file') as File | null

  if (!customerId) return NextResponse.json({ error: 'customer_id は必須です' }, { status: 400 })
  if (!portal || !ALLOWED_PORTALS.includes(portal as SiteName)) {
    return NextResponse.json({ error: 'portal は suumo/homes/athome のいずれかを指定してください' }, { status: 400 })
  }
  if (htmlFiles.length === 0 && !zipFile && !htmlText?.trim()) {
    return NextResponse.json({ error: 'HTMLファイル・ZIP・HTML貼り付けのいずれかが必要です' }, { status: 400 })
  }

  // ── 入力を { fileName, html }[] に統一 ──
  const inputs: { fileName: string; html: string }[] = []

  for (const f of htmlFiles) {
    const buf = Buffer.from(await f.arrayBuffer())
    inputs.push({ fileName: f.name, html: buf.toString('utf-8') })
  }

  if (zipFile) {
    const zipBuf = Buffer.from(await zipFile.arrayBuffer())
    const result = await extractHtmlFromZip(zipBuf)
    if (!result.ok) {
      return NextResponse.json({ error: result.error.message, code: result.error.code, zip_limits: ZIP_LIMITS }, { status: 400 })
    }
    for (const f of result.files) inputs.push({ fileName: f.fileName, html: f.html })
  }

  if (htmlText?.trim()) {
    inputs.push({ fileName: 'pasted.html', html: htmlText })
  }

  if (inputs.length === 0) {
    return NextResponse.json({ error: '解析対象のHTMLがありません' }, { status: 400 })
  }

  // ── ジョブ作成 ──
  const { data: job, error: jobErr } = await supabase
    .from('manual_import_jobs')
    .insert({
      customer_id: customerId, portal, transaction_type: transactionType,
      status: 'pending', file_count: inputs.length, zip_limits: ZIP_LIMITS,
    })
    .select('id').single()
  if (jobErr || !job) {
    return NextResponse.json({ error: `ジョブ作成に失敗しました（migration_manual_import.sql 未適用の可能性）: ${jobErr?.message}` }, { status: 500 })
  }
  const jobId = job.id as string

  // ── ファイルごとに hash 計算・重複判定・行作成（解析(batch)は別ステップ） ──
  const fileRows: { id: string; fileName: string; status: string }[] = []

  for (const input of inputs) {
    const hash = sha256(input.html)
    const pageNumber = extractPageNumber(input.fileName, sourceUrl)

    // 同一顧客・同一ポータルへの再取込チェック
    const { data: dup } = await supabase
      .from('manual_import_files')
      .select('id')
      .eq('customer_id', customerId).eq('portal', portal).eq('html_hash', hash)
      .maybeSingle()

    if (dup) {
      const { data: row } = await supabase.from('manual_import_files').insert({
        job_id: jobId, customer_id: customerId, portal, file_name: input.fileName,
        page_number: pageNumber, html_hash: hash, status: 'duplicate_import',
      }).select('id').single()
      if (row) fileRows.push({ id: row.id, fileName: input.fileName, status: 'duplicate_import' })
      continue
    }

    // 別顧客での既存解析結果があれば再利用フラグを立てる（batch側で再解析せずコピーする）
    const { data: reusable } = await supabase
      .from('manual_import_files')
      .select('id')
      .eq('portal', portal).eq('html_hash', hash).eq('status', 'parsed')
      .limit(1).maybeSingle()

    // raw_html は解析完了までの一時保持。解析済み(parsed)になったらbatch側でNULLへクリアする
    const { data: row, error: rowErr } = await supabase.from('manual_import_files').insert({
      job_id: jobId, customer_id: customerId, portal, file_name: input.fileName,
      page_number: pageNumber, html_hash: hash, status: 'queued',
      reused_from_file_id: reusable?.id ?? null,
      raw_html: reusable ? null : input.html,
    }).select('id').single()

    if (rowErr || !row) continue
    fileRows.push({ id: row.id, fileName: input.fileName, status: 'queued' })
  }

  await supabase.from('manual_import_jobs').update({ status: 'parsing' }).eq('id', jobId)

  return NextResponse.json({ ok: true, job_id: jobId, files: fileRows })
}
