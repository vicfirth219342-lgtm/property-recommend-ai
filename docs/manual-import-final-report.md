# 手動取込モード 最終報告

開発完了日: 2026-07-11

## 1. 最終アーキテクチャ

自動クロール（SUUMO/HOME'S/athome）が bot 認証・アクセス制限で失敗した場合に、
人がブラウザで保存した検索結果 HTML を取り込み、自動クロールと同じ物件データフローへ
合流させる機能。

```
[アップロード]
  HTMLファイル(複数) / ZIP / HTML貼り付け
        │
        ▼
POST /api/portal-search/manual-import/init
  - customer_id / portal ごとに manual_import_jobs 作成
  - ZIP展開（安全制限チェック）
  - ファイルごとに SHA-256 hash 計算
  - (customer_id, portal, html_hash) で重複判定 → duplicate_import
  - 別顧客の同一 (portal, html_hash) があれば reused_from_file_id を設定
  - raw_html を manual_import_files に一時保存
        │
        ▼ (フロントがポーリング)
POST /api/portal-search/manual-import/batch
  - 未処理ファイルを最大5件ずつ解析
  - withSandboxedHtmlPage() で HTML を安全にロード
    （全ネットワーク遮断・ポップアップ/ダウンロード禁止・<base>タグでURL解決）
  - 各ポータルの scrapeOnePage()（自動クロールと共通コード）で候補抽出
  - athome は物件名・価格・詳細URLが揃わない候補を needs_manual_check 扱い
  - 同一ファイル内／ジョブ内／既存DBの重複判定
  - manual_import_candidates に保存
  - 全ファイル処理完了で job.status → previewed
        │
        ▼ (人がプレビューで個別除外)
PATCH /api/portal-search/manual-import/jobs/[jobId]
  - candidates の is_selected を更新
        │
        ▼ (「全件取込を確定」)
POST /api/portal-search/manual-import/confirm
  - previewed のみ確定可能。confirming へ CAS 遷移（冪等性担保）
  - properties / customer_property_sources / property_portal_listings へ保存
  - crossPortalDedup（重複統合判定）
  - conditionMatch（顧客条件との照合）
  - job.status → completed / partial_failed
```

自動クロール（`src/crawlers/{suumo,homes,athome}.ts`）とはパース関数
（`scrapeOnePage`）を完全共有しており、ポータル側のHTML構造が変わった場合の
修正箇所は1箇所で済む設計。

## 2. DB構成

### 新規テーブル

**manual_import_jobs**（取込ジョブ・バッチ進捗管理）
```
id, customer_id, portal, transaction_type, status,
file_count, files_parsed, detected_count, new_count, duplicate_count,
parse_error_count, needs_manual_check_count, missing_pages[],
zip_limits(jsonb), error_summary, created_by, created_at, updated_at
```
status: `pending → parsing → previewed → confirming → completed / partial_failed / failed`

**manual_import_files**（アップロードファイル単位）
```
id, job_id, customer_id, portal, file_name, page_number, html_hash,
status, detected_count, reused_from_file_id, raw_html, error_message, created_at
```
status: `queued | parsed | duplicate_import | parse_error | empty_html | invalid_portal | no_results`

重複判定は `(customer_id, portal, html_hash)` 単位（別顧客への使い回しは許可）。
`raw_html` は解析完了後に `NULL` へクリアされる一時列。

**manual_import_candidates**（解析済み候補・プレビュー用）
```
id, job_id, file_id, portal, property_name, price, area_sqm, layout,
built_year, walk_minutes, detail_url, portal_property_id, dedup_key,
parse_status, duplicate_status, condition_status, is_selected,
missing_fields[], saved_property_id, raw_data(jsonb), created_at
```
parse_status: `ok | parse_error | needs_manual_check`
duplicate_status: `new | duplicate_in_file | duplicate_in_batch | duplicate_existing_db | cross_portal_review`

### 既存テーブルへの追加カラム

**customer_property_sources**
```
ingestion_method, manual_import_job_id, manual_import_file_id,
source_file_name, source_page_number
```

**property_portal_listings**
```
ingestion_method  (auto_crawl | manual_html | manual_zip | manual_paste)
```

マイグレーションファイル: `supabase/migration_manual_import.sql`
（適用後、`manual_import_files` の重複判定インデックスを UNIQUE→通常インデックスへ
修正するフォローアップ SQL を別途適用済み）。

## 3. API一覧

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/api/portal-search/manual-import/init` | ジョブ作成・ZIP展開・hash計算・重複判定 |
| POST | `/api/portal-search/manual-import/batch` | 未処理ファイルを最大5件解析（ポーリングで反復） |
| POST | `/api/portal-search/manual-import/confirm` | 冪等確定保存 |
| GET | `/api/portal-search/manual-import/jobs?customer_id=` | 取込履歴一覧 |
| GET | `/api/portal-search/manual-import/jobs/[jobId]` | ジョブ・ファイル・候補詳細 |
| PATCH | `/api/portal-search/manual-import/jobs/[jobId]` | 候補の選択状態更新（部分確定） |

## 4. 状態遷移

```
manual_import_jobs.status:
  pending → parsing → previewed → confirming → completed
                                              ↘ partial_failed
                                              ↘ failed

