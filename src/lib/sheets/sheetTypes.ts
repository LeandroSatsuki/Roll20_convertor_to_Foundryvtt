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

export type AnchorMatchMode = 'exact' | 'word' | 'phrase' | 'containsSafe'

export type SheetAnchor = {
  label: string
  aliases: string[]
  matchMode: AnchorMatchMode
  maxWords?: number
  blockedPhrases?: string[]
}

export type SheetAnchorCategory = 'identity' | 'abilities' | 'combat' | 'skills' | 'features' | 'equipment'

export type SheetTemplateId = 'bonfire-log-v2'

export type SheetRegionBounds = {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

export type SheetRegionCandidate = {
  sheetName: string
  bounds: SheetRegionBounds
  score: number
  confidence: 'high' | 'medium' | 'low'
  templateId?: SheetTemplateId
  positiveAnchors: AnchorHit[]
  negativeAnchors: AnchorHit[]
  ignoredOutsideRegion?: AnchorHit[]
  anchorCategories: SheetAnchorCategory[]
  rejectionReasons: string[]
}

export type SheetParseDebugInfo = {
  workbookFileName: string
  parserVersion: string
  parserBuildId: string
  parseRunId: string
  normalizedCharacterId: string
  actorBuildId?: string | null
  auditBuildId?: string | null
  generatedAt: string
  sourceCodeMarker: string
  sheetNames: string[]
  templateId?: SheetTemplateId
  templateParserUsed?: string
  parseBonfireLogV2SheetCalled: boolean
  selectedSheetName: string | null
  selectedRegion?: SheetRegionCandidate
  selectedBy: 'auto' | 'manual' | 'template'
  selectedSheetScore: number
  confidence: 'high' | 'medium' | 'low'
  parseBlockedReason?: string
  anchorsFound: Array<{
    label: string
    address: string
    value: string
  }>
  sheetCandidates: SheetCandidate[]
  regionCandidates: SheetRegionCandidate[]
  ignoredOutsideRegion: AnchorHit[]
  discardedDuplicateAnchors: AnchorHit[]
  blockedNameMatches: Array<{ value: string; normalizedValue: string; reason: string }>
  nameCandidates: NameCandidate[]
  abilityBlockCandidates: AbilityBlockDebugEntry[]
  extractedFields: ExtractedFieldDebugEntry[]
  extractionAttempts: ExtractedFieldDebugEntry[]
  finalExtractedFields: ExtractedFieldDebugEntry[]
  normalizedDebugSnapshot?: {
    abilities: Record<string, number | null>
  }
}

export type AbilityBlockDebugEntry = {
  ability: string
  labelAddress?: string
  candidateCells: Array<{
    address?: string
    rawValue?: string
    normalizedValue?: string
    accepted: boolean
    rejectedReason?: string
  }>
  selectedCell?: string
}

export type ExtractedFieldDebugEntry = {
  fieldPath: string
  cellAddress?: string
  rawValue?: string
  normalizedValue?: string
  inheritedFromMerge?: boolean
  mergeSourceAddress?: string
  accepted: boolean
  reason?: string
  rejectedReason?: string
}

export type AnchorHit = {
  label: string
  address: string
  value: string
  normalizedValue?: string
  row?: number
  col?: number
  weight?: number
  category?: SheetAnchorCategory
  mergeSourceAddress?: string
  ignoredOutsideRegion?: boolean
}

export type SheetCandidate = {
  sheetName: string
  hidden: boolean
  veryHidden: boolean
  score: number
  templateId?: SheetTemplateId
  selectedRegion?: SheetRegionCandidate
  regionCandidates: SheetRegionCandidate[]
  discardedDuplicateAnchors?: AnchorHit[]
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
  templateId?: SheetTemplateId
  selectedSheetName: string | null
  selectedRegion?: SheetRegionCandidate
  selectedBy: 'auto' | 'manual' | 'template'
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
  sheetCandidates: SheetCandidate[]
  regionCandidates: SheetRegionCandidate[]
  discardedDuplicateAnchors: AnchorHit[]
  rejectionReasons: string[]
  warnings: ConversionWarning[]
}

export type SheetCharacterParseResult = {
  character: NormalizedCharacter
  rawWorkbookMeta: {
    sheetNames: string[]
    detectedTemplate: string
    templateId?: SheetTemplateId
    confidence: 'high' | 'medium' | 'low'
    selectedSheetName: string | null
    selectedRegion?: SheetRegionCandidate
    selectedSheetScore: number
    selectedBy: 'auto' | 'manual' | 'template'
    anchorsFound: Array<{
      label: string
      address: string
      value: string
    }>
    sheetCandidates: SheetCandidate[]
    regionCandidates: SheetRegionCandidate[]
    ignoredOutsideRegion: AnchorHit[]
  }
  debug: SheetParseDebugInfo
  warnings: ConversionWarning[]
}
