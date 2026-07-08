const STATUS_LABEL = {
  confirmed: '掲載あり可能性高い',
  review:    '要確認',
  not_found: '掲載なし可能性高い',
  pending:   '未確認',
}

document.addEventListener('DOMContentLoaded', async () => {
  const pageStatusEl  = document.getElementById('pageStatus')
  const mainContent   = document.getElementById('mainContent')
  const noConfig      = document.getElementById('noConfig')
  const checkSelect   = document.getElementById('checkSelect')
  const sendBtn       = document.getElementById('sendBtn')
  const resultEl      = document.getElementById('result')

  // 設定画面リンク
  document.getElementById('optionsLink').addEventListener('click', (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })
  document.getElementById('openOptions')?.addEventListener('click', (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })

  // ストレージから設定読み込み
  const { apiBase, token } = await chrome.storage.local.get(['apiBase', 'token'])

  if (!apiBase) {
    mainContent.style.display = 'none'
    noConfig.style.display = 'block'
    pageStatusEl.textContent = '設定が必要です'
    pageStatusEl.className = 'warn'
    return
  }

  // 現在タブのURL確認
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url ?? ''
  if (url.includes('reins.jp')) {
    pageStatusEl.textContent = '✓ レインズのページを検出しました'
    pageStatusEl.className = 'ok'
  } else {
    pageStatusEl.textContent = '⚠ レインズ以外のページです（送信は可能）'
    pageStatusEl.className = 'warn'
  }

  // 照合待ち物件リストを取得
  try {
    const res = await fetch(`${apiBase}/api/reins-check`, {
      headers: token ? { 'x-extension-token': token } : {},
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const checks = await res.json()

    checkSelect.innerHTML = ''
    if (checks.length === 0) {
      checkSelect.innerHTML = '<option value="">照合待ち物件がありません</option>'
    } else {
      checks.forEach(c => {
        const opt = document.createElement('option')
        opt.value = c.id
        const statusLabel = STATUS_LABEL[c.match_status] ?? c.match_status
        const price = c.price_man ? `${c.price_man.toLocaleString()}万円` : ''
        const name = c.property_name ?? '（物件名なし）'
        opt.textContent = `${name}　${price}　[${statusLabel}]`
        checkSelect.appendChild(opt)
      })
      sendBtn.disabled = false
    }
  } catch (e) {
    checkSelect.innerHTML = `<option value="">取得失敗: ${e.message}</option>`
    pageStatusEl.textContent = `物件リスト取得エラー: ${e.message}`
    pageStatusEl.className = 'warn'
  }

  // 送信ボタン
  sendBtn.addEventListener('click', async () => {
    const checkId = checkSelect.value
    if (!checkId) return

    sendBtn.disabled = true
    sendBtn.textContent = '送信中...'
    resultEl.style.display = 'none'

    try {
      // アクティブタブから document.body.innerText を取得
      const [{ result: pageText }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText,
      })

      if (!pageText || pageText.trim().length < 20) {
        throw new Error('ページテキストが取得できませんでした')
      }

      // API に送信
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-extension-token'] = token

      const res = await fetch(`${apiBase}/api/reins/import-text`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: 'chrome_extension',
          text: pageText,
          customer_search_url_id: checkId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      // 成功表示
      const score = data.score ?? 0
      const statusLabel = STATUS_LABEL[data.status] ?? data.status
      const matched = (data.matched_items ?? []).join('・') || 'なし'

      resultEl.className = 'result success'
      resultEl.innerHTML = `
        <div><strong>${data.property_name ?? '物件'}</strong></div>
        <div class="score-row">
          <span>照合スコア</span>
          <span class="score-val">${score}<small style="font-size:12px;font-weight:400">/100点</small></span>
        </div>
        <div style="margin-top:4px;font-size:12px;font-weight:600">${statusLabel}</div>
        <div class="score-items" style="margin-top:6px">
          一致項目: <span>${matched}</span>
        </div>
      `
      resultEl.style.display = 'block'
      sendBtn.textContent = '✓ 送信済み'
    } catch (e) {
      resultEl.className = 'result error'
      resultEl.textContent = `エラー: ${e.message}`
      resultEl.style.display = 'block'
      sendBtn.disabled = false
      sendBtn.textContent = 'この検索結果を送信'
    }
  })
})
