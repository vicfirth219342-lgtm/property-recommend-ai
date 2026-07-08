// Preview URL 検出
function isPreviewUrl(url) {
  return /-git-[a-z0-9][-a-z0-9]*[-\.]/i.test(url)
}

// Preview URL → 本番URL変換
// 例: https://property-recommend-ai-git-main-kiyo-s-projects1413.vercel.app
//   → https://property-recommend-ai-kiyo-s-projects1413.vercel.app
function fixVercelPreviewUrl(url) {
  const fixed = url.replace(/-git-[a-z0-9][a-z0-9-]*?-([a-z0-9][a-z0-9-]*\.vercel\.app)/i, '-$1')
  if (fixed !== url) return fixed
  return url.replace(/-git-[a-z0-9][a-z0-9-]*\./i, '.')
}

document.addEventListener('DOMContentLoaded', async () => {
  const pageStatusEl   = document.getElementById('pageStatus')
  const mainContent    = document.getElementById('mainContent')
  const noConfig       = document.getElementById('noConfig')
  const addPageBtn     = document.getElementById('addPageBtn')
  const openAppBtn     = document.getElementById('openAppBtn')
  const clearBtn       = document.getElementById('clearBtn')
  const resultEl       = document.getElementById('result')
  const sessionPanel   = document.getElementById('sessionPanel')
  const sessionLabel   = document.getElementById('sessionLabel')
  const sessionCount   = document.getElementById('sessionCount')
  const sessionHint    = document.getElementById('sessionHint')
  const stepHint       = document.getElementById('stepHint')
  const apiUrlBar      = document.getElementById('apiUrlBar')
  const apiUrlText     = document.getElementById('apiUrlText')
  const previewUrlWarn = document.getElementById('previewUrlWarn')

  document.getElementById('optionsLink').addEventListener('click', e => {
    e.preventDefault(); chrome.runtime.openOptionsPage()
  })
  document.getElementById('openOptions')?.addEventListener('click', e => {
    e.preventDefault(); chrome.runtime.openOptionsPage()
  })

  // ── 設定読み込み ──────────────────────────────────────────
  const stored = await chrome.storage.local.get(['apiBase', 'token', 'sessionId'])
  const token = stored.token ?? ''
  let apiBase = stored.apiBase ?? ''
  let sessionId = stored.sessionId ?? null

  // オリジンのみ取り出す
  try { apiBase = new URL(apiBase).origin } catch { /* 不正URL */ }

  // Preview URLを自動修正して保存し直す
  if (apiBase && isPreviewUrl(apiBase)) {
    const fixed = fixVercelPreviewUrl(apiBase)
    console.warn(`[レインズ照合] Preview URL検出 → 自動修正: ${apiBase} → ${fixed}`)
    // 修正後もまだPreviewか確認して、修正できていれば保存
    if (!isPreviewUrl(fixed)) {
      apiBase = fixed
      await chrome.storage.local.set({ apiBase: fixed })
    }
  }

  // ── 接続先URL表示 ─────────────────────────────────────────
  if (apiBase) {
    apiUrlBar.style.display = 'block'
    apiUrlText.textContent = apiBase
  }

  // ── URLが未設定 ───────────────────────────────────────────
  if (!apiBase) {
    mainContent.style.display = 'none'
    noConfig.style.display = 'block'
    pageStatusEl.textContent = '設定が必要です'
    pageStatusEl.className = 'warn'
    return
  }

  // ── Preview URLが残っている場合 → 送信ブロック ────────────
  if (isPreviewUrl(apiBase)) {
    previewUrlWarn.style.display = 'block'
    previewUrlWarn.innerHTML =
      `⚠ <strong>Preview URL検出 — このままではCORSエラーになります</strong><br>` +
      `現在: <code style="word-break:break-all">${apiBase}</code><br>` +
      `<a href="#" id="openOptionsFromWarn" style="color:#dc2626;font-weight:700;">▶ 設定を開いてURLを修正する</a>`

    document.getElementById('openOptionsFromWarn')?.addEventListener('click', e => {
      e.preventDefault()
      chrome.runtime.openOptionsPage()
    })

    // 送信ボタンを全部無効化
    addPageBtn.disabled = true
    openAppBtn.disabled = true
    pageStatusEl.textContent = '⚠ 設定を修正してください'
    pageStatusEl.className = 'warn'
    return
  }

  // ── 現在タブのURL確認 ───────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url ?? ''

  if (url.includes('reins.jp')) {
    pageStatusEl.textContent = '✓ レインズのページを検出しました'
    pageStatusEl.className = 'ok'
  } else {
    pageStatusEl.textContent = '⚠ レインズ以外のページです'
    pageStatusEl.className = 'warn'
  }

  // ── セッション状態UI ─────────────────────────────────────
  function updateSessionUI(count, id) {
    if (!count || count === 0) {
      sessionPanel.className = 'empty'
      sessionLabel.textContent = 'セッションなし'
      sessionLabel.className = 'session-label empty'
      sessionCount.textContent = '—'
      sessionCount.className = 'session-count empty'
      sessionHint.textContent = '「このページを追加」でセッションを開始'
      openAppBtn.disabled = true
      clearBtn.disabled = true
      stepHint.textContent = '複数ページを追加してからアプリで照合してください'
    } else {
      sessionPanel.className = ''
      sessionLabel.textContent = '取り込み中'
      sessionLabel.className = 'session-label'
      sessionCount.textContent = `${count}ページ`
      sessionCount.className = 'session-count'
      sessionHint.textContent = `セッション ID: ${(id ?? '').slice(0, 8)}...`
      openAppBtn.disabled = false
      clearBtn.disabled = false
      stepHint.textContent = '続けて次のページも追加できます'
    }
  }

  // 保存済みセッションの状態を確認
  if (sessionId) {
    try {
      const res = await fetch(`${apiBase}/api/reins/sessions/current`, {
        headers: token ? { 'x-extension-token': token } : {},
      })
      if (res.ok) {
        const data = await res.json()
        if (data.session?.id === sessionId) {
          updateSessionUI(data.session.page_count, sessionId)
        } else {
          sessionId = data.session?.id ?? null
          await chrome.storage.local.set({ sessionId })
          updateSessionUI(data.session?.page_count ?? 0, sessionId)
        }
      }
    } catch { /* ネットワークエラー → UI変更なし */ }
  }

  // ── このページを追加 ─────────────────────────────────────
  addPageBtn.addEventListener('click', async () => {
    addPageBtn.disabled = true
    addPageBtn.textContent = '送信中...'
    showResult('')

    try {
      // テーブル構造を維持して取得（body.innerTextではセル境界が失われるため）
      const [{ result: pageText }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            const tables = document.querySelectorAll('table')
            if (tables.length === 0) return document.body.innerText

            const rowParts = []
            for (const table of tables) {
              for (const tr of table.querySelectorAll('tr')) {
                const tds = Array.from(tr.querySelectorAll('td, th'))
                if (tds.length < 2) continue
                const cells = tds.map(td => td.innerText)
                if (cells.some(c => c.trim().length > 0)) {
                  rowParts.push(cells.join('\n__CELL__\n'))
                }
              }
            }

            if (rowParts.length === 0) return document.body.innerText
            return '__TABLE_FORMAT__\n' + rowParts.join('\n__ROW__\n')
          } catch (_e) {
            return document.body.innerText
          }
        },
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

      const res = await fetch(`${apiBase}/api/reins/import-page`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          text: pageText,
          page_url: pageUrl,
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        throw new Error(
          `APIの応答がHTMLです（HTTP ${res.status}）。\n` +
          `接続先: ${apiBase}/api/reins/import-page\n` +
          `デプロイ済みか・本番URLか確認してください。`
        )
      }

      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      sessionId = data.session_id
      await chrome.storage.local.set({ sessionId })

      updateSessionUI(data.page_count, sessionId)

      showResult(
        `✓ ${data.page_count}ページ目を追加しました\n` +
        (data.page_count >= 2
          ? '次のページへ移動して同様に追加できます。\n全ページ追加後、アプリで照合してください。'
          : 'さらに次のページも追加できます。'),
        'success'
      )
    } catch (e) {
      showResult(`エラー: ${e.message}`, 'error')
    } finally {
      addPageBtn.disabled = false
      addPageBtn.textContent = 'このページを追加'
    }
  })

  // ── アプリで照合する ─────────────────────────────────────
  openAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${apiBase}/reins-check` })
  })

  // ── セッションをクリア ────────────────────────────────────
  clearBtn.addEventListener('click', async () => {
    if (!sessionId) return
    if (!confirm(`${sessionCount.textContent}分のデータを削除しますか？`)) return

    clearBtn.disabled = true
    try {
      const headers = token ? { 'x-extension-token': token } : {}
      await fetch(`${apiBase}/api/reins/sessions/${sessionId}`, {
        method: 'DELETE', headers,
      })
    } catch { /* ignore */ }

    sessionId = null
    await chrome.storage.local.set({ sessionId: null })
    updateSessionUI(0, null)
    showResult('セッションをクリアしました', 'info')
  })

  function showResult(text, type = 'info') {
    if (!text) { resultEl.style.display = 'none'; return }
    resultEl.className = `result ${type}`
    resultEl.style.whiteSpace = 'pre-line'
    resultEl.textContent = text
    resultEl.style.display = 'block'
  }
})