manual_import_files.status:
  queued → parsed / duplicate_import / parse_error / empty_html / invalid_portal / no_results

manual_import_candidates.parse_status:
  ok / parse_error / needs_manual_check
manual_import_candidates.duplicate_status:
  new / duplicate_in_file / duplicate_in_batch / duplicate_existing_db / cross_portal_review
```

confirm の冪等性: `previewed` 以外は 403 相当のエラー。`confirming`/`completed`/`partial_failed`
中の再呼び出しは新規保存をせず現在の job をそのまま返す。

## 5. 手動取込フロー（画面操作）

1. `/manual-crawl` → 「手動取込」タブ
2. 対象顧客・ポータルを選択
3. HTMLファイル（複数選択）／ZIP／HTML貼り付けのいずれかを指定
4. 「取込を開始（プレビュー）」→ バッチ解析の進捗表示
5. プレビュー画面で候補一覧を確認、不要なものはチェックを外す
6. NEED_MANUAL_CHECK一覧（athome必須項目不足分）を確認
7. 「全件取込を確定」→ properties 等へ保存、MATCH/NEED_MANUAL_CHECK/NO_MATCH件数を表示
8. 「手動取込履歴」で過去ジョブを確認

## 6. athome不具合の原因と修正内容

### 原因
`src/crawlers/athome.ts` の物件カード探索セレクタが `.bukken-item` を含んでいたが、
実際の athome DOM では `.bukken-item` は**物件カード内の画像スワイパー要素**
（`<li class="swiper-slide bukken-item"><img></li>`）であり、物件名・価格・URLを
一切持たない。このセレクタが他候補より先にヒットするため、常に0件（または誤データ）
になっていた。

実物件カードは `.card-box.open` で、内部に
`.title-wrap__title-text`（物件名+価格）、`.property-price`、
`property-detail-table` 内の `<strong>間取り/築年月/専有面積/所在地/交通</strong>`
ラベル、`<a href="/mansion/12345678/...">`（相対URL）を持つ。

### 修正
1. `src/crawlers/athome.ts`: セレクタ優先順位に `.card-box.open` → `.card-box` を追加。
   採用前に先頭候補で物件名・価格・URLが実際に取得できるか検証してから確定する
   ロジックを追加。物件名から末尾に同居する価格文字列を除去する正規化を追加
2. `src/lib/manualImport/sandboxedPage.ts`: `page.setContent()` は基底URLを持たず
   相対URLが解決できないため、`<base href="...">` タグを（既存が無い場合のみ）注入
3. `src/lib/manualImport/parseHtml.ts`: ポータルごとの正規オリジンを sandboxedPage へ渡す

### 検証結果
実HTML（初台駅・athome検索結果）で **30件検出**、必須項目欠落による誤取得 **0件**。
SUUMO/HOME'Sの手動取込結果は修正前後で変化なし（無影響）。
`tsc --noEmit` / `next build` とも成功。

## 7. 今回追加したファイル一覧

```
supabase/migration_manual_import.sql
src/lib/manualImport/sandboxedPage.ts
src/lib/manualImport/portalDetect.ts
src/lib/manualImport/zipExtract.ts
src/lib/manualImport/parseHtml.ts
src/app/api/portal-search/manual-import/init/route.ts
src/app/api/portal-search/manual-import/batch/route.ts
src/app/api/portal-search/manual-import/confirm/route.ts
src/app/api/portal-search/manual-import/jobs/route.ts
src/app/api/portal-search/manual-import/jobs/[jobId]/route.ts
docs/manual-import-final-report.md（本ファイル）
```

変更（最小限・ロジック追加のみ）:
```
src/crawlers/suumo.ts   … scrapeOnePage に export 付与
src/crawlers/homes.ts   … scrapeOnePage に export 付与
src/crawlers/athome.ts  … scrapeOnePage に export 付与 + セレクタ修正（本報告6章）
src/app/manual-crawl/page.tsx … 「手動取込」タブ追加（既存タブは無変更）
package.json            … jszip 追加
```

## 8. 今後の改善候補（TODO）

1. **athome所在地取得改善**: `.card-box.open` 内の `<strong>所在地</strong>` ラベルから
   `address` を抽出する（現状 `[class*="address"]` 等のクラス名一致に依存しており空文字になる）
2. **athome実運用E2E**: bot認証を回避できた状態での単一ポータル検索・一括検索・run-allの
   実クロール確認（今回は保存済みHTMLでの検証のみ）
3. **HTML保存形式比較**: 「HTMLのみ」「ページソースを表示して保存」「outerHTML貼り付け」
   「Webページ、完全」の4形式で検索結果DOMが取得できるかの比較検証
4. **REINS照合精度向上**: 建物名の表記ゆれ、面積許容差、徒歩分数の誤差、号室表記の除去
   といった既存の `matchReins.ts` 側の精度改善
5. **手動取込UX改善**: 実運用しながら判断（バッチサイズ調整、プレビュー表示の見やすさ等）
