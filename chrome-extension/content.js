// ============================================================
// content.js  — レインズ照合ツール コンテンツスクリプト v2
//
// 【第2段階】売買検索条件入力フォーム (GBK001210) への自動入力
//
// 戦略:
//   - IDは __BVID__ のため使用不可
//   - SELECT → オプションテキストのマッチングで特定
//   - text input → ラベルテキストの近傍探索で特定
//   - Vue.js リアクティビティ対応: native setter + input/change イベント
// ============================================================

console.log('[レインズ照合] content.js 読み込み完了:', window.location.href)

// ── 物件種別マッピング ────────────────────────────────────────
// 物件種別１ SELECT の option value
const PROPERTY_TYPE_MAP = {
  '売土地':     '01',
  '土地':       '01',
  '売一戸建':   '02',
  '一戸建':     '02',
  '戸建':       '02',
  '売マンション': '03',
  'マンション': '03',
}

// 物件種目１ SELECT の option value（中古マンション等）
const PROPERTY_SUBTYPE_MAP = {
  '新築マンション':   '01',
  '中古マンション':   '02',
  'マンション(新築)': '01',
  'マンション(中古)': '02',
  'マンション':       '02', // デフォルトは中古
}

// ── DOM ヘルパー関数 ──────────────────────────────────────────

/**
 * オプションテキストを含む最初の SELECT 要素を返す
 * @param {string} optionText - 含まれるテキスト
 * @param {number} [skip=0]  - 同条件で何番目をスキップするか
 */
function findSelectByOptionText(optionText, skip = 0) {
  let count = 0
  for (const sel of document.querySelectorAll('select')) {
    for (const opt of sel.options) {
      if (opt.text.trim().includes(optionText)) {
        if (count === skip) return sel
        count++
        break
      }
    }
  }
  return null
}

/**
 * オプション数が一致する最初の SELECT を返す（築年月の年/月特定用）
 * @param {number} count - オプション数
 * @param {string} [mustInclude] - 必ず含まれるオプションテキスト
 */
function findSelectByOptionCount(count, mustInclude = null) {
  for (const sel of document.querySelectorAll('select')) {
    if (sel.options.length !== count) continue
    if (mustInclude) {
      const hasIt = Array.from(sel.options).some(o => o.text.includes(mustInclude))
      if (!hasIt) continue
    }
    return sel
  }
  return null
}

/**
 * ラベルテキストに近い text/number input 群を返す（最初の一致のみ）
 * TH-TD テーブル構造 + Vue SPA の両方に対応
 */
function findInputsByLabel(labelText) {
  return findAllInputGroupsByLabel(labelText)[0] ?? []
}

/**
 * ラベルテキストに近い input 群を、ラベルの出現回数分すべて返す
 * 沿線1/2/3 のように同ラベルが繰り返される場合に使用
 * @returns {HTMLElement[][]}
 */
function findAllInputGroupsByLabel(labelText) {
  const groups = []
  const labelEls = Array.from(
    document.querySelectorAll('th, td label, label, dt, legend, .p-form-label, [class*="-label"]')
  ).filter(el => (el.innerText || el.textContent || '').trim().includes(labelText))

  for (const labelEl of labelEls) {
    const th = labelEl.closest('th')
    if (th) {
      const tr = th.closest('tr')
      if (tr) {
        const inputs = Array.from(tr.querySelectorAll('input[type="text"], input[type="number"]'))
        if (inputs.length) { groups.push(inputs); continue }
      }
    }
    const forId = labelEl.htmlFor
    if (forId) {
      const el = document.getElementById(forId)
      if (el) { groups.push([el]); continue }
    }
    let parent = labelEl.parentElement
    for (let i = 0; i < 5; i++) {
      if (!parent) break
      const inputs = Array.from(parent.querySelectorAll('input[type="text"], input[type="number"]'))
        .filter(inp => !inp.closest('th'))
      if (inputs.length) { groups.push(inputs); break }
      parent = parent.parentElement
    }
  }
  return groups
}

/**
 * オプションにマッチするすべての SELECT を返す（沿線1/2/3の繰り返し対応）
 */
function findAllSelectsByOptionText(optionText) {
  const found = []
  for (const sel of document.querySelectorAll('select')) {
    for (const opt of sel.options) {
      if (opt.text.trim().includes(optionText)) { found.push(sel); break }
    }
  }
  return found
}

