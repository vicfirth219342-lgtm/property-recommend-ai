document.addEventListener('DOMContentLoaded', async () => {
  const pageStatusEl  = document.getElementById('pageStatus')
  const mainContent   = document.getElementById('mainContent')
  const noConfig      = document.getElementById('noConfig')
  const addPageBtn    = document.getElementById('addPageBtn')
  const openAppBtn    = document.getElementById('openAppBtn')
  const clearBtn      = document.getElementById('clearBtn')
  const resultEl      = document.getElementById('result')
  const sessionPanel  = document.getElementById('sessionPanel')
  const sessionLabel  = document.getElementById('sessionLabel')
  const sessionCount  = document.getElementById('sessionCount')
  const sessionHint   = document.getElementById('sessionHint')
  const stepHint      = document.getElementById('stepHint')

  document.getElementById('optionsLink').addEventListener('click', e => {
    e.preventDefault(); chrome.runtime.openOptionsPage()
  })
  document.getElementById('openOptions')?.addEventListener('click', e => {
    e.preventDefault(); chrome.runtime.openOptionsPage()
  })

  // 設定読み込み
  const stored = await chrome.storage.local.get(['apiBase', 'token', 'sessionId'])
  const token = stored.token ?? ''
  let apiBase = stored.apiBase ?? ''
  try { apiBase = new URL(apiBase).origin } catch { /* 不正URL */ }

  let sessionId = stored.sessionId ?? null

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

  // セッション状態を更新する関数
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
          // 別セッションが開いている、またはセッション終了済み
          sessionId = data.session?.id ?? null
          await chrome.storage.local.set({ sessionId })
          updateSessionUI(data.session?.page_count ?? 0, sessionId)
        }
      }
    } catch { /* ネットワークエラー → UIはデフォルトのまま */ }
  }

  // ─── このページを追加 ───────────────────────────────────────
  addPageBtn.addEventListener('click', async () => {
    addPageBtn.disabled = true
    addPageBtn.textContent = '送信中...'
    showResult('')

    try {
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
          `API応答がHTMLです（HTTP ${res.status}）。\n` +
          `Vercelへの最新コードのデプロイを確認してください。\n` +
          `送信先: ${apiBase}/api/reins/import-page`
        )
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      sessionId = data.session_id
      await chrome.storage.local.set({ sessionId })

      updateSessionUI(data.page_count, sessionId)

      showResult(
        `✓ ${data.page_count}ページ目を追加しました\n` +
        (data.page_count >= 2
          ? '次のページに移動して同様に追加できます。\n全ページ追加後、アプリで照合してください。'
          : '次のページも追加できます。'),
        'success'
      )
    } catch (e) {
      showResult(`エラー: ${e.message}`, 'error')
    } finally {
      addPageBtn.disabled = false
      addPageBtn.textContent = 'このページを追加'
    }
  })

  // ─── アプリで照合する ────────────────────────────────────────
  openAppBtn.addEventListener('click', () => {
    const appUrl = `${apiBase}/reins-check`
    chrome.tabs.create({ url: appUrl })
  })

  // ─── セッションをクリア ──────────────────────────────────────
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
