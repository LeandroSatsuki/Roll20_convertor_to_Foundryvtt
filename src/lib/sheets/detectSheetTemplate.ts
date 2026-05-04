import { makeWarning } from '../parser/parserUtils'
import { normalizeSheetCellValue } from './readWorkbook'
import type { AnchorHit, BestCharacterSheetDetection, SheetCandidate, SheetCell, SheetTemplateDetection, WorkbookData, WorkbookSheet } from './sheetTypes'

type DetectOptions = {
  includeHiddenSheets?: boolean
  selectedSheetName?: string
}

const positiveAnchorGroups: Array<{ label: string; aliases: string[]; weight: number; kind: 'identity' | 'ability' | 'combat' | 'skills' | 'feature' | 'equipment' }> = [
  { label: 'NOME DO PERSONAGEM', aliases: ['NOME DO PERSONAGEM', 'PERSONAGEM', 'CHARACTER NAME'], weight: 5, kind: 'identity' },
  { label: 'CLASSE(S) & NIVEL(EIS)', aliases: ['CLASSE(S) & NIVEL(EIS)', 'CLASSE & NIVEL', 'CLASS & LEVEL', 'CLASSES & LEVELS'], weight: 5, kind: 'identity' },
  { label: 'RACA', aliases: ['RACA', 'RACE'], weight: 4, kind: 'identity' },
  { label: 'ANTECEDENTE', aliases: ['ANTECEDENTE', 'BACKGROUND'], weight: 4, kind: 'identity' },
  { label: 'PONTOS DE VIDA', aliases: ['PONTOS DE VIDA', 'PV MAXIMO', 'PV', 'HP', 'HIT POINTS'], weight: 4, kind: 'combat' },
  { label: 'SABEDORIA PASSIVA', aliases: ['SABEDORIA PASSIVA', 'PERCEPCAO PASSIVA', 'PASSIVE PERCEPTION'], weight: 4, kind: 'combat' },
  { label: 'PERICIAS', aliases: ['PERICIAS', 'SKILLS'], weight: 4, kind: 'skills' },
  { label: 'FORCA', aliases: ['FORCA', 'STR', 'STRENGTH'], weight: 3, kind: 'ability' },
  { label: 'DESTREZA', aliases: ['DESTREZA', 'DEX', 'DEXTERITY'], weight: 3, kind: 'ability' },
  { label: 'CONSTITUICAO', aliases: ['CONSTITUICAO', 'CON', 'CONSTITUTION'], weight: 3, kind: 'ability' },
  { label: 'INTELIGENCIA', aliases: ['INTELIGENCIA', 'INT', 'INTELLIGENCE'], weight: 3, kind: 'ability' },
  { label: 'SABEDORIA', aliases: ['SABEDORIA', 'WIS', 'WISDOM'], weight: 3, kind: 'ability' },
  { label: 'CARISMA', aliases: ['CARISMA', 'CHA', 'CHARISMA'], weight: 3, kind: 'ability' },
  { label: 'CARACTERISTICAS DE CLASSE E RACA', aliases: ['CARACTERISTICAS DE CLASSE E RACA', 'FEATURES', 'TRAITS'], weight: 3, kind: 'feature' },
  { label: 'MOCHILA & EQUIPAMENTO', aliases: ['MOCHILA & EQUIPAMENTO', 'EQUIPAMENTO', 'MOCHILA'], weight: 3, kind: 'equipment' },
]

const negativeAnchorGroups: Array<{ label: string; aliases: string[]; weight: number }> = [
  { label: 'Associated Skills', aliases: ['Associated Skills', '◅ Associated Skills'], weight: -8 },
  { label: 'bludgeoning', aliases: ['bludgeoning'], weight: -8 },
  { label: 'piercing', aliases: ['piercing'], weight: -8 },
  { label: 'slashing', aliases: ['slashing'], weight: -8 },
  { label: 'Artifice', aliases: ['Artífice', 'Artifice', 'Artificer'], weight: -8 },
  { label: 'CUSTO', aliases: ['CUSTO'], weight: -8 },
  { label: 'PESO', aliases: ['PESO'], weight: -8 },
  { label: 'ITEM', aliases: ['ITEM'], weight: -8 },
  { label: 'DAMAGE TYPE', aliases: ['DAMAGE TYPE'], weight: -8 },
  { label: 'WEAPON PROPERTIES', aliases: ['WEAPON PROPERTIES'], weight: -8 },
  { label: 'CLASS LIST', aliases: ['CLASS LIST'], weight: -8 },
  { label: 'SPELL LIST', aliases: ['SPELL LIST'], weight: -8 },
  { label: 'DATA', aliases: ['DATA'], weight: -8 },
  { label: 'VALIDATION', aliases: ['VALIDATION'], weight: -8 },
  { label: 'LOOKUP', aliases: ['LOOKUP'], weight: -8 },
]

export function detectSheetTemplate(workbook: WorkbookData): SheetTemplateDetection {
  const best = detectBestCharacterSheet(workbook)
  return {
    detectedTemplate: best.confidence === 'low' ? 'unknown' : 'bonfire-character-sheet',
    confidence: best.confidence,
    matchedAnchors: best.positiveAnchors.map((anchor) => anchor.label),
    warnings: best.warnings,
  }
}

