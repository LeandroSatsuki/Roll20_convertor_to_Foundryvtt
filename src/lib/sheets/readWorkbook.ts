import type { WorkbookData, WorkbookNamedRange, WorkbookSheet } from './sheetTypes'

export async function readWorkbook(input: File | ArrayBuffer | Uint8Array | string, fileName = 'workbook.xlsx'): Promise<WorkbookData> {
  const XLSX = await import('xlsx')
  const workbook =
    typeof input === 'string'
      ? XLSX.read(input, { type: 'binary' })
      : XLSX.read(input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(await input.arrayBuffer()), { type: 'array' })

  const sheetMeta = workbook.Workbook?.Sheets ?? []
  const namedRanges: WorkbookNamedRange[] = ((workbook.Workbook?.Names as Array<{ Name?: string; Ref?: string; Sheet?: number }> | undefined) ?? [])
    .filter((entry) => typeof entry.Name === 'string' && typeof entry.Ref === 'string')
    .map((entry) => ({
      name: String(entry.Name),
      ref: String(entry.Ref),
      scopeSheetName: typeof entry.Sheet === 'number' ? workbook.SheetNames[entry.Sheet] ?? null : null,
    }))
  const sheets: WorkbookSheet[] = workbook.SheetNames.map((name, sheetIndex) => {
    const worksheet = workbook.Sheets[name]
    const hiddenValue = Number(sheetMeta[sheetIndex]?.Hidden ?? 0)
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '', raw: false })
    const normalizedRows = rows.map((row) => row.map((cell) => String(cell ?? '').trim()))
    const merges = ((worksheet['!merges'] as Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> | undefined) ?? []).map((merge) => ({
      startRow: merge.s.r,
      startCol: merge.s.c,
      endRow: merge.e.r,
      endCol: merge.e.c,
    }))
    const visualRows = normalizedRows.map((row) => [...row])
    const inherited = new Map<string, { value: string; source: string }>()
    for (const merge of merges) {
      const sourceValue = normalizedRows[merge.startRow]?.[merge.startCol]?.trim()
      if (!sourceValue) continue
      const sourceAddress = toA1Address(merge.startRow, merge.startCol)
      for (let row = merge.startRow; row <= merge.endRow; row += 1) {
        visualRows[row] ??= []
        for (let col = merge.startCol; col <= merge.endCol; col += 1) {
          if (row === merge.startRow && col === merge.startCol) continue
          if (!String(visualRows[row]?.[col] ?? '').trim()) {
            visualRows[row][col] = sourceValue
            inherited.set(`${row}:${col}`, { value: sourceValue, source: sourceAddress })
          }
        }
      }
    }
    const cells = visualRows.flatMap((row, rowIndex) =>
      row.flatMap((value, colIndex) => {
        const inheritedInfo = inherited.get(`${rowIndex}:${colIndex}`)
        return value
          ? [
              {
                address: toA1Address(rowIndex, colIndex),
                value,
                normalized: normalizeSheetCellValue(value),
                row: rowIndex,
                col: colIndex,
                inheritedFromMerge: Boolean(inheritedInfo),
                mergeSourceAddress: inheritedInfo?.source,
              },
            ]
          : []
      }),
    )
    return { name, hidden: hiddenValue === 1 || hiddenValue === 2, veryHidden: hiddenValue === 2, rows: visualRows, cells, merges }
  })

  return { fileName, sheetNames: workbook.SheetNames, sheets, namedRanges }
}

export function normalizeSheetCellValue(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
    .toLowerCase()
}

function toA1Address(row: number, col: number): string {
  let value = col + 1
  let letters = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    value = Math.floor((value - 1) / 26)
  }
  return `${letters}${row + 1}`
}
