import JSZip from 'jszip'

// ZIP安全制限（実行環境に合わせて調整可）
export const ZIP_LIMITS = {
  maxZipBytes: 50 * 1024 * 1024,        // アップロードZIP容量上限: 50MB
  maxTotalExtractedBytes: 200 * 1024 * 1024, // 展開後合計上限: 200MB
  maxHtmlFiles: 200,                    // HTMLファイル数上限
  maxSingleHtmlBytes: 5 * 1024 * 1024,  // 1HTMLあたりの容量上限: 5MB
  maxCompressionRatio: 100,             // 展開後/圧縮前 の比率上限（ZIP爆弾対策）
}

export interface ExtractedHtmlFile {
  fileName: string
  html: string
}

export interface ZipExtractError {
  code:
    | 'zip_too_large' | 'too_many_files' | 'file_too_large' | 'total_too_large'
    | 'nested_zip' | 'encrypted_zip' | 'compression_bomb' | 'path_traversal' | 'invalid_zip'
  message: string
}

function isPathSafe(name: string): boolean {
  if (name.includes('\0')) return false
  const normalized = name.replace(/\\/g, '/')
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return false
  const parts = normalized.split('/')
  if (parts.includes('..')) return false
  return true
}

export async function extractHtmlFromZip(
  zipBuffer: Buffer,
): Promise<{ ok: true; files: ExtractedHtmlFile[] } | { ok: false; error: ZipExtractError }> {
  if (zipBuffer.byteLength > ZIP_LIMITS.maxZipBytes) {
    return { ok: false, error: { code: 'zip_too_large', message: `ZIPファイルが上限(${ZIP_LIMITS.maxZipBytes / 1024 / 1024}MB)を超えています` } }
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(zipBuffer)
  } catch {
    return { ok: false, error: { code: 'invalid_zip', message: 'ZIPファイルを読み込めませんでした' } }
  }

  const entries = Object.values(zip.files).filter((e) => !e.dir)

  // 入れ子ZIP禁止
  if (entries.some((e) => /\.zip$/i.test(e.name))) {
    return { ok: false, error: { code: 'nested_zip', message: 'ZIP内にZIPが含まれています（入れ子ZIPは禁止）' } }
  }

  // path traversal対策
  if (entries.some((e) => !isPathSafe(e.name))) {
    return { ok: false, error: { code: 'path_traversal', message: '不正なパスを含むエントリが検出されました' } }
  }

  const htmlEntries = entries.filter((e) => /\.html?$/i.test(e.name))
  if (htmlEntries.length > ZIP_LIMITS.maxHtmlFiles) {
    return { ok: false, error: { code: 'too_many_files', message: `HTMLファイル数が上限(${ZIP_LIMITS.maxHtmlFiles}件)を超えています` } }
  }

  // 圧縮率チェック（ZIP爆弾対策）: 各エントリの圧縮後サイズと展開後サイズの比を確認
  let totalExtracted = 0
  const files: ExtractedHtmlFile[] = []

  for (const entry of htmlEntries) {
    // JSZipは暗号化ZIPをそのまま読める場合があるため、複合フラグで判定
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isEncrypted = (entry as any)._data?.crypto === true || (entry as any).options?.password
    if (isEncrypted) {
      return { ok: false, error: { code: 'encrypted_zip', message: '暗号化ZIPは非対応です' } }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalData = (entry as any)._data
    const compressedSize: number = internalData?.compressedSize ?? 0
    const uncompressedSize: number = internalData?.uncompressedSize ?? 0
    if (compressedSize > 0 && uncompressedSize / compressedSize > ZIP_LIMITS.maxCompressionRatio) {
      return { ok: false, error: { code: 'compression_bomb', message: `異常な圧縮率のファイルを検出しました（${entry.name}）` } }
    }
    if (uncompressedSize > ZIP_LIMITS.maxSingleHtmlBytes) {
      return { ok: false, error: { code: 'file_too_large', message: `${entry.name} が1ファイルの上限(${ZIP_LIMITS.maxSingleHtmlBytes / 1024 / 1024}MB)を超えています` } }
    }

    totalExtracted += uncompressedSize
    if (totalExtracted > ZIP_LIMITS.maxTotalExtractedBytes) {
      return { ok: false, error: { code: 'total_too_large', message: `展開後の合計サイズが上限(${ZIP_LIMITS.maxTotalExtractedBytes / 1024 / 1024}MB)を超えています` } }
    }

    const html = await entry.async('string')
    files.push({ fileName: entry.name, html })
  }

  return { ok: true, files }
}
