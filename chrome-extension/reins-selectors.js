// ============================================================
// reins-selectors.js
// 東日本レインズ 検索フォームのセレクターマッピング
//
// 第2段階：実際のDOM確認後にここの値を埋めていく。
// content.js はこのマッピングを参照して入力を行うため、
// セレクターが変わっても content.js 本体を触る必要がない。
//
// 【調査手順】
// system.reins.jp でログイン後、
// 物件検索画面で F12 → Elements タブを開き、
// 各入力フィールドを選択して以下の属性を記録してください：
//   - id 属性
//   - name 属性
//   - type (text / select-one / radio / checkbox)
//   - select の場合は option の value 一覧
//
// 調査すべき項目:
//   1. 売買 / 賃貸 の切り替え（ラジオボタン or タブ）
//   2. 物件種別（マンション / 戸建 / 土地）
//   3. 都道府県
//   4. 市区町村
//   5. 沿線
//   6. 駅
//   7. 価格（下限 / 上限）
//   8. 面積（下限）
//   9. 築年数
//  10. 駅徒歩
// ============================================================

const REINS_SELECTORS = {
  // ── ページURL判定 ──────────────────────────────────────────
  // system.reins.jp 上でレインズのページかどうかを判定するパターン
  // 固定URLに依存せず、URLに 'reins.jp' が含まれているかで判定
  isReinsPage: () => window.location.hostname.includes('reins.jp'),

  // ── 検索フォームの親要素 ──────────────────────────────────
  // フォーム全体のコンテナ。ここが見つからない場合は検索画面ではない。
  // 【要調査】実際のセレクターを確認後に設定してください
  searchFormContainer: null, // 例: '#searchForm', '.p-search-form'

  // ── 売買 / 賃貸 ───────────────────────────────────────────
  // 【要調査】ラジオボタンか、ページを分けているかを確認
  transactionType: {
    sale: null,   // 売買を選択する要素 例: 'input[name="torihikiKubun"][value="1"]'
    rent: null,   // 賃貸を選択する要素
  },

  // ── 物件種別 ───────────────────────────────────────────────
  // 【要調査】チェックボックスか select か確認
  propertyType: {
    // キー: システム内の物件種別名, 値: セレクター or { selector, value }
    // 例: 'マンション': 'input[name="shumokuCd"][value="01"]'
    'マンション': null,
    '戸建':       null,
    '土地':       null,
  },

  // ── エリア選択 ─────────────────────────────────────────────
  prefecture: null,       // 都道府県 select 例: 'select[name="todofukenCd"]'
  city:       null,       // 市区町村 select 例: 'select[name="shikuchosonCd"]'

  // ── 沿線・駅 ───────────────────────────────────────────────
  line:    null,          // 沿線 select
  station: null,          // 駅 select

  // ── 価格 ──────────────────────────────────────────────────
  budgetMin: null,        // 価格下限 input 例: 'input[name="kakakuFrom"]'
  budgetMax: null,        // 価格上限 input

  // ── 賃料 ──────────────────────────────────────────────────
  rentMin: null,          // 賃料下限
  rentMax: null,          // 賃料上限

  // ── 面積 ──────────────────────────────────────────────────
  areaMin: null,          // 面積下限 例: 'input[name="mensekiFrom"]' or select

  // ── 築年数 ─────────────────────────────────────────────────
  // 【要調査】「○年以内」の select か、竣工年の input か
  buildingAge: null,      // 例: 'select[name="chikunensuFrom"]'

  // ── 駅徒歩 ─────────────────────────────────────────────────
  walkMinutes: null,      // 例: 'select[name="ekiTohoFrom"]'

  // ── 検索実行ボタン ─────────────────────────────────────────
  searchButton: null,     // 例: 'button[type="submit"]', '#searchBtn'
}

// CommonJS / ES Module 両対応
if (typeof module !== 'undefined') module.exports = REINS_SELECTORS
