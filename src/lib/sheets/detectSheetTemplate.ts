import { makeWarning } from '../parser/parserUtils'
import { canonicalAnchorText, isAnchorMatch, matchesAnyAnchor } from './sheetAnchors'
import { normalizeSheetCellValue } from './readWorkbook'
import type { AnchorHit, SheetAnchor, SheetAnchorCategory, SheetCandidate, SheetCell, SheetRegionBounds, SheetRegionCandidate, SheetTemplateDetection, WorkbookData, WorkbookSheet } from './sheetTypes'
import { detectBonfireLogTemplate } from './templates/bonfireLogTemplate'

type DetectOptions = {
  includeHiddenSheets?: boolean
  selectedSheetName?: string
  selectedRegionIndex?: number
  selectedTemplateId?: 'bonfire-log-v2'
}

type PositiveAnchorGroup = SheetAnchor & {
  weight: number
  category: SheetAnchorCategory
}

type RegionScan = {
  regionCandidates: SheetRegionCandidate[]
  discardedDuplicateAnchors: AnchorHit[]
}

const positiveAnchorGroups: PositiveAnchorGroup[] = [
  { label: 'NOME DO PERSONAGEM', aliases: ['NOME DO PERSONAGEM', 'CHARACTER NAME'], weight: 8, category: 'identity', matchMode: 'phrase', maxWords: 4, blockedPhrases: ['APARÊNCIA DO PERSONAGEM', 'APARENCIA DO PERSONAGEM', 'TRAÇOS DE PERSONALIDADE', 'TRACOS DE PERSONALIDADE', 'PERSONALIDADE'] },
  { label: 'PERSONAGEM', aliases: ['PERSONAGEM'], weight: 2, category: 'identity', matchMode: 'exact', maxWords: 1, blockedPhrases: ['APARÊNCIA DO PERSONAGEM', 'APARENCIA DO PERSONAGEM'] },
  { label: 'CLASSE(S) & NIVEL(EIS)', aliases: ['CLASSE(S) & NIVEL(EIS)', 'CLASSE(S) & NÍVEL(EIS)', 'CLASSE & NIVEL', 'CLASS & LEVEL', 'CLASSES & LEVELS'], weight: 8, category: 'identity', matchMode: 'phrase', maxWords: 5 },
  { label: 'RACA', aliases: ['RACA', 'RAÇA', 'RACE'], weight: 6, category: 'identity', matchMode: 'word', maxWords: 2 },
  { label: 'ANTECEDENTE', aliases: ['ANTECEDENTE', 'BACKGROUND'], weight: 3, category: 'identity', matchMode: 'word', maxWords: 2 },
  { label: 'FORCA', aliases: ['FORCA', 'FORÇA', 'STR', 'STRENGTH'], weight: 1, category: 'abilities', matchMode: 'word', maxWords: 2 },
  { label: 'DESTREZA', aliases: ['DESTREZA', 'DEX', 'DEXTERITY'], weight: 1, category: 'abilities', matchMode: 'word', maxWords: 2 },
  { label: 'CONSTITUICAO', aliases: ['CONSTITUICAO', 'CONSTITUIÇÃO', 'CONSTITUTION'], weight: 1, category: 'abilities', matchMode: 'phrase', maxWords: 2 },
  { label: 'INTELIGENCIA', aliases: ['INTELIGENCIA', 'INTELIGÊNCIA', 'INTELLIGENCE'], weight: 1, category: 'abilities', matchMode: 'word', maxWords: 2 },
  { label: 'SABEDORIA', aliases: ['SABEDORIA', 'WIS', 'WISDOM'], weight: 1, category: 'abilities', matchMode: 'word', maxWords: 2 },
  { label: 'CARISMA', aliases: ['CARISMA', 'CHA', 'CHARISMA'], weight: 1, category: 'abilities', matchMode: 'word', maxWords: 2 },
  { label: 'CA', aliases: ['CA', 'AC', 'ARMOR CLASS', 'CLASSE DE ARMADURA'], weight: 5, category: 'combat', matchMode: 'phrase', maxWords: 4 },
  { label: 'PV', aliases: ['PONTOS DE VIDA', 'PV MAXIMO', 'PV MÁXIMO', 'PV', 'HP', 'HIT POINTS'], weight: 5, category: 'combat', matchMode: 'phrase', maxWords: 4 },
  { label: 'INICIATIVA', aliases: ['INICIATIVA', 'INITIATIVE'], weight: 5, category: 'combat', matchMode: 'word', maxWords: 2 },
  { label: 'SPEED', aliases: ['DESLOCAMENTO', 'SPEED', 'VELOCIDADE'], weight: 5, category: 'combat', matchMode: 'word', maxWords: 2 },
  { label: 'PERICIAS', aliases: ['PERICIAS', 'PERÍCIAS', 'SKILLS'], weight: 5, category: 'skills', matchMode: 'word', maxWords: 2 },
  { label: 'PERCEPCAO PASSIVA', aliases: ['PERCEPCAO PASSIVA', 'PERCEPÇÃO PASSIVA', 'SABEDORIA PASSIVA', 'PASSIVE PERCEPTION'], weight: 5, category: 'skills', matchMode: 'phrase', maxWords: 3 },
  { label: 'CARACTERISTICAS DE CLASSE E RACA', aliases: ['CARACTERISTICAS DE CLASSE E RACA', 'CARACTERÍSTICAS DE CLASSE E RAÇA', 'CARACTERISTICAS', 'CARACTERÍSTICAS', 'FEATURES', 'TRAITS', 'TALENTOS GERAIS', 'TALENTOS DE RACA', 'TALENTOS DE RAÇA'], weight: 4, category: 'features', matchMode: 'phrase', maxWords: 6 },
  { label: 'MOCHILA & EQUIPAMENTO', aliases: ['MOCHILA & EQUIPAMENTO', 'EQUIPAMENTO', 'MOCHILA'], weight: 4, category: 'equipment', matchMode: 'phrase', maxWords: 4 },
]

