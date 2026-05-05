import { normalizeSheetCellValue } from './readWorkbook'
import type { SheetAnchor } from './sheetTypes'

export const characterSheetAnchorGroups: SheetAnchor[] = [
  {
    label: 'NOME DO PERSONAGEM',
    aliases: ['NOME DO PERSONAGEM', 'PERSONAGEM', 'CHARACTER NAME', 'NOME'],
    matchMode: 'phrase',
    maxWords: 4,
    blockedPhrases: ['APARÊNCIA DO PERSONAGEM', 'APARENCIA DO PERSONAGEM', 'TRAÇOS DE PERSONALIDADE', 'TRACOS DE PERSONALIDADE', 'PERSONALIDADE', 'LOG/FICHA', 'LOG FICHA'],
  },
  { label: 'CLASSE', aliases: ['CLASSE', 'CLASSE(S) & NIVEL(EIS)', 'CLASSE(S) & NÍVEL(EIS)', 'CLASSE(S) & NÃ\x8dVEL(EIS)', 'CLASSE & NIVEL', 'CLASS & LEVEL', 'CLASSES & LEVELS'], matchMode: 'phrase', maxWords: 5 },
  { label: 'RAÇA', aliases: ['RAÇA', 'RACA', 'RAÃ\x87A', 'RACE'], matchMode: 'word', maxWords: 2 },
  { label: 'ANTECEDENTE', aliases: ['ANTECEDENTE', 'BACKGROUND'], matchMode: 'word', maxWords: 2 },
  { label: 'FORÇA', aliases: ['FORÇA', 'FORCA', 'FORÃ\x87A', 'STR', 'STRENGTH'], matchMode: 'word', maxWords: 2 },
  { label: 'DESTREZA', aliases: ['DESTREZA', 'DEX', 'DEXTERITY'], matchMode: 'word', maxWords: 2 },
  { label: 'CONSTITUIÇÃO', aliases: ['CONSTITUIÇÃO', 'CONSTITUICAO', 'CONSTITUIÃ\x87Ã\x83O', 'CON', 'CONSTITUTION'], matchMode: 'phrase', maxWords: 2 },
  { label: 'INTELIGÊNCIA', aliases: ['INTELIGÊNCIA', 'INTELIGENCIA', 'INT', 'INTELLIGENCE'], matchMode: 'word', maxWords: 2 },
  { label: 'SABEDORIA', aliases: ['SABEDORIA', 'WIS', 'WISDOM'], matchMode: 'word', maxWords: 2 },
  { label: 'CARISMA', aliases: ['CARISMA', 'CHA', 'CHARISMA'], matchMode: 'word', maxWords: 2 },
  { label: 'PERÍCIAS', aliases: ['PERÍCIAS', 'PERICIAS', 'PERÃ\x8dCIAS', 'SKILLS'], matchMode: 'word', maxWords: 2 },
  {
    label: 'CARACTERÍSTICAS',
    aliases: ['CARACTERÍSTICAS', 'CARACTERISTICAS', 'CARACTERÃ\x8dSTICAS', 'CARACTERÍSTICAS DE CLASSE E RAÇA', 'CARACTERISTICAS DE CLASSE E RACA', 'CARACTERÃ\x8dSTICAS DE CLASSE E RAÃ\x87A'],
    matchMode: 'phrase',
    maxWords: 6,
  },
  { label: 'MOCHILA', aliases: ['MOCHILA', 'MOCHILA & EQUIPAMENTO'], matchMode: 'phrase', maxWords: 4 },
  { label: 'EQUIPAMENTO', aliases: ['EQUIPAMENTO', 'MOCHILA & EQUIPAMENTO'], matchMode: 'phrase', maxWords: 4 },
  { label: 'PONTOS DE VIDA', aliases: ['PONTOS DE VIDA', 'PV', 'PV MÁXIMO', 'PV MAXIMO', 'PV MÃ\x81XIMO', 'HP', 'HIT POINTS'], matchMode: 'phrase', maxWords: 4 },
  { label: 'CA', aliases: ['CA', 'AC', 'ARMOR CLASS', 'CLASSE DE ARMADURA'], matchMode: 'phrase', maxWords: 4 },
  { label: 'VELOCIDADE', aliases: ['DESLOCAMENTO', 'SPEED', 'VELOCIDADE'], matchMode: 'word', maxWords: 2 },
  { label: 'INICIATIVA', aliases: ['INICIATIVA', 'INITIATIVE'], matchMode: 'word', maxWords: 2 },
  { label: 'SABEDORIA PASSIVA', aliases: ['SABEDORIA PASSIVA', 'PERCEPÇÃO PASSIVA', 'PERCEPCAO PASSIVA', 'PERCEPÃ\x87Ã\x83O PASSIVA', 'PASSIVE PERCEPTION'], matchMode: 'phrase', maxWords: 3 },
]

