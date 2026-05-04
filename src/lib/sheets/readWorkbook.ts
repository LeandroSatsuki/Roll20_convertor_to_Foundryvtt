import type { WorkbookData, WorkbookSheet } from './sheetTypes'

export async function readWorkbook(input: File | ArrayBuffer | Uint8Array | string, fileName = 'workbook.xlsx'): Promise<WorkbookData> {
  const XLSX = await import('xlsx')
  const workbook =
    typeof input === 'string'
      ? XLSX.read(input, { type: 'binary' })
      : XLSX.read(input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(await input.arrayBuffer()), { type: 'array' })

  const sheets: WorkbookSheet[] = workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '', raw: false })
    const normalizedRows = rows.map((row) => row.map((cell) => String(cell ?? '').trim()))
    const cells = normalizedRows.flatMap((row, rowIndex) =>
      row.flatMap((value, colIndex) => (value ? [{ value, row: rowIndex, col: colIndex }] : [])),
    )
    return { name, rows: normalizedRows, cells }
  })

  return { fileName, sheetNames: workbook.SheetNames, sheets }
}
