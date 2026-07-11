#!/usr/bin/env node
// scripts/audit_area_masters.mjs
// エリアマスター登録状況 監査レポート
// 使い方: node scripts/audit_area_masters.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください');
  process.exit(1);
}

const BASE = SUPABASE_URL.replace(/\/$/, '');
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function query(path, params = '') {
  const url = `${BASE}/rest/v1/${path}${params ? '?' + params : ''}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${url} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function count(path, params = '') {
  const url = `${BASE}/rest/v1/${path}?${params ? params + '&' : ''}select=id`;
  const res = await fetch(url, {
    headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' },
  });
  const raw = res.headers.get('content-range') ?? '0/0';
  const total = parseInt(raw.split('/')[1] ?? '0', 10);
  return total;
}

async function main() {
  console.log('========================================');
  console.log('  エリアマスター 監査レポート');
  console.log(`  実行日時: ${new Date().toLocaleString('ja-JP')}`);
  console.log('========================================\n');

  // ── 1. area_masters ──────────────────────────────────────
  console.log('【1】area_masters 登録数');
  console.log('─'.repeat(44));

  const tokyoCity  = await count('area_masters', "area_type=eq.city&prefecture=eq.東京都");
  const tokyoWard  = await count('area_masters', "area_type=eq.ward&prefecture=eq.東京都");
  const tokyoSt    = await count('area_masters', "area_type=eq.station&prefecture=eq.東京都");
  const kanagawaCity = await count('area_masters', "area_type=eq.city&prefecture=eq.神奈川県");
  const kanagawaWard = await count('area_masters', "area_type=eq.ward&prefecture=eq.神奈川県");
  const kanagawaSt   = await count('area_masters', "area_type=eq.station&prefecture=eq.神奈川県");

  console.log(`東京都 市区町村（ward）    : ${tokyoWard} 件`);
  console.log(`東京都 市（city）           : ${tokyoCity} 件`);
  console.log(`東京都 市区町村 合計        : ${tokyoWard + tokyoCity} 件`);
  console.log(`東京都 駅                   : ${tokyoSt} 件`);
  console.log('');
  console.log(`神奈川県 市区（ward/city）  : ${kanagawaWard + kanagawaCity} 件`);
  console.log(`神奈川県 駅                 : ${kanagawaSt} 件`);
  console.log('');

  // ── 2. area_aliases ──────────────────────────────────────
  console.log('【2】area_aliases 登録数');
  console.log('─'.repeat(44));
  const totalAliases = await count('area_aliases');
  console.log(`エイリアス総件数           : ${totalAliases} 件\n`);

  // ── 3. portal_area_params ─────────────────────────────────
  console.log('【3】portal_area_params 登録数（ポータル別）');
  console.log('─'.repeat(44));

  for (const portal of ['suumo', 'athome', 'homes']) {
    const total     = await count('portal_area_params', `portal=eq.${portal}`);
    const verified  = await count('portal_area_params', `portal=eq.${portal}&verified=eq.true`);
    const unverified = total - verified;
    console.log(`${portal.padEnd(8)} : 合計 ${String(total).padStart(4)} 件  確認済 ${String(verified).padStart(4)} 件  未確認 ${String(unverified).padStart(4)} 件`);
  }

  const totalUnverified = await count('portal_area_params', 'verified=eq.false');
  console.log('');
  console.log(`未確認URL件数（全体）       : ${totalUnverified} 件`);
  console.log('');

  // ── 4. 旧マスター残存確認 ──────────────────────────────
  console.log('【4】旧 portal_area_mappings 残存確認');
  console.log('─'.repeat(44));
  try {
    const oldTotal = await count('portal_area_mappings');
    console.log(`portal_area_mappings 総件数 : ${oldTotal} 件`);
  } catch {
    console.log('portal_area_mappings : テーブルにアクセスできません');
  }
  console.log('');

  // ── 5. 未解決エリア ───────────────────────────────────
  console.log('【5】未解決エリア（area_masters に存在するが portal_area_params が0件）');
  console.log('─'.repeat(44));

  // 駅でportal_area_paramsが未登録のエリアを件数で確認
  const allStations = await count('area_masters', 'area_type=eq.station&prefecture=in.(東京都,神奈川県)');
  const stationsWithParams = await count('portal_area_params',
    'portal=in.(suumo,athome,homes)&select=area_id');

  console.log(`東京都・神奈川県 駅 総数    : ${allStations} 件`);
  console.log(`（portal_area_params個別確認はダッシュボードSQLで）`);
  console.log('');

  // ── 6. サマリー ──────────────────────────────────────
  console.log('========================================');
  console.log('  監査サマリー');
  console.log('========================================');
  console.log(`東京都 市区町村登録数       : ${tokyoWard + tokyoCity} 件`);
  console.log(`神奈川県 市区町村登録数     : ${kanagawaWard + kanagawaCity} 件`);
  console.log(`東京都 駅登録数             : ${tokyoSt} 件`);
  console.log(`神奈川県 駅登録数           : ${kanagawaSt} 件`);
  console.log(`SUUMOパラメータ登録数       : （上記【3】参照）`);
  console.log(`athomeパラメータ登録数      : （上記【3】参照）`);
  console.log(`HOME'Sパラメータ登録数      : （上記【3】参照）`);
  console.log(`未確認URL件数               : ${totalUnverified} 件 ← 要確認`);
  console.log('');
  console.log('未確認URLの確認・修正方法:');
  console.log('  UPDATE portal_area_params SET verified=true WHERE id=XXX;');
  console.log('  （Supabase Dashboard SQL Editor で実行）');
}

main().catch((err) => {
  console.error('監査スクリプトエラー:', err.message);
  process.exit(1);
});
