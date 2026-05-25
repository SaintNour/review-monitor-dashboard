export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) {
    // still download an empty file with headers if possible
    const blob = new Blob([''], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(filename, blob)
    return
  }

  const headers = Object.keys(rows[0])

  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    // wrap in quotes if contains comma/newline/quotes
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(filename, blob)
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
