import type { WorkbookData, WorkbookNamedRange } from '../sheetTypes'
import { getCellsFromWorkbookRef, parseWorkbookRef } from './cellRange'

export function getNamedRange(workbook: WorkbookData, name: string): WorkbookNamedRange | null {
  return workbook.namedRanges.find((entry) => entry.name.toLowerCase() === name.toLowerCase()) ?? null
}

export function getNamedRangeValue(workbook: WorkbookData, name: string) {
  const namedRange = getNamedRange(workbook, name)
  if (!namedRange) return null
  const resolved = getCellsFromWorkbookRef(workbook, namedRange.ref)
  if (!resolved) return { namedRange, parsed: null, resolvedSheetName: null, resolvedAddress: null, cells: [] as const }
  return {
    namedRange,
    parsed: resolved.parsed,
    resolvedSheetName: resolved.sheet?.name ?? null,
    resolvedAddress: resolved.parsed.kind === 'cell' ? resolved.parsed.address : `${resolved.parsed.startAddress}:${resolved.parsed.endAddress}`,
    cells: resolved.cells,
  }
}

export function isNamedRangeRef(ref: string): boolean {
  return /^=/.test(ref.trim())
}

export function normalizeNamedRangeRef(ref: string): string {
  return ref.trim().replace(/^=/, '')
}

export function isWorkbookCellRef(ref: string): boolean {
  return Boolean(parseWorkbookRef(ref))
}
