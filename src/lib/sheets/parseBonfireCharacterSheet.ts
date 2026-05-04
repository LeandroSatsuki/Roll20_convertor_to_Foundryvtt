import { field } from '../normalize/confidence'
import type { AbilityKey, ConversionWarning, FieldValue, NormalizedAttack, NormalizedCharacter, NormalizedEquipment, NormalizedFeature, SkillKey, SkillValue } from '../character/normalizedCharacterTypes'
import { abilityModifier, compactText, makeWarning, parseSignedNumber } from '../parser/parserUtils'
import { inferSkill, skillDefinitions } from '../parser/parseSkills'
import { defaultBonfireRuleStore } from '../rules/bonfireRuleStore'
import { resolveFeature } from '../rules/featureResolver'
import { resolveWeaponOrEquipment } from '../rules/weaponResolver'
import { detectSheetTemplate } from './detectSheetTemplate'
import { bonfireSheetAnchors, sectionAnchorAliases } from './sheetAnchors'
import type { SheetCharacterParseResult, WorkbookCell, WorkbookData, WorkbookSheet } from './sheetTypes'

const abilityLabels: Record<AbilityKey, string[]> = {
  str: ['FORÇA', 'FORCA', 'STRENGTH'],
  dex: ['DESTREZA', 'DEXTERITY'],
  con: ['CONSTITUIÇÃO', 'CONSTITUICAO', 'CONSTITUTION'],
  int: ['INTELIGÊNCIA', 'INTELIGENCIA', 'INTELLIGENCE'],
  wis: ['SABEDORIA', 'WISDOM'],
  cha: ['CARISMA', 'CHARISMA'],
}