const negativeAnchorGroups: Array<SheetAnchor & { weight: number }> = [
  { label: 'Associated Skills', aliases: ['Associated Skills', '◅ Associated Skills'], weight: -8, matchMode: 'phrase', maxWords: 3 },
  { label: 'bludgeoning', aliases: ['bludgeoning'], weight: -8, matchMode: 'word', maxWords: 2 },
  { label: 'piercing', aliases: ['piercing'], weight: -8, matchMode: 'word', maxWords: 2 },
  { label: 'slashing', aliases: ['slashing'], weight: -8, matchMode: 'word', maxWords: 2 },
  { label: 'Artifice', aliases: ['Artífice', 'Artifice', 'Artificer'], weight: -8, matchMode: 'word', maxWords: 2 },
  { label: 'CUSTO', aliases: ['CUSTO'], weight: -8, matchMode: 'word', maxWords: 2 },
  { label: 'PESO', aliases: ['PESO'], weight: -8, matchMode: 'word', maxWords: 2 },
  { label: 'ITEM', aliases: ['ITEM'], weight: -8, matchMode: 'word', maxWords: 2 },
]

export function detectSheetTemplate(workbook: WorkbookData): SheetTemplateDetection {
  const best = detectBestCharacterSheet(workbook)
  return {
    detectedTemplate: best.templateId ?? (best.confidence === 'low' ? 'unknown' : 'bonfire-character-sheet'),
    confidence: best.confidence,
    matchedAnchors: best.positiveAnchors.map((anchor) => anchor.label),
    warnings: best.warnings,
  }
}

