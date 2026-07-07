import { createClient } from '@supabase/supabase-js'

// ビルド時は環境変数が未設定でもクラッシュしないようフォールバック
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY  ?? ''

// クライアントサイド用（読み取り専用操作）
// ビルド時は空文字で初期化され、ランタイムで実際の値が使われる
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as never

// サーバーサイド用（RLSをバイパス）
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY    ?? ''
  if (!url || !key) throw new Error('Supabase env vars are not configured')
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
