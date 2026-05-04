import { field } from '../normalize/confidence'
import type { AbilityKey, ConversionWarning, NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import { parseAbilities } from './parseAbilities'
import { parseCombat, parseProficiencyBonus } from './parseCombat'
import { parseCurrency } from './parseCurrency'
import { parseFeatures } from './parseFeatures'
import { parseResources } from './parseResources'
import { parseSaves } from './parseSaves'
import { parseSkills } from './parseSkills'
import { parseSpells } from './parseSpells'
import { compactText, makeWarning } from './parserUtils'

export type ParseRoll20CharacterOptions = {
  fileName: string
  pages?: Array<{ pageNumber: number; text: string }>
}

export function parseRoll20Character(text: string, options: ParseRoll20CharacterOptions): NormalizedCharacter {
  const compact = compactText(text)
  const warnings: ConversionWarning[] = []
  const identity = parseIdentity(compact, warnings)
  const { abilities, warnings: abilityWarnings } = parseAbilities(text)
  warnings.push(...abilityWarnings)

  const proficiencyBonus = parseProficiencyBonus(text)
  const { saves, warnings: saveWarnings } = parseSaves(text, abilities, proficiencyBonus.value)
  const { skills, warnings: skillWarnings } = parseSkills(text, abilities, proficiencyBonus.value)
  const combat = parseCombat(text)
  const { resources, warnings: resourceWarnings } = parseResources(text)
  const features = parseFeatures(text)
  const spells = parseSpells(text)

  warnings.push(...saveWarnings, ...skillWarnings, ...combat.warnings, ...resourceWarnings)
  if (spells.spellcastingClass.value === null) {
    warnings.push(makeWarning('NO_SPELLCASTING', 'Ficha sem conjuração.', 'spells', undefined, 'info'))
  }
  if (identity.race.value.includes('…') || identity.race.value.includes('...') || /Sangu$/i.test(identity.race.value)) {
    warnings.push(makeWarning('RACE_TRUNCATED', `Raça parece truncada: ${identity.race.value}`, 'identity.race', identity.race.raw))
  }
  if (!combat.attributes.senses.darkvision.value && /vis[aã]o no escuro/i.test(compact)) {
    warnings.push(makeWarning('DARKVISION_DISTANCE_UNKNOWN', 'Visão no Escuro encontrada sem distância confiável.', 'attributes.senses.darkvision'))
  }
  warnings.push(makeWarning('SIZE_DEFAULTED', 'Tamanho não encontrado com segurança; Foundry receberá med para revisão.', 'system.traits.size', undefined, 'info'))

  return {
    source: {
      type: 'roll20-pdf',
      fileName: options.fileName,
      extractedAt: new Date().toISOString(),
      pages: options.pages,
    },
    identity,
    abilities,
    proficiencyBonus,
    saves,
    skills,
    attributes: combat.attributes,
    currency: parseCurrency(text),
    proficiencies: parseProficiencies(compact),
    attacks: combat.attacks,
    features,
    resources,
    spells,
    warnings,
  }
}

function parseIdentity(compact: string, warnings: ConversionWarning[]): NormalizedCharacter['identity'] {
  const roll20Header = compact.match(
    /^(.{2,80}?)\s+NOME DO PERSONAGEM\s+(.{2,80}?)\s+CLASSE & NIVEL\s+(.{2,80}?)\s+ANTECEDENTE(?:\s+NOME DO JOGADOR)?\s+(.{2,80}?)\s+RACA\s+(.{2,80}?)\s+ALINHAMENTO/i,
  )
  const name = cleanIdentityValue(roll20Header?.[1]) || findIdentityValue(compact, ['Nome do Personagem', 'Character Name'], ['Nome do Jogador', 'Classe'])
  const classText = cleanIdentityValue(roll20Header?.[2]) || findIdentityValue(compact, ['Classe e Nível', 'Classe e Nivel', 'Class & Level'], ['Antecedente', 'Raça'])
  const background = cleanIdentityValue(roll20Header?.[3]) || findIdentityValue(compact, ['Antecedente', 'Background'], ['Nome do Jogador', 'Raça'])
  const race = cleanIdentityValue(roll20Header?.[4]) || findIdentityValue(compact, ['Raça', 'Raca', 'Race'], ['Alinhamento', 'Alignment', 'XP'])
  const alignment = cleanIdentityValue(roll20Header?.[5]) || findIdentityValue(compact, ['Alinhamento', 'Alignment'], ['Experiência', 'XP'])

  const classParsed = (classText.match(/([A-Za-zÀ-ÿ -]+)\s+(\d+)/) ?? ['', '', '0']) as RegExpMatchArray
  if (!name) warnings.push(makeWarning('NAME_NOT_FOUND', 'Nome do personagem não encontrado.', 'identity.name'))
  if (!classText) warnings.push(makeWarning('CLASS_NOT_FOUND', 'Classe/nível não encontrados.', 'identity.classText'))

  return {
    name: field(name, name ? 'high' : 'low', name),
    classText: field(classText, classText ? 'high' : 'low', classText),
    classes: classParsed[1] ? [{ name: classParsed[1].trim(), level: Number(classParsed[2] || 0) }] : [],
    background: field(background, background ? 'high' : 'low', background),
    race: field(race, race ? 'medium' : 'low', race),
    alignment: field(alignment, alignment ? 'high' : 'low', alignment),
    xp: field(null, 'low'),
  }
}

function cleanIdentityValue(value: string | undefined): string {
  return (value ?? '').replace(/^--- PAGE \d+ ---\s*/i, '').trim()
}

function findIdentityValue(compact: string, labels: string[], stopLabels: string[]): string {
  for (const label of labels) {
    const stop = stopLabels.map((item) => compactText(item)).join('|')
    const match = compact.match(new RegExp(`${compactText(label)}\\s*:?\\s*(.{2,80}?)(?=\\s+(?:${stop})\\b|$)`, 'i'))
    const value = match?.[1]?.trim()
    if (value) return value
  }
  return ''
}

function parseProficiencies(compact: string): NormalizedCharacter['proficiencies'] {
  const tools = ['Carpenter\'s Tools', 'Cartographer\'s Tools', 'Cook\'s Utensils', 'Smith\'s Tools'].filter((tool) =>
    compact.match(new RegExp(compactText(tool), 'i')),
  )
  return {
    tools: field(tools, tools.length ? 'high' : 'low'),
    languages: field([], 'low'),
    weapons: field([], 'low'),
    armor: field([], 'low'),
  }
}

export const abilityKeys: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
