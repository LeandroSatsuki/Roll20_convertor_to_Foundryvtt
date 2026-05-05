import { isAnchorMatch } from '../sheetAnchors'
import type { AnchorHit, SheetAnchor, SheetAnchorCategory, SheetRegionCandidate, SheetTemplateId, WorkbookSheet } from '../sheetTypes'

type TemplateAnchorExpectation = {
  label: string
  category: SheetAnchorCategory
  anchor: SheetAnchor
  row: number
  col: number
  rowTolerance: number
  colTolerance: number
  weight: number
}

export type BonfireLogTemplateMatch = {
  templateId: SheetTemplateId
  sheetName: string
  score: number
  confidence: 'high' | 'medium'
  region: SheetRegionCandidate
}

const templateAnchors: TemplateAnchorExpectation[] = [
  { label: 'CLASSE(S) & NIVEL(EIS)', category: 'identity', anchor: { label: 'CLASSE(S) & NIVEL(EIS)', aliases: ['CLASSE(S) & NIVEL(EIS)', 'CLASSE(S) & NÍVEL(EIS)'], matchMode: 'phrase', maxWords: 5 }, row: 5, col: 19, rowTolerance: 3, colTolerance: 4, weight: 8 },
  { label: 'RACA', category: 'identity', anchor: { label: 'RACA', aliases: ['RACA', 'RAÇA'], matchMode: 'word', maxWords: 2 }, row: 7, col: 19, rowTolerance: 3, colTolerance: 4, weight: 6 },
  { label: 'PV', category: 'combat', anchor: { label: 'PV', aliases: ['PV MAXIMO', 'PV MÁXIMO', 'PONTOS DE VIDA'], matchMode: 'phrase', maxWords: 4 }, row: 15, col: 17, rowTolerance: 4, colTolerance: 4, weight: 5 },
  { label: 'PERCEPCAO PASSIVA', category: 'skills', anchor: { label: 'PERCEPCAO PASSIVA', aliases: ['PERCEPCAO PASSIVA', 'PERCEPÇÃO PASSIVA'], matchMode: 'phrase', maxWords: 3 }, row: 44, col: 5, rowTolerance: 4, colTolerance: 4, weight: 5 },
  { label: 'PERICIAS', category: 'skills', anchor: { label: 'PERICIAS', aliases: ['PERICIAS', 'PERÍCIAS'], matchMode: 'word', maxWords: 2 }, row: 42, col: 7, rowTolerance: 4, colTolerance: 4, weight: 5 },
  { label: 'FORCA', category: 'abilities', anchor: { label: 'FORCA', aliases: ['FORCA', 'FORÇA'], matchMode: 'word', maxWords: 2 }, row: 16, col: 9, rowTolerance: 3, colTolerance: 3, weight: 2 },
  { label: 'DESTREZA', category: 'abilities', anchor: { label: 'DESTREZA', aliases: ['DESTREZA'], matchMode: 'word', maxWords: 2 }, row: 17, col: 9, rowTolerance: 3, colTolerance: 3, weight: 2 },
  { label: 'CONSTITUICAO', category: 'abilities', anchor: { label: 'CONSTITUICAO', aliases: ['CONSTITUICAO', 'CONSTITUIÇÃO'], matchMode: 'phrase', maxWords: 2 }, row: 18, col: 9, rowTolerance: 3, colTolerance: 3, weight: 2 },
  { label: 'INTELIGENCIA', category: 'abilities', anchor: { label: 'INTELIGENCIA', aliases: ['INTELIGENCIA', 'INTELIGÊNCIA'], matchMode: 'word', maxWords: 2 }, row: 19, col: 9, rowTolerance: 3, colTolerance: 3, weight: 2 },
  { label: 'SABEDORIA', category: 'abilities', anchor: { label: 'SABEDORIA', aliases: ['SABEDORIA'], matchMode: 'word', maxWords: 2 }, row: 20, col: 9, rowTolerance: 3, colTolerance: 3, weight: 2 },
  { label: 'CARISMA', category: 'abilities', anchor: { label: 'CARISMA', aliases: ['CARISMA'], matchMode: 'word', maxWords: 2 }, row: 21, col: 9, rowTolerance: 3, colTolerance: 3, weight: 2 },
  { label: 'CARACTERISTICAS DE CLASSE E RACA', category: 'features', anchor: { label: 'CARACTERISTICAS DE CLASSE E RACA', aliases: ['CARACTERISTICAS DE CLASSE E RACA', 'CARACTERÍSTICAS DE CLASSE E RAÇA'], matchMode: 'phrase', maxWords: 6 }, row: 42, col: 17, rowTolerance: 5, colTolerance: 5, weight: 4 },
  { label: 'MOCHILA & EQUIPAMENTO', category: 'equipment', anchor: { label: 'MOCHILA & EQUIPAMENTO', aliases: ['MOCHILA & EQUIPAMENTO'], matchMode: 'phrase', maxWords: 4 }, row: 84, col: 15, rowTolerance: 6, colTolerance: 5, weight: 4 },
]

