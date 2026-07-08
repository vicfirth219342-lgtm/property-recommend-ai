document.addEventListener('DOMContentLoaded', () => {
  const apiBaseEl = document.getElementById('apiBase')
  const tokenEl   = document.getElementById('token')
  const saveBtn   = document.getElementById('save')
  const statusEl  = document.getElementById('status')
  const warningEl = document.getElementById('previewWarning')
  const fixBtn    = document.getElementById('fixBtn')

  // Vercel Preview URL を本番URLへ変換する
  // 例: https://project-git-main-team.vercel.app → https://project-team.vercel.app
  function fixVercelPreviewUrl(url) {
    return url.replace(/-git-[a-z0-9]+(-[a-z0-9])/i, '$1')
              .replace(/-git-[a-z0-9]+\./i, '.')  // チームなしの場合
  }

  function isPreviewUrl(url) {
    return /-git-[a-z0-9]+[-\.]/i.test(url)
  }

  function showPreviewWarning(currentUrl, fixedUrl) {
    if (warningEl) {
      warningEl.style.display = 'block'
      warningEl.innerHTML =
        `⚠ Preview URLはCORSエラーの原因になります。<br>` +
        `現在: <code>${currentUrl}</code><br>` +
        `推奨: <code>${fixedUrl}</code>`
    }
    if (fixBtn) {
      fixBtn.style.display = 'inline-block'
      fixBtn.onclick = () => {
        apiBaseEl.value = fixedUrl
        if (warningEl) warningEl.style.display = 'none'
        fixBtn.style.display = 'none'
      }
    }
  }

  chrome.storage.local.get(['apiBase', 'token'], (data) => {
    if (data.apiBase) {
      apiBaseEl.value = data.apiBase
      if (isPreviewUrl(data.apiBase)) {
        showPreviewWarning(data.apiBase, fixVercelPreviewUrl(data.apiBase))
      }
    }
    if (data.token) tokenEl.value = data.token
  })

  // 入力中もリアルタイムで警告
  apiBaseEl.addEventListener('input', () => {
    const val = apiBaseEl.value.trim()
    if (isPreviewUrl(val)) {
      showPreviewWarning(val, fixVercelPreviewUrl(val))
    } else if (warningEl) {
      warningEl.style.display = 'none'
      if (fixBtn) fixBtn.style.display = 'none'
    }
  })

  saveBtn.addEventListener('click', () => {
    let apiBase = apiBaseEl.value.trim().replace(/\/$/, '')
    try { apiBase = new URL(apiBase).origin } catch { /* そのまま */ }

    if (!apiBase) {
      statusEl.textContent = 'URLを入力してください'
      statusEl.style.color = '#dc2626'
      return
    }

    // Preview URLのまま保存しようとしたら自動修正
    if (isPreviewUrl(apiBase)) {
      const fixed = fixVercelPreviewUrl(apiBase)
      if (confirm(`Preview URLが検出されました。\n本番URL\n${fixed}\nに自動修正して保存しますか？`)) {
        apiBase = fixed
        apiBaseEl.value = fixed
        if (warningEl) warningEl.style.display = 'none'
        if (fixBtn) fixBtn.style.display = 'none'
      }
    }

    const token = tokenEl.value.trim()
    chrome.storage.local.set({ apiBase, token }, () => {
      statusEl.textContent = `✓ 保存しました: ${apiBase}`
      statusEl.style.color = '#16a34a'
      setTimeout(() => { statusEl.textContent = '' }, 3000)
    })
  })
})