export function parseBonfireCharacterSheet(workbook: WorkbookData): SheetCharacterParseResult {
  const detection = detectSheetTemplate(workbook)
  const warnings: ConversionWarning[] = [...detection.warnings]
  const sheet = pickMainSheet(workbook)
  if (!sheet) throw new Error('Workbook sem abas legíveis.')

  const name = valueForLabels(sheet, ['PERSONAGEM', 'NOME DO PERSONAGEM', 'CHARACTER NAME'], warnings, 'identity.name')
  const player = valueForLabels(sheet, ['JOGADOR', 'PLAYER'], warnings, 'identity.player', false)
  const classText = valueForLabels(sheet, ['CLASSE(S) & NÍVEL(EIS)', 'CLASSES & LEVELS', 'CLASSE/NÍVEL', 'CLASSE'], warnings, 'identity.classText')
  const race = valueForLabels(sheet, ['RAÇA', 'RACA', 'RACE'], warnings, 'identity.race')
  const background = valueForLabels(sheet, ['ANTECEDENTE', 'BACKGROUND'], warnings, 'identity.background')
  const parsedClass = parseClassText(classText.value)
  const abilities = parseAbilitiesFromSheet(sheet, warnings)
  const proficiencyBonus = parseNumberField(sheet, ['BÔNUS DE PROFICIÊNCIA', 'BONUS DE PROFICIENCIA', 'PROFICIÊNCIA', 'PROFICIENCIA'], 3, warnings, 'proficiencyBonus')
  const skills = parseSkillsFromSheet(sheet, abilities, proficiencyBonus.value, warnings)
  const features = parseFeaturesFromSheet(sheet, parsedClass, race.value, background.value, warnings)
  const equipment = parseEquipmentFromSheet(sheet, warnings)
  const attacks = equipment.filter((item) => item.category === 'weapon').map<NormalizedAttack>((item) => ({
    name: item.name,
    attackBonus: field(null, 'low', item.raw),
    damageFormula: field(resolveWeaponOrEquipment(item.name.value)?.damage ?? null, resolveWeaponOrEquipment(item.name.value)?.damage ? 'medium' : 'low', item.raw),
    damageType: field(resolveWeaponOrEquipment(item.name.value)?.damageType ?? null, resolveWeaponOrEquipment(item.name.value)?.damageType ? 'medium' : 'low', item.raw),
    category: 'weapon',
    raw: item.raw,
  }))

  const character: NormalizedCharacter = {
    source: { type: 'bonfire-xlsx', fileName: workbook.fileName, extractedAt: new Date().toISOString() },
    identity: {
      name,
      classText,
      classes: parsedClass.name ? [{ name: parsedClass.name, level: parsedClass.level }] : [],
      background,
      race,
      alignment: field('', 'low'),
      xp: field(null, 'low'),
    },
    abilities,
    proficiencyBonus,
    saves: parseSavesFromClass(abilities, parsedClass.name, proficiencyBonus.value),
    skills,
    attributes: {
      ac: parseNullableNumberField(sheet, ['CA', 'AC', 'CLASSE DE ARMADURA'], warnings, 'attributes.ac'),
      initiative: field(null, 'low'),
      speed: parseNullableNumberField(sheet, ['VELOCIDADE', 'DESLOCAMENTO', 'SPEED'], warnings, 'attributes.speed'),
      speedUnits: 'ft',
      passivePerception: parseNullableNumberField(sheet, ['PERCEPÇÃO PASSIVA', 'PERCEPCAO PASSIVA', 'PASSIVE PERCEPTION'], warnings, 'attributes.passivePerception'),
      hp: {
        value: parseNullableNumberField(sheet, ['PV ATUAL', 'PONTOS DE VIDA ATUAIS'], warnings, 'attributes.hp.value', false),
        max: parseNullableNumberField(sheet, ['PV MÁXIMO', 'PV MAXIMO', 'PONTOS DE VIDA MÁXIMO'], warnings, 'attributes.hp.max'),
        temp: field(null, 'low'),
        tempMax: field(null, 'low'),
      },
      hitDice: { total: field(parsedClass.level || null, parsedClass.level ? 'medium' : 'low'), spent: field(null, 'low') },
      senses: { darkvision: field(null, 'low') },
    },
    currency: { cp: field(0, 'medium'), sp: field(0, 'medium'), ep: field(0, 'medium'), gp: parseNumberField(sheet, ['PO', 'GP', 'OURO'], 0, warnings, 'currency.gp', false), pp: field(0, 'medium') },
    proficiencies: parseProficiencies(sheet),
    attacks,
    equipment,
    features,
    resources: features
      .filter((feature) => /canalizar divindade/i.test(feature.name.value))
      .map((feature) => ({
        label: feature.name,
        value: field(2, 'medium', feature.raw),
        max: field(2, 'high', feature.raw),
        recovery: field('sr' as const, 'medium', feature.raw, ['Recupera 1 no descanso curto e todos no descanso longo; Foundry pode exigir revisão manual.']),
        shouldBecomeItem: true,
        raw: feature.raw,
      })),
    spells: buildClericSpellcasting(parsedClass.name, parsedClass.level),
    warnings,
  }

  if (player.value) {
    character.warnings.push(makeWarning('PLAYER_NAME_PRESERVED', `Jogador informado na planilha: ${player.value}.`, 'source.player', player.raw, 'info'))
  }

  return {
    character,
    rawWorkbookMeta: {
      sheetNames: workbook.sheetNames,
      detectedTemplate: detection.detectedTemplate,
      confidence: detection.confidence,
    },
    warnings: character.warnings,
  }
}

function pickMainSheet(workbook: WorkbookData): WorkbookSheet | undefined {
  return workbook.sheets.find((sheet) => sheet.cells.some((cell) => compactText(cell.value).includes('PERSONAGEM'))) ?? workbook.sheets[0]
}

function valueForLabels(sheet: WorkbookSheet, labels: string[], warnings: ConversionWarning[], fieldPath: string, required = true): FieldValue<string> {
  const found = findValueNearLabels(sheet, labels)
  if (found) return field(found.value, 'high', found.raw)
  if (required) warnings.push(makeWarning('SHEET_FIELD_NOT_FOUND', `Campo não encontrado na planilha: ${labels[0]}.`, fieldPath))
  return field('', 'low')
}