export function detectBestCharacterSheet(workbook: WorkbookData, options: DetectOptions = {}): BestCharacterSheetDetection {
  const candidates = detectCharacterSheetCandidates(workbook)
  const available = options.includeHiddenSheets || options.selectedSheetName ? candidates : candidates.filter((candidate) => !candidate.hidden && !candidate.veryHidden)
  const selected = options.selectedSheetName ? candidates.find((candidate) => candidate.sheetName === options.selectedSheetName) : available.sort((left, right) => right.score - left.score)[0]

  if (!selected) {
    return {
      sheetName: '',
      hidden: false,
      veryHidden: false,
      score: 0,
      confidence: 'low',
      anchorsFound: [],
      positiveAnchors: [],
      negativeAnchors: [],
      candidates,
      rejectionReasons: ['Workbook sem abas visiveis legiveis.'],
      warnings: [makeWarning('WORKBOOK_HAS_NO_SHEETS', 'Workbook sem abas visiveis legiveis.', 'source.workbook', undefined, 'error')],
    }
  }

  const warnings =
    selected.confidence === 'low'
      ? [
          makeWarning(
            'SHEET_TEMPLATE_LOW_CONFIDENCE',
            'A planilha nao foi reconhecida como ficha Bonfire. Verifique se voce exportou a aba correta como .xlsx.',
            'source.template',
            selected.sheetName,
            'error',
          ),
        ]
      : []

  if (selected.rejectionReasons.includes('auxiliary-data')) {
    warnings.push(
      makeWarning(
        'SHEET_LOOKS_LIKE_AUXILIARY_DATA',
        'A aba selecionada parece ser uma aba auxiliar/lista de dados, nao uma ficha de personagem.',
        'source.sheet',
        selected.sheetName,
        'error',
      ),
    )
  }

  return {
    sheetName: selected.confidence === 'low' && !options.selectedSheetName ? '' : selected.sheetName,
    hidden: selected.hidden,
    veryHidden: selected.veryHidden,
    score: selected.score,
    confidence: selected.confidence,
    anchorsFound: selected.positiveAnchors.map((anchor) => ({ label: anchor.label, cell: anchor.address, value: anchor.value })),
    positiveAnchors: selected.positiveAnchors,
    negativeAnchors: selected.negativeAnchors,
    candidates,
    rejectionReasons: selected.rejectionReasons,
    warnings,
  }
}

export function detectCharacterSheetCandidates(workbook: WorkbookData): SheetCandidate[] {
  return workbook.sheets.map(scoreSheet).sort((left, right) => right.score - left.score)
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
  const normalizedAliases = aliases.map(normalizeSheetCellValue)
  return sheet.cells.find((cell) => normalizedAliases.includes(cell.normalized)) ?? sheet.cells.find((cell) => normalizedAliases.some((alias) => cell.normalized.includes(alias) && alias.length >= 3)) ?? null
}

function scoreSheet(sheet: WorkbookSheet): SheetCandidate {
  const positiveAnchors = positiveAnchorGroups.flatMap((group) => {
    const cell = findAnchorCell(sheet, group.aliases)
    return cell ? [{ label: group.label, address: cell.address, value: cell.value, weight: group.weight }] : []
  })
  const negativeAnchors = negativeAnchorGroups.flatMap((group) => {
    const cells = findNegativeCells(sheet, group.aliases)
    return cells.slice(0, 3).map<AnchorHit>((cell) => ({ label: group.label, address: cell.address, value: cell.value, weight: group.weight }))
  })

  const positiveScore = positiveAnchors.reduce((sum, anchor) => sum + (anchor.weight ?? 0), 0)
  const negativeScore = negativeAnchors.reduce((sum, anchor) => sum + (anchor.weight ?? 0), 0)
  const hiddenPenalty = sheet.veryHidden ? -40 : sheet.hidden ? -25 : 0
  const score = positiveScore + negativeScore + hiddenPenalty

  const positiveLabels = new Set(positiveAnchors.map((anchor) => anchor.label))
  const identityCount = positiveAnchorGroups.filter((group) => group.kind === 'identity' && positiveLabels.has(group.label)).length
  const abilityCount = positiveAnchorGroups.filter((group) => group.kind === 'ability' && positiveLabels.has(group.label)).length
  const combatOrSkillsCount = positiveAnchorGroups.filter((group) => (group.kind === 'combat' || group.kind === 'skills') && positiveLabels.has(group.label)).length
  const hasStrongIdentity = identityCount >= 1
  const hasHighShape = score >= 18 && hasStrongIdentity && abilityCount >= 3 && combatOrSkillsCount >= 1
  const hasMediumShape = score >= 12 && hasStrongIdentity && abilityCount >= 2
  const rejectionReasons: string[] = []
  if (sheet.hidden) rejectionReasons.push(sheet.veryHidden ? 'very-hidden-sheet' : 'hidden-sheet')
  if (!hasStrongIdentity) rejectionReasons.push('missing-identity-anchor')
  if (abilityCount < 2) rejectionReasons.push('missing-ability-cluster')
  if (negativeAnchors.length && !hasStrongIdentity) rejectionReasons.push('auxiliary-data')
  if (negativeAnchors.length >= 3 && identityCount === 0) rejectionReasons.push('auxiliary-data')

  const confidence = hasHighShape && !rejectionReasons.includes('auxiliary-data') ? 'high' : hasMediumShape && !rejectionReasons.includes('auxiliary-data') ? 'medium' : 'low'
  return { sheetName: sheet.name, hidden: sheet.hidden, veryHidden: sheet.veryHidden, score, positiveAnchors, negativeAnchors, confidence, rejectionReasons: Array.from(new Set(rejectionReasons)) }
}

function findNegativeCells(sheet: WorkbookSheet, aliases: string[]): SheetCell[] {
  const normalizedAliases = aliases.map(normalizeSheetCellValue)
  return sheet.cells.filter((cell) => normalizedAliases.some((alias) => cell.normalized === alias || cell.normalized.includes(alias)))
}

function getCell(sheet: WorkbookSheet, row: number, col: number): SheetCell | null {
  return sheet.cells.find((cell) => cell.row === row && cell.col === col) ?? null
}
