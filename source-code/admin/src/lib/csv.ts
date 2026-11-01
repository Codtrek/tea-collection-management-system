/*
  CSV export of whatever a list is currently showing (all filtered rows, not just the page).
  `toCsv` is pure (tested); `downloadCsv` hands the text to the browser as a file.
*/

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

const cell = (v: string | number | null | undefined): string => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(',')]
  for (const r of rows) lines.push(columns.map((c) => cell(c.value(r))).join(','))
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, text: string): void {
  // BOM so Excel reads "Rs." and names with non-ASCII characters correctly
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
