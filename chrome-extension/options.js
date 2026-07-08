document.addEventListener('DOMContentLoaded', () => {
  const apiBaseEl = document.getElementById('apiBase')
  const tokenEl = document.getElementById('token')
  const saveBtn = document.getElementById('save')
  const statusEl = document.getElementById('status')

  chrome.storage.local.get(['apiBase', 'token'], (data) => {
    if (data.apiBase) apiBaseEl.value = data.apiBase
    if (data.token) tokenEl.value = data.token
  })

  saveBtn.addEventListener('click', () => {
    const apiBase = apiBaseEl.value.trim().replace(/\/$/, '')
    const token = tokenEl.value.trim()
    if (!apiBase) {
      statusEl.textContent = 'URLを入力してください'
      statusEl.style.color = '#dc2626'
      return
    }
    chrome.storage.local.set({ apiBase, token }, () => {
      statusEl.textContent = '✓ 保存しました'
      statusEl.style.color = '#16a34a'
      setTimeout(() => { statusEl.textContent = '' }, 2000)
    })
  })
})