function parseNumberField(sheet: WorkbookSheet, labels: string[], fallback: number, warnings: ConversionWarning[], fieldPath: string, required = true): FieldValue<number> {
  const found = findValueNearLabels(sheet, labels)
  const parsed = parseSignedNumber(found?.value)
  if (parsed !== null) return field(parsed, 'high', found?.raw)
  if (required) warnings.push(makeWarning('SHEET_NUMBER_NOT_FOUND', `Número não encontrado na planilha: ${labels[0]}.`, fieldPath, found?.raw))
  return field(fallback, required ? 'low' : 'medium', found?.raw)
}

function parseNullableNumberField(sheet: WorkbookSheet, labels: string[], warnings: ConversionWarning[], fieldPath: string, required = true): FieldValue<number | null> {
  const found = findValueNearLabels(sheet, labels)
  const parsed = parseSignedNumber(found?.value)
  if (parsed !== null) return field(parsed, 'high', found?.raw)
  if (required) warnings.push(makeWarning('SHEET_NUMBER_NOT_FOUND', `Número não encontrado na planilha: ${labels[0]}.`, fieldPath, found?.raw))
  return field(null, 'low', found?.raw)
}

function parseAbilitiesFromSheet(sheet: WorkbookSheet, warnings: ConversionWarning[]): NormalizedCharacter['abilities'] {
  const abilities = {} as NormalizedCharacter['abilities']
  for (const key of Object.keys(abilityLabels) as AbilityKey[]) {
    const score = parseNumberField(sheet, abilityLabels[key], 10, warnings, `abilities.${key}.score`)
    abilities[key] = { score, mod: field(abilityModifier(score.value), score.confidence, score.raw) }
  }
  return abilities
}

function parseSavesFromClass(abilities: NormalizedCharacter['abilities'], className: string, proficiencyBonus: number): NormalizedCharacter['saves'] {
  const clericSaves = compactText(className).toLowerCase().includes('clerigo') ? new Set<AbilityKey>(['wis', 'cha']) : new Set<AbilityKey>()
  return Object.fromEntries(
    (Object.keys(abilities) as AbilityKey[]).map((key) => {
      const proficient = clericSaves.has(key)
      const total = abilities[key].mod.value + (proficient ? proficiencyBonus : 0)
      return [key, { total: field(total, 'medium'), proficient: field(proficient, proficient ? 'medium' : 'low'), bonus: field(0, 'high') }]
    }),
  ) as NormalizedCharacter['saves']
}

function parseSkillsFromSheet(sheet: WorkbookSheet, abilities: NormalizedCharacter['abilities'], proficiencyBonus: number, warnings: ConversionWarning[]): Record<SkillKey, SkillValue> {
  const skills = {} as Record<SkillKey, SkillValue>
  for (const key of Object.keys(skillDefinitions) as SkillKey[]) {
    const definition = skillDefinitions[key]
    const aliases = definition.aliases.flatMap((alias) => (alias === 'Arcanismo' ? [alias, 'Arcana'] : alias === 'Adestrar Animais' ? [alias, 'Lidar com Animais'] : [alias]))
    const found = findValueNearLabels(sheet, aliases)
    const total = parseSignedNumber(found?.value)
    if (total === null) warnings.push(makeWarning('SHEET_SKILL_NOT_FOUND', `Perícia não encontrada: ${definition.labelPtBr}.`, `skills.${key}`))
    const finalTotal = total ?? abilities[definition.ability].mod.value
    const inferred = inferSkill(finalTotal, abilities[definition.ability].mod.value, proficiencyBonus)
    skills[key] = {
      labelPtBr: definition.labelPtBr,
      ability: definition.ability,
      total: field(finalTotal, found ? 'high' : 'low', found?.raw),
      proficiencyLevel: field(inferred.proficiencyLevel, inferred.bonus === 0 ? 'high' : 'medium', found?.raw),
      bonus: field(inferred.bonus, inferred.bonus === 0 ? 'high' : 'medium', found?.raw),
    }
  }
  return skills
}

