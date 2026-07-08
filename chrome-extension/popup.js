document.addEventListener('DOMContentLoaded', async () => {
  const pageStatusEl = document.getElementById('pageStatus')
  const mainContent  = document.getElementById('mainContent')
  const noConfig     = document.getElementById('noConfig')
  const sendBtn      = document.getElementById('sendBtn')
  const resultEl     = document.getElementById('result')

  document.getElementById('optionsLink').addEventListener('click', e => {
    e.preventDefault(); chrome.runtime.openOptionsPage()
  })
  document.getElementById('openOptions')?.addEventListener('click', e => {
    e.preventDefault(); chrome.runtime.openOptionsPage()
  })

  // 設定読み込み（パスが混入していてもオリジンのみ使用）
  const stored = await chrome.storage.local.get(['apiBase', 'token'])
  const token = stored.token ?? ''
  let apiBase = stored.apiBase ?? ''
  try { apiBase = new URL(apiBase).origin } catch { /* 不正URL */ }

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
    pageStatusEl.textContent = '⚠ レインズ以外のページです'
    pageStatusEl.className = 'warn'
  }

  // 送信
  sendBtn.addEventListener('click', async () => {
    sendBtn.disabled = true
    sendBtn.textContent = '送信中...'
    resultEl.style.display = 'none'

    try {
      // アクティブタブから innerText と href を取得
      const [{ result: pageText }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText,
      })
      const [{ result: pageUrl }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.location.href,
      })

      if (!pageText || pageText.trim().length < 20) {
        throw new Error('ページテキストが取得できませんでした')
      }

      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-extension-token'] = token

      const res = await fetch(`${apiBase}/api/reins/import-results`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source: 'chrome_extension', text: pageText, page_url: pageUrl }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      resultEl.className = 'result success'
      resultEl.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px">✓ 送信完了</div>
        <div class="stat-row">
          <span>レインズ物件 抽出数</span>
          <span class="stat-num">${data.extracted_count}<span class="sub">件</span></span>
        </div>
        <div class="stat-row">
          <span>候補物件 照合更新</span>
          <span class="stat-num">${data.matched_portals}<span class="sub"> / ${data.total_portals}件</span></span>
        </div>
        <div style="margin-top:8px;font-size:11px;color:#15803d">
          アプリの照合リストで結果を確認してください。
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
