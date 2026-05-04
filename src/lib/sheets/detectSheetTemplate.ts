import { compactText, makeWarning } from '../parser/parserUtils'
import { bonfireSheetAnchors } from './sheetAnchors'
import type { SheetTemplateDetection, WorkbookData } from './sheetTypes'

export function detectSheetTemplate(workbook: WorkbookData): SheetTemplateDetection {
  const allText = compactText(workbook.sheets.flatMap((sheet) => sheet.cells.map((cell) => cell.value)).join(' '))
  const matchedAnchors = bonfireSheetAnchors.filter((anchor) => allText.includes(compactText(anchor)))
  const ratio = matchedAnchors.length / bonfireSheetAnchors.length
  const confidence = ratio >= 0.45 ? 'high' : ratio >= 0.2 ? 'medium' : 'low'

  return {
    detectedTemplate: matchedAnchors.length ? 'bonfire-character-sheet' : 'unknown',
    confidence,
    matchedAnchors,
    warnings:
      confidence === 'low'
        ? [makeWarning('SHEET_TEMPLATE_LOW_CONFIDENCE', 'Template da planilha não foi identificado com confiança.', 'source.template')]
        : [],
  }
}
