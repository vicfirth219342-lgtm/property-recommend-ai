// ============================================================
// content.js  — レインズ照合ツール コンテンツスクリプト
//
// 役割:
//   1. popup.js から chrome.tabs.sendMessage で届いた顧客条件を受け取る
//   2. セレクターマッピング (reins-selectors.js) に従いフォームへ入力
//   3. 【第1段階】: セレクターが未設定の間はコンソールに条件を表示
//   4. 【第2段階】: DOM調査後にセレクターを埋めて自動入力を有効化
//
// ページURL判定:
//   固定URLに依存せず、hostname が 'reins.jp' を含むかで判定
// ============================================================

console.log('[レインズ照合] content.js 読み込み完了:', window.location.href)

// ── セレクターマッピング（reins-selectors.js の内容をインライン管理） ──
// manifest v3 では content_scripts に複数ファイルを列挙するより
// 1ファイルにまとめる方が確実なため、ここで直接定義。
// 第2段階でDOMを調査後、各フィールドの値を埋めてください。
const SELECTORS = {
  // ページ内の検索フォームコンテナ（ここが null なら自動入力をスキップ）
  searchFormContainer: null,  // TODO: DOM調査後に設定

  // 売買 / 賃貸
  transactionType: {
    sale: null,   // TODO: 'input[name="xxx"][value="sale"]'
    rent: null,   // TODO:
  },

  // 物件種別（セレクターまたは { selector, value } オブジェクト）
  propertyType: {
    'マンション':    null,  // TODO
    'マンション(中古)': null,
    '戸建':          null,
    '土地':          null,
  },

  // エリア
  prefecture: null,     // TODO: 都道府県 select
  city:       null,     // TODO: 市区町村 select

  // 沿線・駅
  line:    null,        // TODO
  station: null,        // TODO

  // 価格（万円）
  budgetMin: null,      // TODO
  budgetMax: null,      // TODO

  // 賃料（万円）
  rentMin: null,        // TODO
  rentMax: null,        // TODO

  // 面積（㎡）
  areaMin: null,        // TODO

  // 築年数（「○年以内」の select value を要調査）
  buildingAge: null,    // TODO

  // 駅徒歩（select value を要調査）
  walkMinutes: null,    // TODO

  // 検索実行ボタン
  searchButton: null,   // TODO
}

// ── メッセージリスナー ──────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'REINS_FILL_FORM') {
    sendResponse({ ok: false, reason: '未知のメッセージタイプ' })
    return
  }

  const task = message.task
  if (!task) {
    sendResponse({ ok: false, reason: 'タスクデータなし' })
    return
  }

  // ── 【第1段階】コンソール表示 ──────────────────────────────
  console.group('[レインズ照合] 顧客条件を受け取りました')
  console.log('顧客名:',     task.customer_name)
  console.log('タスクID:',   task.id)
  console.log('売買/賃貸:',  task.transaction_type === 'sale' ? '売買' : '賃貸')
  console.log('物件種別:',   task.property_type  ?? '未設定')
  console.log('エリア:',     task.area           ?? '未設定')
  if (task.transaction_type === 'sale') {
    console.log('価格下限:',   task.budget_min != null ? `${task.budget_min}万円` : '未設定')
    console.log('価格上限:',   task.budget_max != null ? `${task.budget_max}万円` : '未設定')
  } else {
    console.log('賃料下限:',   task.rent_min != null ? `${task.rent_min}万円` : '未設定')
    console.log('賃料上限:',   task.rent_max != null ? `${task.rent_max}万円` : '未設定')
  }
  console.log('面積下限:',   task.area_sqm_min     != null ? `${task.area_sqm_min}㎡` : '未設定')
  console.log('駅徒歩:',     task.walk_minutes_max != null ? `${task.walk_minutes_max}分以内` : '未設定')
  console.log('築年数:',     task.building_age_max != null ? `${task.building_age_max}年以内` : '未設定')
  console.log('その他条件:', task.other_conditions  ?? '未設定')
  console.log('--- 生データ ---', task)
  console.groupEnd()

  // ── フォーム自動入力（第2段階で有効化） ────────────────────
  const filledFields = []
  const skippedFields = []
  const errors = []

  if (SELECTORS.searchFormContainer === null) {
    // 第1段階: セレクター未設定のためスキップ
    skippedFields.push('全フィールド（セレクター未設定 → 第2段階で有効化）')
  } else {
    const form = document.querySelector(SELECTORS.searchFormContainer)
    if (!form) {
      errors.push(`フォームコンテナが見つかりません: ${SELECTORS.searchFormContainer}`)
    } else {
      // 各フィールドへの入力を試みる
      filledFields.push(...fillFormFields(task, form))
    }
  }

  const result = {
    ok: true,
    phase: SELECTORS.searchFormContainer === null ? 1 : 2,
    url: window.location.href,
    filled: filledFields,
    skipped: skippedFields,
    errors,
  }

  console.log('[レインズ照合] 入力結果:', result)
  sendResponse(result)
})