export function detectBestCharacterSheet(workbook: WorkbookData, options: DetectOptions = {}) {
  const candidates = detectCharacterSheetCandidates(workbook, options)
  const available = options.includeHiddenSheets || options.selectedSheetName ? candidates : candidates.filter((candidate) => !candidate.hidden && !candidate.veryHidden)
  const selectedCandidate = options.selectedSheetName ? candidates.find((candidate) => candidate.sheetName === options.selectedSheetName) : [...available].sort((left, right) => right.score - left.score)[0]
  const regionCandidates = candidates.flatMap((candidate) => candidate.regionCandidates)
  const discardedDuplicateAnchors = candidates.flatMap((candidate) => candidate.discardedDuplicateAnchors ?? [])

  if (!selectedCandidate) {
    return {
      sheetName: '',
      templateId: undefined,
      selectedSheetName: null,
      selectedRegion: undefined,
      selectedBy: 'auto' as const,
      hidden: false,
      veryHidden: false,
      score: 0,
      confidence: 'low' as const,
      anchorsFound: [],
      positiveAnchors: [],
      negativeAnchors: [],
      candidates,
      sheetCandidates: candidates,
      regionCandidates,
      discardedDuplicateAnchors: [],
      rejectionReasons: ['Workbook sem abas visiveis legiveis.'],
      warnings: [makeWarning('WORKBOOK_HAS_NO_SHEETS', 'Workbook sem abas visiveis legiveis.', 'source.workbook', undefined, 'error')],
    }
  }

  const selectedRegion = selectRegion(selectedCandidate, options.selectedRegionIndex)
  const selectedBy = selectedCandidate.templateId && selectedRegion?.templateId === selectedCandidate.templateId ? ('template' as const) : options.selectedSheetName ? ('manual' as const) : ('auto' as const)
  const autoAccepted = selectedBy !== 'auto' || selectedRegion?.confidence === 'high' || selectedRegion?.confidence === 'medium'
  const selectedSheetName = autoAccepted && selectedRegion ? selectedCandidate.sheetName : null

  return {
    sheetName: selectedSheetName ?? '',
    templateId: selectedCandidate.templateId ?? selectedRegion?.templateId,
    selectedSheetName,
    selectedRegion,
    selectedBy,
    hidden: selectedCandidate.hidden,
    veryHidden: selectedCandidate.veryHidden,
    score: selectedRegion?.score ?? selectedCandidate.score,
    confidence: selectedRegion?.confidence ?? 'low',
    anchorsFound: (selectedRegion?.positiveAnchors ?? []).map((anchor) => ({ label: anchor.label, cell: anchor.address, value: anchor.value })),
    positiveAnchors: selectedRegion?.positiveAnchors ?? [],
    negativeAnchors: selectedRegion?.negativeAnchors ?? [],
    candidates,
    sheetCandidates: candidates,
    regionCandidates,
    discardedDuplicateAnchors,
    rejectionReasons: selectedRegion?.rejectionReasons ?? ['missing-character-region'],
    warnings: buildDetectionWarnings(selectedCandidate, selectedRegion, selectedBy),
  }
}

export function detectCharacterSheetCandidates(workbook: WorkbookData, options: DetectOptions = {}): SheetCandidate[] {
  return workbook.sheets.map((sheet) => scoreSheet(sheet, options)).sort((left, right) => right.score - left.score)
}

export function detectSheetRegionCandidates(sheet: WorkbookSheet): RegionScan {
  const rawPositiveAnchors = collectPositiveAnchors(sheet)
  const negativeAnchors = collectNegativeAnchors(sheet)
  const { hits: positiveAnchors, duplicates: discardedDuplicateAnchors } = dedupeAnchorHits(rawPositiveAnchors)
  const bounds = buildRegionBounds(sheet, positiveAnchors)
  const regionCandidates = dedupeRegions(bounds.map((candidateBounds) => scoreRegion(sheet, candidateBounds, positiveAnchors, negativeAnchors, discardedDuplicateAnchors))).sort((left, right) => right.score - left.score)
  return { regionCandidates, discardedDuplicateAnchors }
}

export function findCellByNormalizedText(cells: SheetCell[], text: string): SheetCell | null {
  const normalized = normalizeSheetCellValue(text)
  return cells.find((cell) => cell.normalized === normalized) ?? null
}

export function findCellsContaining(cells: SheetCell[], text: string): SheetCell[] {
  const normalized = normalizeSheetCellValue(text)
  return cells.filter((cell) => cell.normalized.includes(normalized))
}

export function findNearestValueRight(sheet: WorkbookSheet, anchorCell: SheetCell, maxCols = 4): SheetCell | null {
  for (let col = anchorCell.col + 1; col <= anchorCell.col + maxCols; col += 1) {
    const cell = getCell(sheet, anchorCell.row, col)
    if (cell) return cell
  }
  return null
}

export function findNearestValueBelow(sheet: WorkbookSheet, anchorCell: SheetCell, maxRows = 4): SheetCell | null {
  for (let row = anchorCell.row + 1; row <= anchorCell.row + maxRows; row += 1) {
    const cell = getCell(sheet, row, anchorCell.col)
    if (cell) return cell
  }
  return null
}