export const bonfireSheetAnchors = characterSheetAnchorGroups.flatMap((group) => group.aliases)

export const sectionAnchorAliases: Record<string, string[]> = {
  features: ['CARACTERÍSTICAS DE CLASSE E RAÇA', 'CARACTERISTICAS DE CLASSE E RACA', 'CARACTERÃ\x8dSTICAS DE CLASSE E RAÃ\x87A'],
  generalFeats: ['TALENTOS GERAIS'],
  racialFeats: ['TALENTOS DE RAÇA', 'TALENTOS DE RACA', 'TALENTOS DE RAÃ\x87A'],
  extraFeats: ['TALENTOS EXTRAS'],
  equipment: ['MOCHILA & EQUIPAMENTO', 'EQUIPAMENTO', 'MOCHILA'],
  languagesTools: ['IDIOMAS E FERRAMENTAS', 'IDIOMAS'],
  skills: ['PERÍCIAS', 'PERICIAS', 'PERÃ\x8dCIAS'],
}

export function isAnchorMatch(cellValue: string, anchor: SheetAnchor): boolean {
  const cell = canonicalAnchorText(cellValue)
  if (!cell) return false
  if (cell.length > 80) return false
  const cellWords = cell.split(' ').filter(Boolean)
  if (anchor.maxWords && cellWords.length > anchor.maxWords) return false
  if (anchor.blockedPhrases?.some((phrase) => canonicalAnchorText(phrase) === cell)) return false
  if (anchor.label === 'NOME DO PERSONAGEM') return isNameAnchorMatch(cell, anchor)

  return anchor.aliases.some((alias) => {
    const normalizedAlias = canonicalAnchorText(alias)
    if (!normalizedAlias) return false
    if (anchor.matchMode === 'exact') return cell === normalizedAlias
    if (anchor.matchMode === 'word') return cell === normalizedAlias
    if (anchor.matchMode === 'phrase') return cell === normalizedAlias || hasSafePhrase(cell, normalizedAlias)
    return hasSafePhrase(cell, normalizedAlias)
  })
}

export function matchesAnyAnchor(cellValue: string, aliases: string[], matchMode: SheetAnchor['matchMode'] = 'phrase', maxWords = 8): boolean {
  const known = findKnownAnchorForAliases(aliases)
  return isAnchorMatch(cellValue, known ? { ...known, aliases } : { label: aliases[0] ?? '', aliases, matchMode, maxWords })
}

export function canonicalAnchorText(value: string): string {
  return normalizeSheetCellValue(value)
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasSafePhrase(cell: string, phrase: string): boolean {
  if (cell === phrase) return true
  const cellWords = cell.split(' ')
  const phraseWords = phrase.split(' ')
  if (!phraseWords.length || phraseWords.length > cellWords.length) return false
  for (let index = 0; index <= cellWords.length - phraseWords.length; index += 1) {
    if (phraseWords.every((word, offset) => cellWords[index + offset] === word)) return true
  }
  return false
}

function findKnownAnchorForAliases(aliases: string[]): SheetAnchor | null {
  const normalizedAliases = new Set(aliases.map(canonicalAnchorText))
  return characterSheetAnchorGroups.find((anchor) => anchor.aliases.some((alias) => normalizedAliases.has(canonicalAnchorText(alias)))) ?? null
}

function isNameAnchorMatch(cell: string, anchor: SheetAnchor): boolean {
  if (['aparencia do personagem', 'tracos de personalidade', 'personalidade', 'log ficha'].includes(cell)) return false
  return anchor.aliases.some((alias) => {
    const normalizedAlias = canonicalAnchorText(alias)
    if (!normalizedAlias) return false
    if (normalizedAlias === 'personagem' || normalizedAlias === 'nome') return cell === normalizedAlias
    return cell === normalizedAlias
  })
}