// ── フォーム入力ロジック（第2段階で実際のセレクターを使用） ──
function fillFormFields(task, form) {
  const filled = []

  // 売買 / 賃貸
  const txSel = task.transaction_type === 'rent'
    ? SELECTORS.transactionType.rent
    : SELECTORS.transactionType.sale
  if (txSel) {
    if (setField(form, txSel, null, 'click')) filled.push('売買/賃貸')
  }

  // 物件種別（候補キーを前方一致で探す）
  if (task.property_type) {
    const ptKey = Object.keys(SELECTORS.propertyType).find(k =>
      task.property_type.includes(k) || k.includes(task.property_type)
    )
    const ptSel = ptKey ? SELECTORS.propertyType[ptKey] : null
    if (ptSel) {
      if (setField(form, ptSel, null, 'click')) filled.push('物件種別')
    }
  }

  // 価格 / 賃料
  if (task.transaction_type === 'sale') {
    if (task.budget_min != null && SELECTORS.budgetMin) {
      if (setField(form, SELECTORS.budgetMin, String(task.budget_min))) filled.push('価格下限')
    }
    if (task.budget_max != null && SELECTORS.budgetMax) {
      if (setField(form, SELECTORS.budgetMax, String(task.budget_max))) filled.push('価格上限')
    }
  } else {
    if (task.rent_min != null && SELECTORS.rentMin) {
      if (setField(form, SELECTORS.rentMin, String(task.rent_min))) filled.push('賃料下限')
    }
    if (task.rent_max != null && SELECTORS.rentMax) {
      if (setField(form, SELECTORS.rentMax, String(task.rent_max))) filled.push('賃料上限')
    }
  }

  // 面積
  if (task.area_sqm_min != null && SELECTORS.areaMin) {
    if (setField(form, SELECTORS.areaMin, String(task.area_sqm_min))) filled.push('面積下限')
  }

  // 築年数
  if (task.building_age_max != null && SELECTORS.buildingAge) {
    if (setField(form, SELECTORS.buildingAge, String(task.building_age_max))) filled.push('築年数')
  }

  // 駅徒歩
  if (task.walk_minutes_max != null && SELECTORS.walkMinutes) {
    if (setField(form, SELECTORS.walkMinutes, String(task.walk_minutes_max))) filled.push('駅徒歩')
  }

  return filled
}

// ── フィールドへの値セット ────────────────────────────────────
// mode: 'value'(デフォルト) → value をセット
//       'click'            → クリックして選択
function setField(container, selector, value, mode = 'value') {
  try {
    const el = container.querySelector(selector)
    if (!el) {
      console.warn(`[レインズ照合] 要素が見つかりません: ${selector}`)
      return false
    }
    if (mode === 'click') {
      el.click()
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
    // input / select / textarea
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype,
      'value'
    )?.set
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value)
    } else {
      el.value = value
    }
    el.dispatchEvent(new Event('input',  { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  } catch (e) {
    console.error(`[レインズ照合] setField エラー (${selector}):`, e)
    return false
  }
}