export function findValueNearAnchor(sheet: WorkbookSheet, anchorText: string, strategy: 'right' | 'below' | 'around' = 'around'): { anchor: SheetCell; value: SheetCell } | null {
  const anchor = findAnchorCell(sheet, [anchorText])
  if (!anchor) return null
  const candidates =
    strategy === 'right'
      ? [findNearestValueRight(sheet, anchor)]
      : strategy === 'below'
        ? [findNearestValueBelow(sheet, anchor)]
        : [findNearestValueRight(sheet, anchor), getCell(sheet, anchor.row, anchor.col + 2), findNearestValueBelow(sheet, anchor), getCell(sheet, anchor.row + 1, anchor.col + 1), getCell(sheet, anchor.row - 1, anchor.col), getCell(sheet, anchor.row, anchor.col - 1)]
  const value = candidates.find((candidate): candidate is SheetCell => Boolean(candidate))
  return value ? { anchor, value } : null
}

export function findAnchorCell(sheet: WorkbookSheet, aliases: string[]): SheetCell | null {
  return sheet.cells.find((cell) => matchesAnyAnchor(cell.value, aliases)) ?? null
}

function scoreSheet(sheet: WorkbookSheet, options: DetectOptions): SheetCandidate {
  const templateMatch = options.selectedTemplateId === 'bonfire-log-v2' || !options.selectedTemplateId ? detectBonfireLogTemplate(sheet) : null
  const { regionCandidates: genericRegions, discardedDuplicateAnchors } = detectSheetRegionCandidates(sheet)
  const regionCandidates = templateMatch ? [templateMatch.region, ...genericRegions] : genericRegions
  const selectedRegion = templateMatch?.region ?? regionCandidates[0]
  const hiddenPenalty = sheet.veryHidden ? -40 : sheet.hidden ? -25 : 0
  const score = (selectedRegion?.score ?? 0) + hiddenPenalty
  const rejectionReasons = new Set(selectedRegion?.rejectionReasons ?? [])
  if (sheet.hidden) rejectionReasons.add(sheet.veryHidden ? 'very-hidden-sheet' : 'hidden-sheet')
  if (discardedDuplicateAnchors.length) rejectionReasons.add('deduped-merged-anchors')

  return {
    sheetName: sheet.name,
    hidden: sheet.hidden,
    veryHidden: sheet.veryHidden,
    score,
    templateId: templateMatch?.templateId,
    selectedRegion,
    regionCandidates,
    discardedDuplicateAnchors,
    positiveAnchors: selectedRegion?.positiveAnchors ?? [],
    negativeAnchors: selectedRegion?.negativeAnchors ?? [],
    confidence: selectedRegion?.confidence ?? 'low',
    rejectionReasons: Array.from(rejectionReasons),
  }
}

function collectPositiveAnchors(sheet: WorkbookSheet): AnchorHit[] {
  return positiveAnchorGroups.flatMap((group) =>
    sheet.cells
      .filter((cell) => isAnchorMatch(cell.value, group))
      .map((cell) => ({
        label: group.label,
        address: cell.address,
        value: cell.value,
        normalizedValue: cell.normalized,
        row: cell.row,
        col: cell.col,
        weight: group.weight,
        category: group.category,
        mergeSourceAddress: cell.mergeSourceAddress,
      })),
  )
}

function collectNegativeAnchors(sheet: WorkbookSheet): AnchorHit[] {
  return negativeAnchorGroups.flatMap((group) =>
    sheet.cells
      .filter((cell) => isAnchorMatch(cell.value, group))
      .map((cell) => ({
        label: group.label,
        address: cell.address,
        value: cell.value,
        normalizedValue: cell.normalized,
        row: cell.row,
        col: cell.col,
        weight: group.weight,
        mergeSourceAddress: cell.mergeSourceAddress,
      })),
  )
}

