# 次回引継ぎ用サマリー

最終更新: 2026-07-11

## システム構成

Next.js（App Router）+ Supabase（Postgres）のマンション提案支援システム。
物件取得はPlaywrightによるSUUMO/HOME'S/athomeクローリングが中心で、
自動クロールが失敗する場合に備えて手動HTML取込機能を追加済み。

主要な導線:
```
顧客登録 → 条件入力 → 検索URL自動生成（portal_area_params マスタ参照）
  → 探索（単一ポータル / 一括検索 / 手動取込）
  → properties へ保存
  → conditionMatch で顧客条件と照合
  → MATCH物件を reins_check_queue へ投入
  → REINS照合（Chrome拡張または reins-check 画面）
  → 提案候補として顧客へ提示（candidates 画面）
```

## 主要テーブル

| テーブル | 役割 |
|---|---|
| `customers` / `customer_conditions` | 顧客・希望条件 |
| `customer_search_urls` | ポータル別検索URL（`generated_by`: auto/manual、`is_active`で無効化可能） |
| `properties` | 物件本体（`dedup_key`で重複判定、`current_price`は万円単位） |
| `customer_property_sources` | 顧客×物件×ポータルの紐付け（`ingestion_method`等で取得経路を追跡） |
| `property_portal_listings` | 物件×ポータルの掲載状況（`consecutive_miss_count`で掲載終了判定） |
| `portal_search_jobs` / `portal_search_job_results` | 一括検索（run-all）のジョブ・結果 |
| `manual_import_jobs` / `manual_import_files` / `manual_import_candidates` | 手動HTML取込 |
| `reins_check_queue` / `reins_match_results`（append-only） | REINS照合キュー・結果履歴 |
| `duplicate_reviews` | ポータル横断の曖昧重複（自動統合せず手動確認） |
| `portal_area_params` / `area_masters` / `area_aliases` | 駅・エリア名→ポータルURLパラメータのマスタ |

## 主要API

| 系統 | エンドポイント |
|---|---|
| 単一探索 | `POST /api/manual-crawl`（GitHub Actions経由の非同期ジョブ） |
| 一括検索 | `POST /api/portal-search/run-all`（SUUMO→HOME'S→athome、30秒間隔で順次実行） |
| 手動取込 | `POST /api/portal-search/manual-import/{init,batch,confirm}` |
| URL管理 | `POST /api/customers/[id]/regenerate-urls`、`PATCH /api/search-urls/[id]`（無効化） |
| REINS照合 | `POST /api/reins-match/run`、`POST /api/reins/import-page`（Chrome拡張から） |
| 候補一覧 | `GET /api/proposals/candidates` |

## 既知課題

1. **athomeのbot認証**: 短時間の連続アクセスで「認証にご協力ください」ページが表示され
   `fetch_error`になる。頻度を下げるかIP分散が必要（未対応）
2. **athome所在地未取得**: 手動取込・自動クロール共通で`address`が空文字になる
   （セレクタ改善余地あり。`docs/manual-import-final-report.md` TODO参照）
3. **HOME'S/athomeの古い手動登録URL**: 2026-07-07以前に登録された広域URL
   （県全体・フィルタ未反映）が一部の顧客に残存している可能性。`is_active=false`で
   無効化する運用フローは整備済みだが、全顧客の棚卸しは未実施
4. **HTML保存形式の網羅検証未実施**: 手動取込は「HTMLのみ」形式で動作確認済みだが、
   「ページソース保存」「Webページ完全保存」「outerHTML貼り付け」との比較は未実施
5. **REINS照合の精度**: 建物名表記ゆれ・面積許容差・徒歩誤差・号室除去などの
   スコアリング精度改善余地あり（`src/lib/matchReins.ts`）

## 直近の作業履歴（時系列）

1. レインズ照合基盤の監査・改善（not_found原因分類、監査ログ、データ修正機能）
2. 全ポータル一括検索機能の新規実装（`portal_search_jobs`系）
3. HOME'S/athome検索URLの監査 → 広域URL無効化・URLパラメータ形式修正
4. manual-crawl画面に「一括検索モード」タブ追加（SUUMO→30秒待機→HOME'S→30秒待機→athome）
5. Chrome拡張（REINS用）の流用可否調査 → 不採用と判断
6. 手動HTMLアップロード機能の設計・実装（本ドキュメント対象）
7. athome物件カードセレクタ不具合の発見・修正（`.bukken-item`→`.card-box.open`）

## 次回再開時に確認すべきこと

- `docs/manual-import-final-report.md` のTODO 1〜5の優先順位を確認
- athomeのbot認証回避策（アクセス間隔調整など）の検討
- 手動取込機能を実運用に投入し、バッチサイズやプレビューUIのフィードバックを収集
