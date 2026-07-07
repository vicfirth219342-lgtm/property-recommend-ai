import { NextRequest, NextResponse } from 'next/server'
import { regenerateUrlsForCustomer } from '@/lib/urlGenerationService'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const summaries = await regenerateUrlsForCustomer(id)
    return NextResponse.json({ summaries })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