function buildRegionBounds(sheet: WorkbookSheet, positiveHits: AnchorHit[]): SheetRegionBounds[] {
  const maxRow = Math.max(0, sheet.rows.length - 1, ...sheet.cells.map((cell) => cell.row))
  const maxCol = Math.max(0, ...sheet.cells.map((cell) => cell.col))
  const bounds: SheetRegionBounds[] = [
    clampBounds({ startRow: 0, endRow: 119, startCol: 0, endCol: 39 }, maxRow, maxCol),
    clampBounds({ startRow: 0, endRow: 119, startCol: 0, endCol: 59 }, maxRow, maxCol),
    clampBounds({ startRow: 0, endRow: 79, startCol: 0, endCol: 39 }, maxRow, maxCol),
    clampBounds({ startRow: 0, endRow: 99, startCol: 0, endCol: 34 }, maxRow, maxCol),
  ]

  if (positiveHits.length) {
    const clusteredHits = positiveHits.filter((hit) => hit.row !== undefined && hit.col !== undefined && hit.category !== 'equipment')
    const rows = clusteredHits.map((hit) => hit.row ?? 0)
    const cols = clusteredHits.map((hit) => hit.col ?? 0)
    bounds.push(
      clampBounds(
        {
          startRow: Math.min(...rows) - 10,
          endRow: Math.max(...rows) + 20,
          startCol: Math.min(...cols) - 8,
          endCol: Math.max(...cols) + 8,
        },
        maxRow,
        maxCol,
      ),
    )
  }

  return bounds
}

function scoreRegion(sheet: WorkbookSheet, bounds: SheetRegionBounds, positiveHits: AnchorHit[], negativeHits: AnchorHit[], discardedDuplicateAnchors: AnchorHit[]): SheetRegionCandidate {
  const positiveAnchors = positiveHits.filter((hit) => isHitInsideBounds(hit, bounds))
  const negativeAnchors = negativeHits.filter((hit) => isHitInsideBounds(hit, bounds))
  const ignoredOutsideRegion = negativeHits.filter((hit) => !isHitInsideBounds(hit, bounds)).concat(discardedDuplicateAnchors.map((hit) => ({ ...hit, ignoredOutsideRegion: true })))
  const anchorCategories = Array.from(new Set(positiveAnchors.map((anchor) => anchor.category).filter(Boolean))) as SheetAnchorCategory[]
  const labels = new Set(positiveAnchors.map((anchor) => anchor.label))
  const abilityCount = positiveAnchors.filter((anchor) => anchor.category === 'abilities').length
  const hasIdentity = labels.has('CLASSE(S) & NIVEL(EIS)') || labels.has('RACA') || labels.has('NOME DO PERSONAGEM')
  const hasCombatOrSkills = anchorCategories.includes('combat') || anchorCategories.includes('skills')
  const positiveScore = scorePositiveRegionAnchors(positiveAnchors)
  const negativeScore = negativeAnchors.reduce((sum, anchor) => sum + (anchor.weight ?? 0), 0)
  const score = positiveScore + negativeScore
  const rejectionReasons: string[] = []
  const hasCompleteSheetSections = anchorCategories.includes('features') && anchorCategories.includes('equipment')

  if (anchorCategories.length <= 1) rejectionReasons.push('REGION_TOO_NARROW_ONLY_ONE_ANCHOR_CATEGORY')
  if (!hasIdentity) rejectionReasons.push('missing-identity-anchor')
  if (abilityCount < 3) rejectionReasons.push('missing-ability-cluster')
  if (!hasCombatOrSkills) rejectionReasons.push('missing-combat-or-skills')
  if (negativeAnchors.length >= 3 && !hasIdentity) rejectionReasons.push('auxiliary-data')

  const confidence =
    hasIdentity && (abilityCount >= 4 || (abilityCount >= 3 && hasCompleteSheetSections)) && hasCombatOrSkills && score >= 25 && !rejectionReasons.includes('REGION_TOO_NARROW_ONLY_ONE_ANCHOR_CATEGORY')
      ? 'high'
      : hasIdentity && abilityCount >= 3 && hasCombatOrSkills && score >= 16 && !rejectionReasons.includes('REGION_TOO_NARROW_ONLY_ONE_ANCHOR_CATEGORY')
        ? 'medium'
        : 'low'

  return {
    sheetName: sheet.name,
    bounds,
    score,
    confidence,
    positiveAnchors,
    negativeAnchors,
    ignoredOutsideRegion,
    anchorCategories,
    rejectionReasons: Array.from(new Set(rejectionReasons)),
  }
}

