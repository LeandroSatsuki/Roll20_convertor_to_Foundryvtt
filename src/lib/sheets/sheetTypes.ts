import type { ConversionWarning, NormalizedCharacter } from '../character/normalizedCharacterTypes'

export type WorkbookCell = {
  value: string
  row: number
  col: number
}

export type WorkbookSheet = {
  name: string
  rows: string[][]
  cells: WorkbookCell[]
}

export type WorkbookData = {
  fileName: string
  sheetNames: string[]
  sheets: WorkbookSheet[]
}

export type SheetTemplateDetection = {
  detectedTemplate: string
  confidence: 'high' | 'medium' | 'low'
  matchedAnchors: string[]
  warnings: ConversionWarning[]
}

export type SheetCharacterParseResult = {
  character: NormalizedCharacter
  rawWorkbookMeta: {
    sheetNames: string[]
    detectedTemplate: string
    confidence: 'high' | 'medium' | 'low'
  }
  warnings: ConversionWarning[]
}
