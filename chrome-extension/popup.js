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
  const stored = await chrome.storage.local.get(['apiBase', 'token', 'currentTask'])
  const token = stored.token ?? ''
  let apiBase = stored.apiBase ?? ''
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

  // ── 取り込み状態UI（ローカル管理） ──────────────────────────
  const importState = await chrome.storage.local.get(['importedTotal', 'importedPages'])
  let importedTotal = importState.importedTotal ?? 0
  let importedPages = importState.importedPages ?? 0

  function updateSessionUI() {
    if (importedTotal === 0) {
      sessionPanel.className = 'empty'
      sessionLabel.textContent = '未取り込み'
      sessionLabel.className = 'session-label empty'
      sessionCount.textContent = '—'
      sessionCount.className = 'session-count empty'
      sessionHint.textContent = '「このページを取り込む」で開始'
      openAppBtn.disabled = true
      clearBtn.disabled = true
      stepHint.textContent = '複数ページを追加してからアプリで照合してください'
    } else {
      sessionPanel.className = ''
      sessionLabel.textContent = '取り込み済み'
      sessionLabel.className = 'session-label'
      sessionCount.textContent = `${importedPages}ページ / ${importedTotal}件`
      sessionCount.className = 'session-count'
      sessionHint.textContent = '続けて次のページも取り込めます'
      openAppBtn.disabled = false
      clearBtn.disabled = false
      stepHint.textContent = '物件一覧で顧客との照合を確認してください'
    }
  }

  updateSessionUI()

  // ── フォーム解析モード ────────────────────────────────────────
  const analyzeFormBtn  = document.getElementById('analyzeFormBtn')
  const analyzeResultEl = document.getElementById('analyzeResult')

  analyzeFormBtn.addEventListener('click', async () => {
    analyzeFormBtn.disabled = true
    analyzeFormBtn.textContent = '解析中...'
    analyzeResultEl.style.display = 'none'

    try {
      const [{ result: analysis }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // ─────────────────────────────────────────────────────
          // レインズ フォーム解析スクリプト
          // Vue.js/Nuxt.js SPA 対応: name属性なし・__BVID__IDを前提
          // ─────────────────────────────────────────────────────

          function getLabel(el) {
            // 1. HTML labels属性
            if (el.labels?.[0]) return el.labels[0].innerText.trim()
            // 2. aria-label
            const aria = el.getAttribute('aria-label')
            if (aria) return aria
            // 3. aria-labelledby
            const lbId = el.getAttribute('aria-labelledby')
            if (lbId) {
              const lb = document.getElementById(lbId)
              if (lb) return lb.innerText.trim()
            }
            // 4. 親要素を5段階まで遡ってラベルを探す
            let p = el.parentElement
            for (let i = 0; i < 6; i++) {
              if (!p) break
              // label 要素（入力要素を含まないもの）
              for (const lb of p.querySelectorAll('label, .p-form-label, [class*="-label"], dt, th')) {
                if (!lb.contains(el) && lb.innerText.trim()) return lb.innerText.trim()
              }
              p = p.parentElement
            }
            return null
          }

          function getCssPath(el) {
            const parts = []
            let cur = el
            for (let i = 0; i < 5; i++) {
              if (!cur || cur === document.body) break
              let part = cur.tagName.toLowerCase()
              if (cur.id && !cur.id.startsWith('__BVID__')) part += `#${cur.id}`
              const stableClasses = Array.from(cur.classList)
                .filter(c => !c.match(/^(nuxt|v-|__)/))
                .slice(0, 3)
              if (stableClasses.length) part += `.${stableClasses.join('.')}`
              parts.unshift(part)
              cur = cur.parentElement
            }
            return parts.join(' > ')
          }

          function getVueProp(el) {
            // Vue 2 (__vue__) / Vue 3 (__vueParentComponent) の両方を試みる
            try {
              let v = el.__vue__ || el._vei
              if (!v && el.__vueParentComponent) {
                const comp = el.__vueParentComponent
                const props = comp.props || {}
                const data = comp.setupState || comp.data?.() || {}
                return JSON.stringify({ props, data }).slice(0, 200)
              }
              if (v && v.$props) return JSON.stringify(v.$props).slice(0, 200)
            } catch (e) { /* ignore */ }
            return null
          }

          const elements = []
          document.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => {
            const label = getLabel(el)
            const cssPath = getCssPath(el)
            const vueProp = getVueProp(el)

            const info = {
              tag: el.tagName.toLowerCase(),
              type: el.getAttribute('type') || (el.tagName === 'SELECT' ? 'select' : null),
              id: el.id && !el.id.startsWith('__BVID__') ? el.id : null,
              bvid: el.id?.startsWith('__BVID__') ? el.id : null,
              name: el.name || null,
              label: label,
              currentValue: el.value || null,
              checked: el.type === 'checkbox' || el.type === 'radio' ? el.checked : undefined,
              cssPath,
              vueProp,
            }

            if (el.tagName === 'SELECT') {
              info.options = Array.from(el.options).map(o => ({
                text: o.text.trim(),
                value: o.value,
                selected: o.selected,
              }))
            }
            if (el.tagName === 'BUTTON') {
              info.text = el.innerText.trim()
            }
            elements.push(info)
          })

          // コンソール出力（ページのコンソールに表示）
          console.group('[レインズ照合] フォーム解析結果')
          console.log('URL:', window.location.href)
          console.log('要素数:', elements.length)
          console.table(elements.map(({ tag, type, label, id, bvid, name, currentValue, cssPath }) =>
            ({ tag, type, label, id, bvid, name, currentValue, cssPath: cssPath?.slice(-60) })
          ))
          elements.filter(e => e.tag === 'select').forEach(e => {
            console.log(`\n【SELECT】label="${e.label}" bvid="${e.bvid}"`)
            console.table(e.options)
          })
          console.log('\n=== JSON (コピー用) ===')
          console.log(JSON.stringify(elements, null, 2))
          console.groupEnd()

          // サマリーをポップアップへ返す
          const selects  = elements.filter(e => e.tag === 'select')
          const inputs   = elements.filter(e => e.tag === 'input')
          const buttons  = elements.filter(e => e.tag === 'button')
          return {
            url: window.location.href,
            total: elements.length,
            selects: selects.length,
            inputs: inputs.length,
            buttons: buttons.length,
            labels: elements.map(e => e.label).filter(Boolean),
            selectSummary: selects.map(e => ({
              label: e.label,
              bvid: e.bvid,
              optionCount: e.options?.length,
              firstOptions: e.options?.slice(0, 4).map(o => `${o.text}(${o.value})`).join(' / '),
            })),
            buttonTexts: buttons.map(e => e.text).filter(Boolean),
          }
        },
      })

      if (!analysis) throw new Error('解析結果が取得できませんでした')

      // ポップアップに結果を表示
      const lines = [
        `✓ 解析完了: 計${analysis.total}要素`,
        `  select: ${analysis.selects}個  input: ${analysis.inputs}個  button: ${analysis.buttons}個`,
        `URL: ${analysis.url.split('/').slice(-2).join('/')}`,
        '',
        '▼ 検出したラベル:',
        ...([...new Set(analysis.labels)].map(l => `  ・${l}`)),
        '',
        '▼ SELECTの内容:',
        ...(analysis.selectSummary.map(s =>
          `  [${s.label ?? 'label不明'}] ${s.optionCount}件: ${s.firstOptions ?? ''}...`
        )),
        '',
        '▼ ボタン:',
        ...(analysis.buttonTexts.map(t => `  ・${t}`)),
        '',
        '詳細はページのコンソール(F12)を確認してください。',
      ]
      analyzeResultEl.textContent = lines.join('\n')
      analyzeResultEl.style.display = 'block'
      analyzeResultEl.style.background = '#f0fdf4'
      analyzeResultEl.style.borderColor = '#86efac'
      analyzeResultEl.style.color = '#15803d'

    } catch (e) {
      analyzeResultEl.textContent = `エラー: ${e.message}\nレインズのページをリロードして再試行してください。`
      analyzeResultEl.style.display = 'block'
      analyzeResultEl.style.background = '#fef2f2'
      analyzeResultEl.style.borderColor = '#fca5a5'
      analyzeResultEl.style.color = '#dc2626'
    } finally {
      analyzeFormBtn.disabled = false
      analyzeFormBtn.textContent = 'このページのフォームを解析する'
    }
  })

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

      // 新・横断照合フロー: 取込 → 抽出 → reins_imported_properties に保存
      const res = await fetch(`${apiBase}/api/reins/import`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: pageText, page_url: pageUrl }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        throw new Error(`APIの応答がHTMLです（HTTP ${res.status}）。接続先: ${apiBase}`)
      }

      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      importedTotal += data.imported_count
      importedPages += 1
      await chrome.storage.local.set({ importedTotal, importedPages })
      updateSessionUI()

      showResult(
        `✓ ${data.imported_count}件の物件を取り込みました（抽出 ${data.extracted_count}件）\n` +
        `累計: ${importedPages}ページ / ${importedTotal}件\n` +
        `続けて次のページも取り込めます。`,
        'success'
      )
    } catch (e) {
      showResult(`エラー: ${e.message}`, 'error')
    } finally {
      addPageBtn.disabled = false
      addPageBtn.textContent = 'このページを取り込む'
    }
  })

  // ── アプリで照合する ─────────────────────────────────────────
  openAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${apiBase}/properties` })
  })

  // ── セッションをクリア ────────────────────────────────────────
  clearBtn.addEventListener('click', async () => {
    if (!confirm('取り込みカウントをリセットしますか？')) return
    clearBtn.disabled = true
    importedTotal = 0
    importedPages = 0
    await chrome.storage.local.set({ importedTotal: 0, importedPages: 0 })
    updateSessionUI()
    showResult('取り込みカウントをクリアしました', 'info')
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