function scorePositiveRegionAnchors(positiveAnchors: AnchorHit[]): number {
  const labels = new Set(positiveAnchors.map((anchor) => anchor.label))
  const abilityCount = positiveAnchors.filter((anchor) => anchor.category === 'abilities').length
  const categories = new Set(positiveAnchors.map((anchor) => anchor.category))
  let score = 0
  if (labels.has('NOME DO PERSONAGEM')) score += 8
  if (labels.has('CLASSE(S) & NIVEL(EIS)')) score += 8
  if (labels.has('RACA')) score += 6
  if (labels.has('ANTECEDENTE')) score += 3
  if (abilityCount >= 4) score += 6
  else score += abilityCount
  if (categories.has('combat')) score += 5
  if (categories.has('skills')) score += 5
  if (categories.has('features')) score += 4
  if (categories.has('equipment')) score += 4
  return score
}

function selectRegion(candidate: SheetCandidate, selectedRegionIndex?: number): SheetRegionCandidate | undefined {
  if (selectedRegionIndex !== undefined) return candidate.regionCandidates.filter((region) => region.sheetName === candidate.sheetName)[selectedRegionIndex]
  return candidate.selectedRegion
}

function buildDetectionWarnings(candidate: SheetCandidate, region: SheetRegionCandidate | undefined, selectedBy: 'auto' | 'manual' | 'template') {
  if (!region) return [makeWarning('SHEET_CHARACTER_REGION_NOT_FOUND', 'Não encontrei a região principal da ficha. Selecione manualmente a aba/região.', 'source.region', candidate.sheetName, 'error')]
  const warnings = []
  if (region.confidence === 'low' && selectedBy === 'auto') warnings.push(makeWarning('SHEET_CHARACTER_REGION_NOT_FOUND', 'Não encontrei a região principal da ficha. Selecione manualmente a aba/região.', 'source.region', candidate.sheetName, 'error'))
  if (region.confidence === 'low' && selectedBy === 'manual') warnings.push(makeWarning('SHEET_REGION_LOW_CONFIDENCE_MANUAL', 'A região escolhida tem baixa confiança; revise os campos extraídos.', 'source.region', candidate.sheetName, 'warning'))
  if (region.rejectionReasons.includes('auxiliary-data')) warnings.push(makeWarning('SHEET_LOOKS_LIKE_AUXILIARY_DATA', 'A região selecionada parece conter dados auxiliares/listas, nao uma ficha de personagem.', 'source.region', candidate.sheetName, 'error'))
  return warnings
}

function dedupeAnchorHits(hits: AnchorHit[]): { hits: AnchorHit[]; duplicates: AnchorHit[] } {
  const kept = new Map<string, AnchorHit>()
  const duplicates: AnchorHit[] = []
  for (const hit of hits) {
    const rowBucket = Math.floor((hit.row ?? 0) / 2)
    const key = hit.mergeSourceAddress
      ? `${hit.label}:${hit.normalizedValue ?? canonicalAnchorText(hit.value)}:${hit.mergeSourceAddress}`
      : `${hit.label}:${hit.normalizedValue ?? canonicalAnchorText(hit.value)}:${rowBucket}`
    if (kept.has(key)) {
      duplicates.push({ ...hit, ignoredOutsideRegion: true })
      continue
    }
    kept.set(key, hit)
  }
  return { hits: Array.from(kept.values()), duplicates }
}

function isHitInsideBounds(hit: AnchorHit, bounds: SheetRegionBounds): boolean {
  return hit.row !== undefined && hit.col !== undefined && hit.row >= bounds.startRow && hit.row <= bounds.endRow && hit.col >= bounds.startCol && hit.col <= bounds.endCol
}

function clampBounds(bounds: SheetRegionBounds, maxRow: number, maxCol: number): SheetRegionBounds {
  return {
    startRow: Math.max(0, Math.min(bounds.startRow, maxRow)),
    endRow: Math.max(0, Math.min(bounds.endRow, maxRow)),
    startCol: Math.max(0, Math.min(bounds.startCol, maxCol)),
    endCol: Math.max(0, Math.min(bounds.endCol, maxCol)),
  }
}

function dedupeRegions(regions: SheetRegionCandidate[]): SheetRegionCandidate[] {
  const seen = new Set<string>()
  return regions.filter((region) => {
    const key = `${region.templateId ?? 'generic'}:${region.sheetName}:${region.bounds.startRow}:${region.bounds.endRow}:${region.bounds.startCol}:${region.bounds.endCol}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getCell(sheet: WorkbookSheet, row: number, col: number): SheetCell | null {
  return sheet.cells.find((cell) => cell.row === row && cell.col === col) ?? null
}
