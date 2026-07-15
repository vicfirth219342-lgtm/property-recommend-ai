// ── ユーティリティ ────────────────────────────────────────────

function isPreviewUrl(url) {
  return /-git-[a-z0-9][-a-z0-9]*[-\.]/i.test(url)
}

function fixVercelPreviewUrl(url) {
  const fixed = url.replace(/-git-[a-z0-9][a-z0-9-]*?-([a-z0-9][a-z0-9-]*\.vercel\.app)/i, '-$1')
  if (fixed !== url) return fixed
  return url.replace(/-git-[a-z0-9][a-z0-9-]*\./i, '.')
}

const TX_LABEL = { sale: '売買', rent: '賃貸' }

function condVal(v) {
  if (v == null || v === '') return { text: '未設定', empty: true }
  return { text: String(v), empty: false }
}

// ── タブ切り替え ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById(btn.dataset.tab).classList.add('active')
  })
})

document.addEventListener('DOMContentLoaded', async () => {
  // ── 共通要素 ────────────────────────────────────────────────
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

  // ── レインズ検索タブ要素 ────────────────────────────────────
  const fetchTaskBtn  = document.getElementById('fetchTaskBtn')
  const fillFormBtn   = document.getElementById('fillFormBtn')
  const taskPanel     = document.getElementById('taskPanel')
  const taskLabel     = document.getElementById('taskLabel')
  const taskCondGrid  = document.getElementById('taskCondGrid')
  const taskResultEl  = document.getElementById('taskResult')

  document.getElementById('optionsLink').addEventListener('click', e => {
    e.preventDefault(); chrome.runtime.openOptionsPage()
  })
  document.getElementById('openOptions')?.addEventListener('click', e => {
    e.preventDefault(); chrome.runtime.openOptionsPage()
  })

  // ── 設定読み込み ──────────────────────────────────────────
  const stored = await chrome.storage.local.get(['apiBase', 'token', 'sessionId', 'currentTask'])
  const token = stored.token ?? ''
  let apiBase = stored.apiBase ?? ''
  let sessionId = stored.sessionId ?? null
  let currentTask = stored.currentTask ?? null

  try { apiBase = new URL(apiBase).origin } catch { /* 不正URL */ }

  if (apiBase && isPreviewUrl(apiBase)) {
    const fixed = fixVercelPreviewUrl(apiBase)
    if (!isPreviewUrl(fixed)) {
      apiBase = fixed
      await chrome.storage.local.set({ apiBase: fixed })
    }
  }

  if (apiBase) {
    apiUrlBar.style.display = 'block'
    apiUrlText.textContent = apiBase
  }

  if (!apiBase) {
    mainContent.style.display = 'none'
    noConfig.style.display = 'block'
    pageStatusEl.textContent = '設定が必要です'
    pageStatusEl.className = 'warn'
    return
  }

  if (isPreviewUrl(apiBase)) {
    previewUrlWarn.style.display = 'block'
    previewUrlWarn.innerHTML =
      `⚠ <strong>Preview URL検出 — CORSエラーになります</strong><br>` +
      `<a href="#" id="openOptionsFromWarn" style="color:#dc2626;font-weight:700;">▶ 設定を開いて修正する</a>`
    document.getElementById('openOptionsFromWarn')?.addEventListener('click', e => {
      e.preventDefault(); chrome.runtime.openOptionsPage()
    })
    addPageBtn.disabled = true
    openAppBtn.disabled = true
    fetchTaskBtn.disabled = true
    pageStatusEl.textContent = '⚠ 設定を修正してください'
    pageStatusEl.className = 'warn'
    return
  }

  // ── 現在タブのURL確認 ─────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url ?? ''

  if (url.includes('reins.jp')) {
    pageStatusEl.textContent = '✓ レインズのページを検出しました'
    pageStatusEl.className = 'ok'
  } else {
    pageStatusEl.textContent = '⚠ レインズ以外のページです'
    pageStatusEl.className = 'warn'
  }

  // ── セッション状態UI（取り込みモード） ──────────────────────
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

  // 保存済みセッションの状態確認
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
    } catch { /* ignore */ }
  }

  // ── タスクUI（レインズ検索タブ） ────────────────────────────
  function updateTaskUI(task) {
    if (!task) {
      taskPanel.className = ''
      taskLabel.textContent = '顧客条件が未受信です'
      taskLabel.className = 'task-label empty'
      taskCondGrid.style.display = 'none'
      taskCondGrid.innerHTML = ''
      fillFormBtn.disabled = true
      return
    }

    taskPanel.className = 'has-task'
    taskLabel.textContent = `${task.customer_name} さんの条件`
    taskLabel.className = 'task-label'
    taskCondGrid.style.display = 'grid'

    const isSale = task.transaction_type !== 'rent'
    const rows = [
      ['売買/賃貸', TX_LABEL[task.transaction_type] ?? task.transaction_type],
      ['物件種別',  task.property_type],
      ['エリア',    task.area],
      isSale
        ? ['価格', [task.budget_min ? `${task.budget_min}万〜` : '', task.budget_max ? `${task.budget_max}万` : '上限なし'].filter(Boolean).join('')]
        : ['賃料', [task.rent_min ? `${task.rent_min}万〜` : '', task.rent_max ? `${task.rent_max}万` : '上限なし'].filter(Boolean).join('')],
      ['面積下限',  task.area_sqm_min     != null ? `${task.area_sqm_min}㎡` : null],
      ['駅徒歩',    task.walk_minutes_max != null ? `${task.walk_minutes_max}分以内` : null],
      ['築年数',    task.building_age_max != null ? `${task.building_age_max}年以内` : null],
    ]

    taskCondGrid.innerHTML = rows.map(([k, v]) => {
      const { text, empty } = condVal(v)
      return `<span class="cond-key">${k}</span><span class="cond-val${empty ? ' empty' : ''}">${text}</span>`
    }).join('')

    fillFormBtn.disabled = false
  }

  // 保存済みタスクを表示
  updateTaskUI(currentTask)

  // ── 「最新の顧客条件を受け取る」 ────────────────────────────
  fetchTaskBtn.addEventListener('click', async () => {
    fetchTaskBtn.disabled = true
    fetchTaskBtn.textContent = '取得中...'
    showTaskResult('', '')

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-extension-token'] = token

      const res = await fetch(`${apiBase}/api/reins/search-task`, { headers })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      if (!data.task) {
        showTaskResult('待機中のタスクがありません。\nWebアプリの顧客詳細画面で「レインズで物件探索」を押してください。', 'info')
        updateTaskUI(null)
        await chrome.storage.local.set({ currentTask: null })
      } else {
        currentTask = data.task
        await chrome.storage.local.set({ currentTask })
        updateTaskUI(currentTask)
        showTaskResult(
          `✓ ${data.task.customer_name} さんの条件を受け取りました\n` +
          `タスクID: ${data.task.id.slice(0, 8)}...`,
          'success'
        )
      }
    } catch (e) {
      showTaskResult(`エラー: ${e.message}`, 'error')
    } finally {
      fetchTaskBtn.disabled = false
      fetchTaskBtn.textContent = '最新の顧客条件を受け取る'
    }
  })

  // ── 「フォームに条件を入力する」 ────────────────────────────
  fillFormBtn.addEventListener('click', async () => {
    if (!currentTask) return
    fillFormBtn.disabled = true
    fillFormBtn.textContent = '送信中...'
    showTaskResult('', '')

    // レインズページかチェック
    if (!url.includes('reins.jp')) {
      showTaskResult(
        '⚠ 現在のタブはレインズのページではありません。\n' +
        'system.reins.jp を開いてから再度クリックしてください。',
        'error'
      )
      fillFormBtn.disabled = false
      fillFormBtn.textContent = 'フォームに条件を入力する（第1段階: コンソール表示）'
      return
    }

    try {
      // content.js へ条件を送信
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'REINS_FILL_FORM',
        task: currentTask,
      })

      console.log('[popup] content.js からの応答:', response)

      if (response?.ok) {
        const phase = response.phase === 1
          ? '第1段階: 条件をコンソールに表示しました'
          : `第2段階: ${response.filled?.length ?? 0}フィールドに入力しました`

        const skipped = response.skipped?.length
          ? `\nスキップ: ${response.skipped.join(', ')}`
          : ''
        const errors = response.errors?.length
          ? `\nエラー: ${response.errors.join(', ')}`
          : ''

        showTaskResult(
          `✓ ${phase}${skipped}${errors}\n\n` +
          `ページのコンソール（F12）で条件を確認できます。\n` +
          `URL: ${response.url?.slice(0, 60)}...`,
          'success'
        )
      } else {
        showTaskResult(`失敗: ${response?.reason ?? '不明なエラー'}`, 'error')
      }
    } catch (e) {
      // content.js が読み込まれていない場合
      if (e.message?.includes('Could not establish connection')) {
        showTaskResult(
          'content.js が接続できません。\n' +
          'レインズのページをリロードしてから再試行してください。\n\n' +
          `エラー: ${e.message}`,
          'error'
        )
      } else {
        showTaskResult(`エラー: ${e.message}`, 'error')
      }
    } finally {
      fillFormBtn.disabled = false
      fillFormBtn.textContent = 'フォームに条件を入力する（第1段階: コンソール表示）'
    }
  })

  // ── 「このページを追加」 ─────────────────────────────────────
  addPageBtn.addEventListener('click', async () => {
    addPageBtn.disabled = true
    addPageBtn.textContent = '送信中...'
    showResult('')

    try {
      const [{ result: pageText }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            const gridRows = document.querySelectorAll('.p-table-body-row')
            if (gridRows.length > 0) {
              const getColStart = (el) => {
                const gc = el.style.gridColumn || el.style.gridColumnStart || ''
                const m = gc.match(/(\d+)/)
                return m ? parseInt(m[1]) : 999
              }
              const getRowStart = (el) => {
                const gr = el.style.gridRow || el.style.gridRowStart || ''
                const m = gr.match(/(\d+)/)
                return m ? parseInt(m[1]) : 0
              }
              const rowParts = []
              for (const row of gridRows) {
                const items = Array.from(row.querySelectorAll('.p-table-body-item'))
                const colMap = new Map()
                for (const item of items) {
                  const col = getColStart(item)
                  const rowNum = getRowStart(item)
                  const text = item.innerText.trim()
                  if (!text) continue
                  if (!colMap.has(col)) colMap.set(col, [])
                  colMap.get(col).push({ rowNum, text })
                }
                const sortedCols = Array.from(colMap.entries()).sort((a, b) => a[0] - b[0])
                const cells = sortedCols.map(([, entries]) =>
                  entries.sort((a, b) => a.rowNum - b.rowNum).map(e => e.text).join('\n')
                )
                if (cells.some(c => c.trim())) rowParts.push(cells.join('\n__CELL__\n'))
              }
              if (rowParts.length > 0) return '__TABLE_FORMAT__\n' + rowParts.join('\n__ROW__\n')
            }
            const tables = document.querySelectorAll('table')
            if (tables.length > 0) {
              const rowParts = []
              for (const table of tables) {
                for (const tr of table.querySelectorAll('tr')) {
                  const tds = Array.from(tr.querySelectorAll('td, th'))
                  if (tds.length < 2) continue
                  const cells = tds.map(td => td.innerText)
                  if (cells.some(c => c.trim().length > 0)) rowParts.push(cells.join('\n__CELL__\n'))
                }
              }
              if (rowParts.length > 0) return '__TABLE_FORMAT__\n' + rowParts.join('\n__ROW__\n')
            }
            return document.body.innerText
          } catch (_e) { return document.body.innerText }
        },
      })
      const [{ result: pageUrl }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.location.href,
      })

      if (!pageText || pageText.trim().length < 20) {
        throw new Error('ページテキストが取得できませんでした')
      }

      const isTableFormat = pageText.startsWith('__TABLE_FORMAT__')
      console.log('[DEBUG] 送信直前:', { isTableFormat, length: pageText.length, preview: pageText.slice(0, 400) })
      showResult(
        `[DEBUG] ① 送信直前の生データ\n形式: ${isTableFormat ? 'TABLE形式 ✓' : 'フラットテキスト'}\n総文字数: ${pageText.length}\n---先頭400文字---\n${pageText.slice(0, 400)}`,
        'info'
      )
      await new Promise(r => setTimeout(r, 100))

      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['x-extension-token'] = token

      const res = await fetch(`${apiBase}/api/reins/import-page`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ session_id: sessionId, text: pageText, page_url: pageUrl }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        throw new Error(`APIの応答がHTMLです（HTTP ${res.status}）。接続先: ${apiBase}`)
      }

      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      sessionId = data.session_id
      await chrome.storage.local.set({ sessionId })
      updateSessionUI(data.page_count, sessionId)

      showResult(
        `✓ ${data.page_count}ページ目を追加しました\n` +
        (data.page_count >= 2 ? '次のページへ移動して同様に追加できます。' : 'さらに次のページも追加できます。'),
        'success'
      )
    } catch (e) {
      showResult(`エラー: ${e.message}`, 'error')
    } finally {
      addPageBtn.disabled = false
      addPageBtn.textContent = 'このページを追加'
    }
  })

  // ── アプリで照合する ─────────────────────────────────────────
  openAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${apiBase}/reins-check` })
  })

  // ── セッションをクリア ────────────────────────────────────────
  clearBtn.addEventListener('click', async () => {
    if (!sessionId) return
    if (!confirm(`${sessionCount.textContent}分のデータを削除しますか？`)) return
    clearBtn.disabled = true
    try {
      const headers = token ? { 'x-extension-token': token } : {}
      await fetch(`${apiBase}/api/reins/sessions/${sessionId}`, { method: 'DELETE', headers })
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

  function showTaskResult(text, type = 'info') {
    if (!text) { taskResultEl.style.display = 'none'; return }
    taskResultEl.className = `result ${type}`
    taskResultEl.style.whiteSpace = 'pre-line'
    taskResultEl.textContent = text
    taskResultEl.style.display = 'block'
  }
})