function parseFeaturesFromSheet(sheet: WorkbookSheet, parsedClass: { name: string; level: number; subclass?: string }, race: string, background: string, warnings: ConversionWarning[]): NormalizedFeature[] {
  const sections = [
    { label: 'CARACTERÍSTICAS DE CLASSE E RAÇA', type: 'class' as const, aliases: sectionAnchorAliases.features },
    { label: 'TALENTOS GERAIS', type: 'feat' as const, aliases: sectionAnchorAliases.generalFeats },
    { label: 'TALENTOS DE RAÇA', type: 'race' as const, aliases: sectionAnchorAliases.racialFeats },
    { label: 'TALENTOS EXTRAS', type: 'feat' as const, aliases: sectionAnchorAliases.extraFeats },
  ]
  const features: NormalizedFeature[] = []
  for (const section of sections) {
    const values = collectSectionValues(sheet, section.aliases)
    if (!values.length) warnings.push(makeWarning('SHEET_SECTION_EMPTY', `Seção sem valores detectados: ${section.label}.`, 'features', section.label, 'info'))
    for (const value of values) {
      const resolution = resolveFeature(value.value, { className: parsedClass.name, level: parsedClass.level, race, background, subclass: parsedClass.subclass, section: section.label }, defaultBonfireRuleStore)
      features.push({
        name: field(resolution.resolvedName, resolution.confidence, value.raw, resolution.warnings.map((warning) => warning.message)),
        sourceType: resolution.kind === 'raceFeature' ? 'race' : resolution.kind === 'subclassFeature' ? 'subclass' : resolution.kind === 'feat' ? 'feat' : resolution.kind === 'backgroundFeature' ? 'background' : resolution.kind === 'unknown' ? 'other' : 'class',
        description: field(resolution.description ?? value.value, resolution.description ? 'high' : 'low', value.raw),
        uses: resolution.uses ? { value: field(null, 'low'), max: field(typeof resolution.uses.max === 'number' ? resolution.uses.max : null, 'medium'), recovery: normalizeFeatureRecovery(resolution.uses.recovery) } : undefined,
        activation: resolution.activation ? { type: resolution.activation === 'action' ? 'action' : 'unknown' } : undefined,
        raw: value.raw,
      })
      warnings.push(...resolution.warnings)
    }
  }
  return dedupeByName(features)
}

function normalizeFeatureRecovery(recovery: string): 'sr' | 'lr' | 'charges' | 'none' | 'unknown' {
  if (recovery === 'sr-lr') return 'sr'
  if (recovery === 'sr' || recovery === 'lr' || recovery === 'charges' || recovery === 'none') return recovery
  return 'unknown'
}

function parseEquipmentFromSheet(sheet: WorkbookSheet, warnings: ConversionWarning[]): NormalizedEquipment[] {
  const values = collectSectionValues(sheet, sectionAnchorAliases.equipment)
  if (!values.length) warnings.push(makeWarning('SHEET_EQUIPMENT_NOT_FOUND', 'Equipamentos não encontrados por âncora.', 'equipment'))
  return values.map((value) => {
    const rule = resolveWeaponOrEquipment(value.value)
    return {
      name: field(rule?.name ?? value.value, rule ? 'high' : 'medium', value.raw),
      quantity: field(1, 'medium', value.raw),
      category: rule?.category === 'armor' || rule?.category === 'shield' ? 'armor' : rule?.category === 'simple' || rule?.category === 'martial' ? 'weapon' : rule?.category === 'consumable' ? 'consumable' : rule?.category === 'focus' ? 'tool' : 'equipment',
      raw: value.raw,
    }
  })
}

