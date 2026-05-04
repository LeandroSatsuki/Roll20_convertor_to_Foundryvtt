import type { ConversionWarning, NormalizedCharacter } from '../character/normalizedCharacterTypes'

export type WorkbookCell = {
  address: string
  value: string
  normalized: string
  row: number
  col: number
  inheritedFromMerge?: boolean
  mergeSourceAddress?: string
}

export type SheetCell = WorkbookCell

export type WorkbookSheet = {
  name: string
  hidden: boolean
  veryHidden: boolean
  rows: string[][]
  cells: WorkbookCell[]
  merges: Array<{
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  }>
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

export type SheetParseDebugInfo = {
  workbookFileName: string
  sheetNames: string[]
  selectedSheetName: string | null
  selectedBy: 'auto' | 'manual'
  selectedSheetScore: number
  confidence: 'high' | 'medium' | 'low'
  parseBlockedReason?: string
  anchorsFound: Array<{
    label: string
    address: string
    value: string
  }>
  sheetCandidates: SheetCandidate[]
  nameCandidates: NameCandidate[]
  extractedFields: Array<{
    fieldPath: string
    cellAddress?: string
    rawValue?: string
    normalizedValue?: string
    inheritedFromMerge?: boolean
    mergeSourceAddress?: string
    accepted: boolean
    reason?: string
    rejectedReason?: string
  }>
}

export type AnchorHit = {
  label: string
  address: string
  value: string
  weight?: number
}

export type SheetCandidate = {
  sheetName: string
  hidden: boolean
  veryHidden: boolean
  score: number
  positiveAnchors: AnchorHit[]
  negativeAnchors: AnchorHit[]
  confidence: 'high' | 'medium' | 'low'
  rejectionReasons: string[]
}

export type NameCandidate = {
  value: string
  address: string
  strategy: string
  distance: number
  accepted: boolean
  rejectedReason?: string
}

export type BestCharacterSheetDetection = {
  sheetName: string
  hidden: boolean
  veryHidden: boolean
  score: number
  confidence: 'high' | 'medium' | 'low'
  anchorsFound: Array<{
    label: string
    cell: string
    value: string
  }>
  positiveAnchors: AnchorHit[]
  negativeAnchors: AnchorHit[]
  candidates: SheetCandidate[]
  rejectionReasons: string[]
  warnings: ConversionWarning[]
}

export type SheetCharacterParseResult = {
  character: NormalizedCharacter
  rawWorkbookMeta: {
    sheetNames: string[]
    detectedTemplate: string
    confidence: 'high' | 'medium' | 'low'
    selectedSheetName: string | null
    selectedSheetScore: number
    selectedBy: 'auto' | 'manual'
    anchorsFound: Array<{
      label: string
      address: string
      value: string
    }>
    sheetCandidates: SheetCandidate[]
  }
  debug: SheetParseDebugInfo
  warnings: ConversionWarning[]
}
