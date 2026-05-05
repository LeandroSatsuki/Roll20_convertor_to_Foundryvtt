import * as XLSX from 'xlsx'

export function createWorkbookData(
  sheets: Array<{ name: string; rows: string[][]; hidden?: boolean; veryHidden?: boolean; merges?: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> }>,
  options: { namedRanges?: Array<{ name: string; ref: string; sheetIndex?: number }> } = {},
): Uint8Array {
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows)
    if (sheet.merges) worksheet['!merges'] = sheet.merges
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    const meta = (workbook.Workbook ??= { Sheets: [] })
    meta.Sheets ??= []
    const sheetMeta = (meta.Sheets[meta.Sheets.length - 1] ??= {})
    if (sheet.veryHidden) sheetMeta.Hidden = 2
    else if (sheet.hidden) sheetMeta.Hidden = 1
  }
  if (options.namedRanges?.length) {
    const meta = (workbook.Workbook ??= { Sheets: [] })
    ;(meta as { Names?: Array<{ Name: string; Ref: string; Sheet?: number }> }).Names = options.namedRanges.map((entry) => ({
      Name: entry.name,
      Ref: entry.ref,
      ...(typeof entry.sheetIndex === 'number' ? { Sheet: entry.sheetIndex } : {}),
    }))
  }
  return new Uint8Array(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer)
}
