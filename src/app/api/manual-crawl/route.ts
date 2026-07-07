import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { ManualCrawlResult } from '@/types'

const GITHUB_OWNER = 'vicfirth219342-lgtm'
const GITHUB_REPO  = 'property-recommend-ai'

function detectSite(url: string) {
  if (url.includes('suumo.jp'))    return 'suumo'
  if (url.includes('athome.co.jp')) return 'athome'
  if (url.includes('homes.co.jp')) return 'homes'
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { portalName, url, customerId, maxPages = 3 } = body as {
    portalName: string
    url: string
    customerId: string
    maxPages: number
  }

  if (!url || !customerId) {
    return NextResponse.json({ error: 'url と customerId は必須です' }, { status: 400 })
  }

  const site = detectSite(url)
  if (!site) {
    return NextResponse.json({
      error: `このURLのポータルには対応していません。\n対応: SUUMO / アットホーム / LIFULL HOME'S`,
      portalType: 'login',
      portalName,
    } satisfies Partial<ManualCrawlResult>, { status: 422 })
  }

  const supabase = createServiceClient()

  // ジョブレコードを作成
  const { data: job, error: jobErr } = await supabase
    .from('crawl_jobs')
    .insert({
      customer_id: customerId,
      url,
      site,
      portal_name: portalName || site,
      max_pages: maxPages,
      status: 'pending',
    })
    .select()
    .single()

  if (jobErr || !job) {
    return NextResponse.json({ error: 'ジョブ作成失敗: ' + jobErr?.message }, { status: 500 })
  }

  // GitHub Actions workflow_dispatch を呼び出す
  const pat = process.env.GITHUB_PAT
  if (!pat) {
    await supabase.from('crawl_jobs').update({ status: 'failed', error_message: 'GITHUB_PAT 未設定' }).eq('id', job.id)
    return NextResponse.json({ error: 'GITHUB_PAT が Vercel 環境変数に設定されていません' }, { status: 500 })
  }

  const ghRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/manual-crawl.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          job_id:      job.id,
          customer_id: customerId,
          crawl_url:   url,
          site,
          max_pages:   String(maxPages),
          portal_name: portalName || site,
        },
      }),
    }
  )

  if (!ghRes.ok) {
    const ghErr = await ghRes.text()
    await supabase.from('crawl_jobs')
      .update({ status: 'failed', error_message: `GitHub API エラー: ${ghErr}` })
      .eq('id', job.id)
    return NextResponse.json({ error: 'GitHub Actions の起動に失敗しました', detail: ghErr }, { status: 500 })
  }

  return NextResponse.json({ jobId: job.id, status: 'pending' })
}
