document.addEventListener('DOMContentLoaded', () => {
  const apiBaseEl      = document.getElementById('apiBase')
  const tokenEl        = document.getElementById('token')
  const saveBtn        = document.getElementById('save')
  const resetBtn       = document.getElementById('resetBtn')
  const statusEl       = document.getElementById('status')
  const warningEl      = document.getElementById('previewWarning')
  const fixBtn         = document.getElementById('fixBtn')
  const currentUrlBox  = document.getElementById('currentUrlBox')
  const currentUrlDisp = document.getElementById('currentUrlDisplay')

  function isPreviewUrl(url) {
    return /-git-[a-z0-9][-a-z0-9]*[-\.]/i.test(url)
  }

  // Preview URL → 本番URL変換
  // 例: https://property-recommend-ai-git-main-kiyo-s-projects1413.vercel.app
  //   → https://property-recommend-ai-kiyo-s-projects1413.vercel.app
  function fixVercelPreviewUrl(url) {
    // "-git-BRANCH-" パターン（後にチームスラッグが続く場合）
    const fixed = url.replace(/-git-[a-z0-9][a-z0-9-]*?-([a-z0-9][a-z0-9-]*\.vercel\.app)/i, '-$1')
    if (fixed !== url) return fixed
    // "-git-BRANCH." パターン（チームなし）
    return url.replace(/-git-[a-z0-9][a-z0-9-]*\./i, '.')
  }

  function showPreviewWarning(currentUrl, fixedUrl) {
    if (warningEl) {
      warningEl.style.display = 'block'
      warningEl.innerHTML =
        `⚠ <strong>Preview URLはCORSエラーの原因です。</strong><br>` +
        `現在保存: <code>${currentUrl}</code><br>` +
        `修正後: <code>${fixedUrl}</code>`
    }
    if (fixBtn) {
      fixBtn.style.display = 'inline-block'
      fixBtn.onclick = () => {
        apiBaseEl.value = fixedUrl
        warningEl.style.display = 'none'
        fixBtn.style.display = 'none'
        statusEl.textContent = '▲ URLを修正しました。「保存」を押して確定してください。'
        statusEl.style.color = '#b45309'
      }
    }
  }

  // ── 現在の設定を読み込む ──────────────────────────────────
  chrome.storage.local.get(['apiBase', 'token'], (data) => {
    const savedUrl = data.apiBase ?? ''
    const savedToken = data.token ?? ''

    if (savedUrl) {
      apiBaseEl.value = savedUrl
      if (currentUrlBox) {
        currentUrlBox.style.display = 'block'
        currentUrlDisp.textContent = savedUrl
      }
      if (isPreviewUrl(savedUrl)) {
        showPreviewWarning(savedUrl, fixVercelPreviewUrl(savedUrl))
      }
    }
    if (savedToken) tokenEl.value = savedToken
  })

  // 入力中リアルタイム警告
  apiBaseEl.addEventListener('input', () => {
    const val = apiBaseEl.value.trim()
    if (isPreviewUrl(val)) {
      showPreviewWarning(val, fixVercelPreviewUrl(val))
    } else if (warningEl) {
      warningEl.style.display = 'none'
      if (fixBtn) fixBtn.style.display = 'none'
    }
  })

  // ── 保存 ──────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    let apiBase = apiBaseEl.value.trim().replace(/\/$/, '')
    try { apiBase = new URL(apiBase).origin } catch { /* そのまま */ }

    if (!apiBase) {
      statusEl.textContent = 'URLを入力してください'
      statusEl.style.color = '#dc2626'
      return
    }

    // Preview URLのまま保存しようとしたら自動修正して確認
    if (isPreviewUrl(apiBase)) {
      const fixed = fixVercelPreviewUrl(apiBase)
      if (confirm(
        `⚠ Preview URLが検出されました。\n\n` +
        `現在: ${apiBase}\n` +
        `修正: ${fixed}\n\n` +
        `本番URL (${fixed}) に自動修正して保存しますか？`
      )) {
        apiBase = fixed
        apiBaseEl.value = fixed
        if (warningEl) warningEl.style.display = 'none'
        if (fixBtn) fixBtn.style.display = 'none'
      } else {
        statusEl.textContent = 'Preview URLはCORSエラーの原因になります'
        statusEl.style.color = '#dc2626'
        return
      }
    }

    const token = tokenEl.value.trim()
    chrome.storage.local.set({ apiBase, token }, () => {
      statusEl.textContent = `✓ 保存しました: ${apiBase}`
      statusEl.style.color = '#16a34a'
      if (currentUrlBox) {
        currentUrlBox.style.display = 'block'
        currentUrlDisp.textContent = apiBase
      }
      setTimeout(() => { statusEl.textContent = '' }, 4000)
    })
  })

  // ── 設定をリセット ────────────────────────────────────────
  resetBtn.addEventListener('click', () => {
    if (!confirm(
      '設定をリセットします。\n\n' +
      '保存済みのAPIキー・セッションIDが全て削除されます。\n' +
      '続けますか？'
    )) return

    chrome.storage.local.clear(() => {
      apiBaseEl.value = ''
      tokenEl.value = ''
      if (warningEl) warningEl.style.display = 'none'
      if (fixBtn) fixBtn.style.display = 'none'
      if (currentUrlBox) currentUrlBox.style.display = 'none'
      statusEl.textContent = '✓ 設定をリセットしました。本番URLを再入力して保存してください。'
      statusEl.style.color = '#1d4ed8'
    })
  })
})