/**
 * Vue.js リアクティブな値セット
 */
function setReactiveValue(el, value) {
  if (!el) return false
  try {
    const proto = el.tagName === 'SELECT'
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (nativeSetter) {
      nativeSetter.call(el, value)
    } else {
      el.value = value
    }
    el.dispatchEvent(new Event('input',  { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  } catch (e) {
    console.error('[レインズ照合] setReactiveValue エラー:', e, el)
    return false
  }
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

  // ── コンソールに条件を表示 ────────────────────────────────
  console.group('[レインズ照合] 顧客条件を受け取りました')
  console.log('顧客名:',   task.customer_name)
  console.log('タスクID:', task.id)
  console.log('売買/賃貸:', task.transaction_type === 'sale' ? '売買' : '賃貸')
  console.log('物件種別:', task.property_type  ?? '未設定')
  console.log('エリア:',   task.area           ?? '未設定')
  if (task.transaction_type === 'sale') {
    console.log('価格下限:', task.budget_min != null ? `${task.budget_min}万円` : '未設定')
    console.log('価格上限:', task.budget_max != null ? `${task.budget_max}万円` : '未設定')
  } else {
    console.log('賃料下限:', task.rent_min != null ? `${task.rent_min}万円` : '未設定')
    console.log('賃料上限:', task.rent_max != null ? `${task.rent_max}万円` : '未設定')
  }
  console.log('面積下限:', task.area_sqm_min     != null ? `${task.area_sqm_min}㎡` : '未設定')
  console.log('駅徒歩:',  task.walk_minutes_max != null ? `${task.walk_minutes_max}分以内` : '未設定')
  console.log('築年数:',  task.building_age_max != null ? `${task.building_age_max}年以内` : '未設定')
  console.log('その他:',  task.other_conditions  ?? '未設定')
  console.groupEnd()

  // ── 第2段階: フォーム自動入力（非同期: Vue再描画待ち対応）──
  fillFormPhase2(task).then(result => {
    console.log('[レインズ照合] 入力結果:', result)
    sendResponse(result)
  })

  return true  // sendResponse を非同期で使うため必須
})

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// ── 第2段階フォーム入力 ──────────────────────────────────────
async function fillFormPhase2(task) {
  const filled   = []
  const skipped  = []
  const errors   = []

  // 1. 物件種別１ ─────────────────────────────────────────────
  if (task.property_type) {
    const ptValue = Object.entries(PROPERTY_TYPE_MAP)
      .find(([k]) => task.property_type.includes(k) || k.includes(task.property_type))?.[1]

    if (ptValue) {
      // 「売マンション」を含む最初のSELECTが物件種別１
      const sel = findSelectByOptionText('売マンション')
      if (sel && setReactiveValue(sel, ptValue)) {
        filled.push(`物件種別１ → ${ptValue}`)
      } else {
        errors.push('物件種別１ SELECT が見つかりません')
      }
    } else {
      skipped.push(`物件種別１（マッピング未定義: ${task.property_type}）`)
    }
  } else {
    skipped.push('物件種別１（条件未設定）')
  }

  // 物件種別１をセットした後、Vueが物件種目１を再描画するまで待つ
  await sleep(400)

  // 2. 物件種目１（中古マンション等）────────────────────────────
  if (task.property_type) {
    const stValue = Object.entries(PROPERTY_SUBTYPE_MAP)
      .find(([k]) => task.property_type.includes(k) || k.includes(task.property_type))?.[1]

    if (stValue) {
      // 「中古マンション」を含むSELECT（物件種別とは別）
      const sel = findSelectByOptionText('中古マンション')
      if (sel && setReactiveValue(sel, stValue)) {
        filled.push(`物件種目１ → ${stValue}`)
      } else {
        errors.push('物件種目１ SELECT が見つかりません')
      }
    }
  }

  // 3. 価格（万円）───────────────────────────────────────────
  if (task.transaction_type === 'sale') {
    const priceInputs = findInputsByLabel('価格')
    if (priceInputs.length >= 1 && task.budget_min != null) {
      if (setReactiveValue(priceInputs[0], String(task.budget_min))) {
        filled.push(`価格下限 → ${task.budget_min}万円`)
      } else {
        errors.push('価格下限 input への入力失敗')
      }
    }
    if (priceInputs.length >= 2 && task.budget_max != null) {
      if (setReactiveValue(priceInputs[1], String(task.budget_max))) {
        filled.push(`価格上限 → ${task.budget_max}万円`)
      } else {
        errors.push('価格上限 input への入力失敗')
      }
    }
    if (!priceInputs.length) errors.push('価格 input が見つかりません')
  }

  // 4. 専有面積（㎡）─────────────────────────────────────────
  if (task.area_sqm_min != null) {
    const areaInputs = findInputsByLabel('専有面積')
    if (areaInputs.length >= 1) {
      if (setReactiveValue(areaInputs[0], String(task.area_sqm_min))) {
        filled.push(`専有面積下限 → ${task.area_sqm_min}㎡`)
      } else {
        errors.push('専有面積 input への入力失敗')
      }
    } else {
      errors.push('専有面積 input が見つかりません')
    }
  }

  // 5. 駅名 + 駅から徒歩 ────────────────────────────────────
  //    task.area を空白で分割して沿線1/2/3 の「駅名」に順番に入力
  //    その行の「駅から徒歩」も合わせてセット
  if (task.area) {
    const stationNames = task.area.split(/[\s　]+/).filter(Boolean)
    // 沿線1/2/3 それぞれの「駅名」input グループ
    const stationInputGroups = findAllInputGroupsByLabel('駅名')
    // 沿線ごとの「駅から徒歩」unit SELECT（バス停・交通 も同じオプションを持つが先頭3つが沿線用）
    const walkUnitSels = findAllSelectsByOptionText('分').filter(
      sel => sel.options.length === 3  // () / 分 / ｍ の3択だけ
    )
    // 沿線ごとの「駅から」value input
    const walkInputGroups = findAllInputGroupsByLabel('駅から徒歩')

    stationNames.forEach((name, i) => {
      if (!stationInputGroups[i]) return
      const stationInput = stationInputGroups[i][0]
      if (stationInput && setReactiveValue(stationInput, name)) {
        filled.push(`駅名${i + 1} → ${name}`)
      }
      // 駅から徒歩（値 + 単位）
      if (task.walk_minutes_max != null) {
        const walkInput = walkInputGroups[i]?.[0]
        if (walkInput && setReactiveValue(walkInput, String(task.walk_minutes_max))) {
          filled.push(`駅から徒歩${i + 1} → ${task.walk_minutes_max}`)
        }
        const walkUnitSel = walkUnitSels[i]
        if (walkUnitSel && setReactiveValue(walkUnitSel, '1')) {
          filled.push(`駅から徒歩${i + 1} 単位 → 分`)
        }
      }
    })
    if (!stationInputGroups.length) errors.push('駅名 input が見つかりません')
  } else if (task.walk_minutes_max != null) {
    skipped.push('駅から徒歩（エリア未設定のためスキップ）')
  }

  // 6. 築年月（築年数 → 建築最古年を計算）─────────────────────
  //    building_age_max 年以内 → 今年 - building_age_max = 最古年
  if (task.building_age_max != null) {
    const currentYear = new Date().getFullYear()
    const oldestYear  = currentYear - task.building_age_max  // 例: 30年以内→1996年

    // 築年月・年 SELECT: オプション数 104 前後かつ年号を含む
    const yearSel = findSelectByOptionCount(105, '年')   // 「から」側
      || findSelectByOptionText(`${oldestYear}年`)
    if (yearSel && setReactiveValue(yearSel, String(oldestYear))) {
      filled.push(`築年月(年)下限 → ${oldestYear}年`)
    } else {
      // オプション数でのマッチを試みる
      for (const sel of document.querySelectorAll('select')) {
        if (sel.options.length > 50 && Array.from(sel.options).some(o => o.text.includes('年'))) {
          if (setReactiveValue(sel, String(oldestYear))) {
            filled.push(`築年月(年)下限 → ${oldestYear}年 (fallback)`)
            break
          }
        }
      }
      if (!filled.some(f => f.includes('築年月'))) {
        errors.push(`築年月 SELECT が見つかりません (target: ${oldestYear}年)`)
      }
    }
  }

  // 7. 所在地名１ は駅名で代替するためスキップ
  //    （所在地名１は完全一致・行政区名向けのため、駅名文字列は駅名フィールドへ入力済み）

  return {
    ok: true,
    phase: 2,
    url: window.location.href,
    filled,
    skipped,
    errors,
  }
}