function parseProficiencies(sheet: WorkbookSheet): NormalizedCharacter['proficiencies'] {
  const values = collectSectionValues(sheet, sectionAnchorAliases.languagesTools).map((value) => value.value)
  const languages = values.filter((value) => /comum|elfico|élfico|pequenino/i.test(value))
  return {
    tools: field(values.filter((value) => !languages.includes(value)), values.length ? 'medium' : 'low'),
    languages: field(languages, languages.length ? 'high' : 'low'),
    weapons: field(['Armas Simples'], 'medium'),
    armor: field(['Armaduras Leves', 'Armaduras Médias', 'Escudos'], 'medium'),
  }
}

function buildClericSpellcasting(className: string, level: number): NormalizedCharacter['spells'] {
  const isCleric = compactText(className).toLowerCase().includes('clerigo')
  const levels: NormalizedCharacter['spells']['levels'] = {}
  const slots = isCleric && level >= 5 ? [0, 4, 3, 2, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let spellLevel = 1; spellLevel <= 9; spellLevel += 1) {
    levels[`spell${spellLevel}`] = { slotsMax: field(slots[spellLevel], isCleric ? 'high' : 'medium'), slotsUsed: field(0, 'medium'), spells: [] }
  }
  return { spellcastingClass: field(isCleric ? 'Clérigo' : null, isCleric ? 'high' : 'low'), ability: field(isCleric ? 'wis' : null, isCleric ? 'high' : 'low'), saveDc: field(null, 'low'), attackBonus: field(null, 'low'), cantrips: [], levels }
}

function parseClassText(value: string): { name: string; level: number; subclass?: string } {
  const match = value.match(/(.+?)\s*(\d+)\s*$/)
  if (!match) return { name: value.trim(), level: 0 }
  return { name: match[1].trim(), level: Number(match[2]) }
}

function findValueNearLabels(sheet: WorkbookSheet, labels: string[]): { value: string; raw: string } | null {
  const anchors = labels.map((label) => compactText(label))
  const cell = sheet.cells.find((candidate) => anchors.includes(compactText(candidate.value)))
  if (!cell) return null
  const candidates = [
    getCell(sheet, cell.row, cell.col + 1),
    getCell(sheet, cell.row, cell.col + 2),
    getCell(sheet, cell.row + 1, cell.col),
    getCell(sheet, cell.row + 1, cell.col + 1),
    getCell(sheet, cell.row - 1, cell.col),
  ].filter(Boolean) as WorkbookCell[]
  const found = candidates.find((candidate) => candidate.value && !anchors.includes(compactText(candidate.value)))
  return found ? { value: found.value, raw: `${cell.value}: ${found.value}` } : null
}

function collectSectionValues(sheet: WorkbookSheet, labels: string[]): Array<{ value: string; raw: string }> {
  const anchors = labels.map((label) => compactText(label))
  const cell = sheet.cells.find((candidate) => anchors.includes(compactText(candidate.value)))
  if (!cell) return []
  const values: Array<{ value: string; raw: string }> = []
  for (let row = cell.row + 1; row <= Math.min(sheet.rows.length - 1, cell.row + 18); row += 1) {
    for (let col = cell.col; col <= Math.min((sheet.rows[row]?.length ?? 0) - 1, cell.col + 4); col += 1) {
      const value = String(sheet.rows[row]?.[col] ?? '').trim()
      if (!value || isIgnoredSectionValue(value)) continue
      if ([...bonfireSheetAnchors, ...Object.values(sectionAnchorAliases).flat()].some((anchor) => compactText(anchor) === compactText(value))) return values
      values.push({ value, raw: value })
    }
  }
  return values
}

function getCell(sheet: WorkbookSheet, row: number, col: number): WorkbookCell | undefined {
  const value = String(sheet.rows[row]?.[col] ?? '').trim()
  return value ? { value, row, col } : undefined
}

function isIgnoredSectionValue(value: string): boolean {
  return /^[-:]+$/.test(value) || /^\d+$/.test(value) || /^(total|atual|po|gp|cp|sp|ep|pp)$/i.test(value)
}

function dedupeByName(features: NormalizedFeature[]): NormalizedFeature[] {
  const seen = new Set<string>()
  return features.filter((feature) => {
    const key = compactText(feature.name.value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
