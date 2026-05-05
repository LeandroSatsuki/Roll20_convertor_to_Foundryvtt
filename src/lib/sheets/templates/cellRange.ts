import type { SheetCell, WorkbookData, WorkbookSheet } from '../sheetTypes'

export type ParsedWorkbookRef =
  | { kind: 'cell'; sheetName: string; address: string }
  | { kind: 'range'; sheetName: string; startAddress: string; endAddress: string }

export function parseA1Address(address: string): { row: number; col: number } | null {
  const match = /^([A-Z]+)(\d+)$/i.exec(address.trim())
  if (!match) return null
  const [, letters, rowText] = match
  let col = 0
  for (const letter of letters.toUpperCase()) col = col * 26 + (letter.charCodeAt(0) - 64)
  return { row: Number.parseInt(rowText, 10) - 1, col: col - 1 }
}

export function toA1Address(row: number, col: number): string {
  let value = col + 1
  let letters = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    value = Math.floor((value - 1) / 26)
  }
  return `${letters}${row + 1}`
}

export function parseWorkbookRef(ref: string): ParsedWorkbookRef | null {
  const cleaned = ref.replace(/\$/g, '').trim()
  const match = /^(?:(?:'([^']+)')|([^!]+))!([A-Z]+\d+)(?::([A-Z]+\d+))?$/i.exec(cleaned)
  if (!match) return null
  const sheetName = (match[1] || match[2] || '').trim()
  const startAddress = match[3].toUpperCase()
  const endAddress = match[4]?.toUpperCase()
  return endAddress ? { kind: 'range', sheetName, startAddress, endAddress } : { kind: 'cell', sheetName, address: startAddress }
}

export function getSheet(workbook: WorkbookData, sheetName: string): WorkbookSheet | undefined {
  return workbook.sheets.find((sheet) => sheet.name === sheetName)
}

export function getCellByAddress(sheet: WorkbookSheet | undefined, address: string): SheetCell | null {
  if (!sheet) return null
  return sheet.cells.find((cell) => cell.address.toUpperCase() === address.toUpperCase()) ?? null
}

export function getCellsInRange(sheet: WorkbookSheet | undefined, startAddress: string, endAddress: string): SheetCell[] {
  if (!sheet) return []
  const start = parseA1Address(startAddress)
  const end = parseA1Address(endAddress)
  if (!start || !end) return []
  const minRow = Math.min(start.row, end.row)
  const maxRow = Math.max(start.row, end.row)
  const minCol = Math.min(start.col, end.col)
  const maxCol = Math.max(start.col, end.col)
  return sheet.cells.filter((cell) => cell.row >= minRow && cell.row <= maxRow && cell.col >= minCol && cell.col <= maxCol)
}

export function getCellsFromWorkbookRef(workbook: WorkbookData, ref: string): { parsed: ParsedWorkbookRef; sheet: WorkbookSheet | undefined; cells: SheetCell[] } | null {
  const parsed = parseWorkbookRef(ref)
  if (!parsed) return null
  const sheet = getSheet(workbook, parsed.sheetName)
  if (parsed.kind === 'cell') {
    const cell = getCellByAddress(sheet, parsed.address)
    return { parsed, sheet, cells: cell ? [cell] : [] }
  }
  return { parsed, sheet, cells: getCellsInRange(sheet, parsed.startAddress, parsed.endAddress) }
}