export function detectBonfireLogTemplate(sheet: WorkbookSheet): BonfireLogTemplateMatch | null {
  if (sheet.name.toLowerCase() !== 'log') return null
  const hits = templateAnchors.flatMap((expectation) => {
    const match = findApproximateAnchorHit(sheet, expectation)
    return match ? [match] : []
  })

  const categories = Array.from(new Set(hits.map((hit) => hit.category).filter(Boolean))) as SheetAnchorCategory[]
  const abilityCount = hits.filter((hit) => hit.category === 'abilities').length
  const hasIdentity = hits.some((hit) => hit.label === 'CLASSE(S) & NIVEL(EIS)' || hit.label === 'RACA')
  const hasCombatOrSkills = hits.some((hit) => hit.category === 'combat' || hit.category === 'skills')
  if (hits.length < 5 || !hasIdentity || abilityCount < 3 || !hasCombatOrSkills) return null

  const score = hits.reduce((sum, hit) => sum + (hit.weight ?? 0), 0)
  const confidence = hits.length >= 7 && abilityCount >= 4 ? 'high' : 'medium'
  const region: SheetRegionCandidate = {
    sheetName: sheet.name,
    regionName: 'template-bonfire-log-v2',
    templateId: 'bonfire-log-v2',
    bounds: { startRow: 0, endRow: Math.min(119, Math.max(sheet.rows.length - 1, 100)), startCol: 0, endCol: 39 },
    minRow: 0,
    maxRow: Math.min(119, Math.max(sheet.rows.length - 1, 100)),
    minCol: 0,
    maxCol: 39,
    score,
    confidence,
    positiveAnchors: hits,
    negativeAnchors: [],
    ignoredOutsideRegion: [],
    ignoredNegativeAnchors: [],
    anchorCategories: categories,
    rejectionReasons: [],
  }

  return { templateId: 'bonfire-log-v2', sheetName: sheet.name, score, confidence, region }
}

function findApproximateAnchorHit(sheet: WorkbookSheet, expectation: TemplateAnchorExpectation): AnchorHit | null {
  for (const cell of sheet.cells) {
    if (cell.row < expectation.row - expectation.rowTolerance || cell.row > expectation.row + expectation.rowTolerance) continue
    if (cell.col < expectation.col - expectation.colTolerance || cell.col > expectation.col + expectation.colTolerance) continue
    if (!isAnchorMatch(cell.value, expectation.anchor)) continue
    return {
      label: expectation.label,
      value: cell.value,
      normalizedValue: cell.normalized,
      address: cell.address,
      row: cell.row,
      col: cell.col,
      category: expectation.category,
      weight: expectation.weight,
      mergeSourceAddress: cell.mergeSourceAddress,
    }
  }
  return null
}
