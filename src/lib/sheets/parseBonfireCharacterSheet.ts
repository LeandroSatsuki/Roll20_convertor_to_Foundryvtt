import { field } from '../normalize/confidence'
import type { AbilityKey, ConversionWarning, FieldValue, NormalizedAttack, NormalizedCharacter, NormalizedEquipment, NormalizedFeature, SkillKey, SkillValue } from '../character/normalizedCharacterTypes'
import { abilityModifier, compactText, makeWarning, parseSignedNumber } from '../parser/parserUtils'
import { inferSkill, skillDefinitions } from '../parser/parseSkills'
import { defaultBonfireRuleStore } from '../rules/bonfireRuleStore'
import { resolveFeature } from '../rules/featureResolver'
import { resolveWeaponOrEquipment } from '../rules/weaponResolver'
import { detectBestCharacterSheet, findAnchorCell } from './detectSheetTemplate'
import { normalizeSheetCellValue } from './readWorkbook'
import { bonfireSheetAnchors, sectionAnchorAliases } from './sheetAnchors'
import type { NameCandidate, SheetCell, SheetCharacterParseResult, SheetParseDebugInfo, WorkbookData, WorkbookSheet } from './sheetTypes'

const abilityLabels: Record<AbilityKey, string[]> = {
  str: ['FORCA', 'STR', 'STRENGTH'],
  dex: ['DESTREZA', 'DEX', 'DEXTERITY'],
  con: ['CONSTITUICAO', 'CON', 'CONSTITUTION'],
  int: ['INTELIGENCIA', 'INT', 'INTELLIGENCE'],
  wis: ['SABEDORIA', 'WIS', 'WISDOM'],
  cha: ['CARISMA', 'CHA', 'CHARISMA'],
}

const identityLabels = {
  name: ['NOME DO PERSONAGEM', 'PERSONAGEM', 'NOME', 'CHARACTER NAME'],
  classText: ['CLASSE(S) & NIVEL(EIS)', 'CLASSE & NIVEL', 'CLASSE', 'CLASS & LEVEL', 'CLASSES & LEVELS'],
  race: ['RACA', 'RACE'],
  background: ['ANTECEDENTE', 'BACKGROUND'],
  alignment: ['ALINHAMENTO', 'ALIGNMENT'],
  player: ['JOGADOR', 'PLAYER'],
}

const combatLabels = {
  ac: ['CA', 'AC', 'ARMOR CLASS', 'CLASSE DE ARMADURA'],
  initiative: ['INICIATIVA', 'INITIATIVE'],
  hpMax: ['PV MAXIMO', 'PONTOS DE VIDA', 'PONTOS DE VIDA MAXIMO', 'HP', 'HIT POINTS', 'MAX HIT POINTS', 'HIT POINT MAXIMUM'],
  speed: ['DESLOCAMENTO', 'SPEED', 'VELOCIDADE'],
  passivePerception: ['SABEDORIA PASSIVA', 'PERCEPCAO PASSIVA', 'PASSIVE PERCEPTION'],
}

const featureSectionAliases = [
  sectionAnchorAliases.features,
  sectionAnchorAliases.generalFeats,
  sectionAnchorAliases.racialFeats,
  sectionAnchorAliases.extraFeats,
  ['CARACTERISTICAS & TRACOS', 'FEATURES', 'TRAITS'],
]

const globalAnchorLabels = new Set(
  [
    ...bonfireSheetAnchors,
    ...Object.values(sectionAnchorAliases).flat(),
    ...Object.values(identityLabels).flat(),
    ...Object.values(abilityLabels).flat(),
    ...Object.values(combatLabels).flat(),
    'ITEM',
    'CUSTO',
    'PESO',
    'MAGIAS',
    'SPELLS',
    'ATAQUES',
    'ARMA',
    'WEAPON',
    'TABELA DE CLASSE',
  ].map(normalizeSheetCellValue),
)

const criticalFieldPaths = [
  'identity.name',
  'identity.classText',
  'identity.race',
  'identity.background',
  'identity.alignment',
  'abilities.str.score',
  'abilities.dex.score',
  'abilities.con.score',
  'abilities.int.score',
  'abilities.wis.score',
  'abilities.cha.score',
  'attributes.ac',
  'attributes.hp.max',
  'attributes.speed',
  'proficiencyBonus',
  'attributes.passivePerception',
]

export function isUrlLike(value: unknown): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

export function isImageUrlLike(value: unknown): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim()) && /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(value.trim())
}

export function isProbablyTableHeaderOrNoise(value: string): boolean {
  const normalized = normalizeSheetCellValue(value).replace(/\s+/g, ' ')
  if (!normalized) return true
  if (isUrlLike(value)) return true
  if (/^nivel\s+(1|4|8|12|16|19)$/.test(normalized)) return true
  if (/^(custo|peso|#|item|resistencias|imunidades|vulnerabilidades|associated skills|total|atual|quantidade|qtd|qty)$/.test(normalized)) return true
  if (/^(priceless|gratis|free)$/.test(normalized)) return true
  if (/^[+-]?\d+(?:[.,]\d+)?$/.test(normalized)) return true
  if (/^\d+[.,]?\s*(gp|po|sp|pp|cp|ep|lb|lbs|kg)\.?$/.test(normalized)) return true
  if (/^\d+\.\s*(gp|po|sp|pp|cp|ep)\.?$/.test(normalized)) return true
  if (/^(gp|po|sp|pp|cp|ep|lb|lbs|kg)$/.test(normalized)) return true
  return false
}

type ParseSheetOptions = {
  selectedSheetName?: string
  includeHiddenSheets?: boolean
}

export function parseBonfireCharacterSheet(workbook: WorkbookData, options: ParseSheetOptions = {}): SheetCharacterParseResult {
  const selectedBy = options.selectedSheetName ? 'manual' : 'auto'
  const detection = detectBestCharacterSheet(workbook, options)
  const warnings: ConversionWarning[] = [...detection.warnings]
  const sheet = detection.sheetName ? workbook.sheets.find((candidate) => candidate.name === detection.sheetName) : undefined

  const debug: SheetParseDebugInfo = {
    workbookFileName: workbook.fileName,
    sheetNames: workbook.sheetNames,
    selectedSheetName: sheet?.name ?? null,
    selectedBy,
    selectedSheetScore: detection.score,
    confidence: detection.confidence,
    parseBlockedReason: detection.rejectionReasons.join(', ') || undefined,
    anchorsFound: detection.anchorsFound.map((anchor) => ({ label: anchor.label, address: anchor.cell, value: anchor.value })),
    sheetCandidates: detection.candidates,
    nameCandidates: [],
    extractedFields: [],
  }

  if (!sheet) {
    const character = createEmptyCharacter(workbook, warnings)
    character.warnings.push(makeWarning('SHEET_PARSE_BLOCKED_LOW_CONFIDENCE', 'Nenhuma aba de ficha foi detectada automaticamente; selecione a aba manualmente.', 'source.template', undefined, 'error'))
    ensureCriticalDebugFields(debug)
    return buildResult(workbook, detection, debug, character)
  }

  if (detection.confidence === 'low' || detection.rejectionReasons.includes('auxiliary-data')) {
    const character = createEmptyCharacter(workbook, warnings)
    const code = detection.rejectionReasons.includes('auxiliary-data') ? 'SHEET_LOOKS_LIKE_AUXILIARY_DATA' : 'SHEET_PARSE_BLOCKED_LOW_CONFIDENCE'
    const message =
      code === 'SHEET_LOOKS_LIKE_AUXILIARY_DATA'
        ? 'A aba selecionada parece ser uma aba auxiliar/lista de dados, nao uma ficha de personagem.'
        : 'Template nao detectado; dados nao foram preenchidos com defaults silenciosos.'
    character.warnings.push(makeWarning(code, message, 'source.template', sheet.name, 'error'))
    ensureCriticalDebugFields(debug)
    return buildResult(workbook, detection, debug, character)
  }

  const avatar = findAvatarUrl(sheet, debug)
  const name = parseCharacterName(sheet, warnings, debug)
  const player = valueForLabels(sheet, identityLabels.player, warnings, debug, 'identity.player', false)
  const classText = valueForLabels(sheet, identityLabels.classText, warnings, debug, 'identity.classText')
  const race = valueForLabels(sheet, identityLabels.race, warnings, debug, 'identity.race')
  const background = valueForLabels(sheet, identityLabels.background, warnings, debug, 'identity.background')
  const alignment = valueForLabels(sheet, identityLabels.alignment, warnings, debug, 'identity.alignment', false)
  const parsedClass = parseClassText(classText.value)
  const abilities = parseAbilitiesFromSheet(sheet, warnings, debug)
  const proficiencyBonus = parseNumberField(sheet, ['BONUS DE PROFICIENCIA', 'PROFICIENCIA'], warnings, debug, 'proficiencyBonus', false)
  const skills = parseSkillsFromSheet(sheet, abilities, proficiencyBonus.value ?? 0, warnings, debug)
  const features = parseFeaturesFromSheet(sheet, parsedClass, race.value, background.value, warnings)
  const equipment = parseEquipmentFromSheet(sheet, warnings)
  const attacks = equipment.filter((item) => item.category === 'weapon').map<NormalizedAttack>((item) => {
    const rule = resolveWeaponOrEquipment(item.name.value)
    return {
      name: item.name,
      attackBonus: field(null, 'low', item.raw),
      damageFormula: field(rule?.damage ?? null, rule?.damage ? 'medium' : 'low', item.raw),
      damageType: field(rule?.damageType ?? null, rule?.damageType ? 'medium' : 'low', item.raw),
      category: 'weapon',
      raw: item.raw,
    }
  })

  const character: NormalizedCharacter = {
    source: { type: 'bonfire-xlsx', fileName: workbook.fileName, extractedAt: new Date().toISOString() },
    identity: {
      name,
      classText,
      classes: parsedClass.name ? [{ name: parsedClass.name, level: parsedClass.level }] : [],
      background,
      race,
      alignment,
      xp: field(null, 'low'),
    },
    media: avatar ? { avatarUrl: field(avatar.value, 'high', avatar.raw) } : undefined,
    abilities,
    proficiencyBonus: proficiencyBonus as NormalizedCharacter['proficiencyBonus'],
    saves: parseSavesFromClass(abilities, parsedClass.name, proficiencyBonus.value ?? 0),
    skills,
    attributes: {
      ac: parseNullableNumberField(sheet, combatLabels.ac, warnings, debug, 'attributes.ac'),
      initiative: parseNullableNumberField(sheet, combatLabels.initiative, warnings, debug, 'attributes.initiative', false),
      speed: parseNullableNumberField(sheet, combatLabels.speed, warnings, debug, 'attributes.speed'),
      speedUnits: 'ft',
      passivePerception: parseNullableNumberField(sheet, combatLabels.passivePerception, warnings, debug, 'attributes.passivePerception', false),
      hp: {
        value: parseNullableNumberField(sheet, ['PV ATUAL', 'PONTOS DE VIDA ATUAIS', 'CURRENT HIT POINTS'], warnings, debug, 'attributes.hp.value', false),
        max: parseNullableNumberField(sheet, combatLabels.hpMax, warnings, debug, 'attributes.hp.max'),
        temp: field(null, 'low'),
        tempMax: field(null, 'low'),
      },
      hitDice: { total: field(parsedClass.level || null, parsedClass.level ? 'medium' : 'low'), spent: field(null, 'low') },
      senses: { darkvision: field(null, 'low') },
    },
    currency: { cp: field(0, 'medium'), sp: field(0, 'medium'), ep: field(0, 'medium'), gp: parseNumberField(sheet, ['PO', 'GP', 'OURO'], warnings, debug, 'currency.gp', false, 0) as FieldValue<number>, pp: field(0, 'medium') },
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
        recovery: field('sr' as const, 'medium', feature.raw, ['Recupera 1 no descanso curto e todos no descanso longo; Foundry pode exigir revisao manual.']),
        shouldBecomeItem: true,
        raw: feature.raw,
      })),
    spells: buildClericSpellcasting(parsedClass.name, parsedClass.level),
    warnings,
  }

  addCriticalParserWarnings(character)
  if (player.value) character.warnings.push(makeWarning('PLAYER_NAME_PRESERVED', `Jogador informado na planilha: ${player.value}.`, 'source.player', player.raw, 'info'))
  ensureCriticalDebugFields(debug)
  return buildResult(workbook, detection, debug, character)
}

export function parseEquipmentTable(sheet: WorkbookSheet): Array<{ value: string; raw: string }> {
  const section = findAnchorCell(sheet, sectionAnchorAliases.equipment)
  if (!section) return []

  const rowsToScan = getSectionRows(sheet, section, 32)
  const header = findEquipmentHeader(sheet, rowsToScan)
  const values: Array<{ value: string; raw: string }> = []

  if (header) {
    for (const row of rowsToScan.filter((row) => row > header.row)) {
      if (rowHasStopAnchor(sheet, row)) break
      const cell = getCellOrMerged(sheet, row, header.itemCol)
      const value = cell?.value.trim() ?? ''
      if (!isValidEquipmentName(value)) continue
      values.push({ value, raw: value })
    }
    return values
  }

  for (const row of rowsToScan) {
    if (rowHasStopAnchor(sheet, row)) break
    const rowCells = sheet.cells.filter((cell) => cell.row === row).sort((left, right) => left.col - right.col)
    const itemCell = rowCells.find((cell) => isValidEquipmentName(cell.value))
    if (itemCell) values.push({ value: itemCell.value.trim(), raw: itemCell.value.trim() })
  }
  return values
}

function buildResult(workbook: WorkbookData, detection: ReturnType<typeof detectBestCharacterSheet>, debug: SheetParseDebugInfo, character: NormalizedCharacter): SheetCharacterParseResult {
  return {
    character,
    rawWorkbookMeta: {
      sheetNames: workbook.sheetNames,
      detectedTemplate: detection.confidence === 'low' ? 'unknown' : 'bonfire-character-sheet',
      confidence: detection.confidence,
      selectedSheetName: debug.selectedSheetName,
      selectedSheetScore: detection.score,
      selectedBy: debug.selectedBy,
      anchorsFound: debug.anchorsFound,
      sheetCandidates: detection.candidates,
    },
    debug,
    warnings: character.warnings,
  }
}

function parseCharacterName(sheet: WorkbookSheet, warnings: ConversionWarning[], debug: SheetParseDebugInfo): FieldValue<string> {
  const anchors = findAnchorCells(sheet, identityLabels.name)
  const candidates = anchors.flatMap((anchor) => collectNameCandidates(sheet, anchor))

  for (const candidate of candidates) {
    const rejectedReason = rejectNameCandidate(candidate.cell)
    debugField(debug, 'identity.name.candidate', candidate.cell, !rejectedReason, rejectedReason ?? `distance ${candidate.distance}`)
    debug.nameCandidates.push(toNameCandidate(candidate, !rejectedReason, rejectedReason ?? undefined))
    if (rejectedReason && isUrlLike(candidate.cell.value)) {
      warnings.push(makeWarning('NAME_CELL_LOOKS_LIKE_URL', 'Celula candidata a nome parece URL e foi rejeitada.', 'identity.name', `${candidate.cell.address}: ${candidate.cell.value}`, 'warning'))
    }
  }

  const accepted = candidates.filter((candidate) => !rejectNameCandidate(candidate.cell)).sort(scoreNameCandidate)[0]
  if (!accepted) {
    warnings.push(makeWarning('SHEET_FIELD_NOT_FOUND', 'Campo nao encontrado na planilha: NOME DO PERSONAGEM.', 'identity.name'))
    debugField(debug, 'identity.name', undefined, false, 'not found')
    return field('', 'low')
  }

  debugField(debug, 'identity.name', accepted.cell, true, `anchor ${accepted.anchor.address}`)
  return field(accepted.cell.value.trim(), 'high', `${accepted.anchor.address} ${accepted.anchor.value}: ${accepted.cell.address} ${accepted.cell.value}`)
}

function collectNameCandidates(sheet: WorkbookSheet, anchor: SheetCell): Array<{ anchor: SheetCell; cell: SheetCell; distance: number; preference: number; strategy: string }> {
  const positions: Array<{ row: number; col: number; preference: number; strategy: string }> = [
    ...Array.from({ length: 5 }, (_, index) => ({ row: anchor.row - index - 1, col: anchor.col, preference: index, strategy: 'above-same-column' })),
    ...Array.from({ length: 8 }, (_, index) => ({ row: anchor.row, col: anchor.col + index + 1, preference: index + 5, strategy: 'right-same-row' })),
    ...Array.from({ length: 5 }, (_, rowIndex) =>
      Array.from({ length: 8 }, (_, colIndex) => ({ row: anchor.row - rowIndex - 1, col: anchor.col + colIndex + 1, preference: 20 + rowIndex + colIndex, strategy: 'above-right-region' })),
    ).flat(),
    { row: anchor.row - 1, col: anchor.col + 1, preference: 40, strategy: 'label-below-field' },
    { row: anchor.row + 1, col: anchor.col, preference: 50, strategy: 'below-anchor' },
    { row: anchor.row + 1, col: anchor.col + 1, preference: 51, strategy: 'below-right-anchor' },
  ]
  return positions.flatMap((position) => {
    const cell = getCellOrMerged(sheet, position.row, position.col)
    if (!cell || cell.address === anchor.address) return []
    return [{ anchor, cell, distance: Math.abs(position.row - anchor.row) + Math.abs(position.col - anchor.col), preference: position.preference, strategy: position.strategy }]
  })
}

function scoreNameCandidate(left: { cell: SheetCell; distance: number; preference: number }, right: { cell: SheetCell; distance: number; preference: number }): number {
  const leftScore = nameCandidateScore(left)
  const rightScore = nameCandidateScore(right)
  return rightScore - leftScore
}

function nameCandidateScore(candidate: { cell: SheetCell; distance: number; preference: number }): number {
  const value = candidate.cell.value.trim()
  let score = 100 - candidate.distance * 12 - candidate.preference
  if (/[a-zA-ZÀ-ÿ]/.test(value)) score += 20
  if (value !== value.toUpperCase()) score += 8
  if (/\s/.test(value)) score += 3
  return score
}

function rejectNameCandidate(cell: SheetCell): string | null {
  const value = cell.value.trim()
  if (!value) return 'empty'
  if (isUrlLike(value)) return isImageUrlLike(value) ? 'image URL cannot be character name' : 'URL cannot be character name'
  if (isAnchorLabel(value)) return 'candidate is another label/anchor'
  if (isProbablyTableHeaderOrNoise(value)) return 'candidate is table header/noise'
  if (/^(artifice|artificer|associated skills|bludgeoning|piercing|slashing)$/i.test(normalizeSheetCellValue(value))) return 'candidate is auxiliary-list value'
  if (!/[a-zA-ZÀ-ÿ]/.test(value)) return 'candidate has no letters'
  return null
}

function toNameCandidate(candidate: { cell: SheetCell; distance: number; strategy: string }, accepted: boolean, rejectedReason?: string): NameCandidate {
  return {
    value: candidate.cell.value,
    address: candidate.cell.address,
    strategy: candidate.strategy,
    distance: candidate.distance,
    accepted,
    rejectedReason,
  }
}

function valueForLabels(sheet: WorkbookSheet, labels: string[], warnings: ConversionWarning[], debug: SheetParseDebugInfo, fieldPath: string, required = true): FieldValue<string> {
  for (const candidate of findCandidateValuesNearLabels(sheet, labels)) {
    const rejectedReason = isUrlLike(candidate.value.value) ? 'URL rejected' : isAnchorLabel(candidate.value.value) || isProbablyTableHeaderOrNoise(candidate.value.value) ? 'label/noise rejected' : null
    if (rejectedReason) {
      debugField(debug, fieldPath, candidate.value, false, rejectedReason)
      continue
    }
    debugField(debug, fieldPath, candidate.value, true, `anchor ${candidate.anchor.address}`)
    return field(candidate.value.value, 'high', `${candidate.anchor.value}: ${candidate.value.value}`)
  }
  if (required) warnings.push(makeWarning('SHEET_FIELD_NOT_FOUND', `Campo nao encontrado na planilha: ${labels[0]}.`, fieldPath))
  debugField(debug, fieldPath, undefined, false, 'not found')
  return field('', 'low')
}

function parseNumberField(sheet: WorkbookSheet, labels: string[], warnings: ConversionWarning[], debug: SheetParseDebugInfo, fieldPath: string, required = true, fallback: number | null = null): FieldValue<number | null> {
  const found = findNumericValueNearLabels(sheet, labels)
  if (found) {
    debugField(debug, fieldPath, found.cell, true, `anchor ${found.anchor.address}`)
    return field(found.value, 'high', `${found.anchor.value}: ${found.cell.value}`)
  }
  if (required) warnings.push(makeWarning('SHEET_NUMBER_NOT_FOUND', `Numero nao encontrado na planilha: ${labels[0]}.`, fieldPath))
  debugField(debug, fieldPath, undefined, false, 'not found')
  return field(fallback, fallback === null ? 'low' : 'medium')
}

function parseNullableNumberField(sheet: WorkbookSheet, labels: string[], warnings: ConversionWarning[], debug: SheetParseDebugInfo, fieldPath: string, required = true): FieldValue<number | null> {
  return parseNumberField(sheet, labels, warnings, debug, fieldPath, required)
}

function parseAbilitiesFromSheet(sheet: WorkbookSheet, warnings: ConversionWarning[], debug: SheetParseDebugInfo): NormalizedCharacter['abilities'] {
  const abilities = {} as NormalizedCharacter['abilities']
  for (const key of Object.keys(abilityLabels) as AbilityKey[]) {
    const found = findAbilityScore(sheet, abilityLabels[key])
    if (!found) {
      warnings.push(makeWarning('SHEET_ABILITY_NOT_FOUND', `Atributo nao encontrado: ${abilityLabels[key][0]}.`, `abilities.${key}.score`, undefined, 'error'))
      debugField(debug, `abilities.${key}.score`, undefined, false, 'not found')
      abilities[key] = { score: field(null as unknown as number, 'low'), mod: field(null as unknown as number, 'low') }
      continue
    }
    const mod = found.mod ?? abilityModifier(found.score)
    debugField(debug, `abilities.${key}.score`, found.scoreCell, true, `anchor ${found.anchor.address}`)
    if (found.modCell) debugField(debug, `abilities.${key}.mod`, found.modCell, true, `anchor ${found.anchor.address}`)
    abilities[key] = { score: field(found.score, 'high', `${found.anchor.value}: ${found.scoreCell.value}`), mod: field(mod, found.modCell ? 'high' : 'medium', found.modCell?.value) }
  }
  return abilities
}

function parseSavesFromClass(abilities: NormalizedCharacter['abilities'], className: string, proficiencyBonus: number): NormalizedCharacter['saves'] {
  const clericSaves = compactText(className).toLowerCase().includes('clerigo') ? new Set<AbilityKey>(['wis', 'cha']) : new Set<AbilityKey>()
  return Object.fromEntries(
    (Object.keys(abilities) as AbilityKey[]).map((key) => {
      const proficient = clericSaves.has(key)
      const abilityMod = typeof abilities[key].mod.value === 'number' ? abilities[key].mod.value : null
      const total = abilityMod === null ? null : abilityMod + (proficient ? proficiencyBonus : 0)
      return [key, { total: field(total as unknown as number, total === null ? 'low' : 'medium'), proficient: field(proficient, proficient ? 'medium' : 'low'), bonus: field(0, 'high') }]
    }),
  ) as NormalizedCharacter['saves']
}

function parseSkillsFromSheet(sheet: WorkbookSheet, abilities: NormalizedCharacter['abilities'], proficiencyBonus: number, warnings: ConversionWarning[], debug: SheetParseDebugInfo): Record<SkillKey, SkillValue> {
  const skills = {} as Record<SkillKey, SkillValue>
  const section = findAnchorCell(sheet, sectionAnchorAliases.skills)
  if (!section) warnings.push(makeWarning('SKILLS_SECTION_NOT_FOUND', 'Secao de pericias nao encontrada; totais nao foram preenchidos com 0.', 'skills'))

  for (const key of Object.keys(skillDefinitions) as SkillKey[]) {
    const definition = skillDefinitions[key]
    const aliases = definition.aliases.flatMap((alias) => (alias === 'Arcanismo' ? [alias, 'Arcana'] : alias === 'Adestrar Animais' ? [alias, 'Lidar com Animais'] : [alias]))
    const found = section ? findSkillValue(sheet, section, aliases) : null
    const abilityMod = typeof abilities[definition.ability].mod.value === 'number' ? abilities[definition.ability].mod.value : null

    if (!found || abilityMod === null) {
      if (section) warnings.push(makeWarning('SHEET_SKILL_NOT_FOUND', `Pericia nao encontrada: ${definition.labelPtBr}.`, `skills.${key}`))
      debugField(debug, `skills.${key}.total`, found?.cell, false, found ? 'ability modifier missing' : 'not found')
      skills[key] = {
        labelPtBr: definition.labelPtBr,
        ability: definition.ability,
        total: field(null as unknown as number, 'low', found?.cell.value),
        proficiencyLevel: field(0 as const, 'low', found?.cell.value),
        bonus: field(null as unknown as number, 'low', found?.cell.value),
      }
      continue
    }

    const inferred = inferSkill(found.value, abilityMod, proficiencyBonus)
    debugField(debug, `skills.${key}.total`, found.cell, true, `anchor ${found.anchor.address}`)
    skills[key] = {
      labelPtBr: definition.labelPtBr,
      ability: definition.ability,
      total: field(found.value, 'high', found.cell.value),
      proficiencyLevel: field(inferred.proficiencyLevel, inferred.bonus === 0 ? 'high' : 'medium', found.cell.value),
      bonus: field(inferred.bonus, inferred.bonus === 0 ? 'high' : 'medium', found.cell.value),
    }
  }
  return skills
}

function parseFeaturesFromSheet(sheet: WorkbookSheet, parsedClass: { name: string; level: number; subclass?: string }, race: string, background: string, warnings: ConversionWarning[]): NormalizedFeature[] {
  const sections = [
    { label: 'CARACTERISTICAS DE CLASSE E RACA', aliases: sectionAnchorAliases.features },
    { label: 'TALENTOS GERAIS', aliases: sectionAnchorAliases.generalFeats },
    { label: 'TALENTOS DE RACA', aliases: sectionAnchorAliases.racialFeats },
    { label: 'TALENTOS EXTRAS', aliases: sectionAnchorAliases.extraFeats },
    { label: 'CARACTERISTICAS & TRACOS', aliases: ['CARACTERISTICAS & TRACOS', 'FEATURES', 'TRAITS'] },
  ]
  const features: NormalizedFeature[] = []
  for (const section of sections) {
    const values = collectFeatureSectionValues(sheet, section.aliases)
    if (!values.length) warnings.push(makeWarning('SHEET_SECTION_EMPTY', `Secao sem valores detectados: ${section.label}.`, 'features', section.label, 'info'))
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

function collectFeatureSectionValues(sheet: WorkbookSheet, labels: string[]): Array<{ value: string; raw: string }> {
  const cell = findAnchorCell(sheet, labels)
  if (!cell) return []
  const values: Array<{ value: string; raw: string }> = []
  for (const row of getSectionRows(sheet, cell, 36)) {
    if (rowHasFeatureStop(sheet, row)) break
    for (let col = cell.col; col <= Math.min(maxRowCol(sheet, row), cell.col + 4); col += 1) {
      const candidate = getCellOrMerged(sheet, row, col)
      const value = candidate?.value.trim() ?? ''
      if (!value || isFeatureBoundary(value) || isProbablyTableHeaderOrNoise(value)) continue
      values.push({ value, raw: value })
    }
  }
  return values
}

function parseEquipmentFromSheet(sheet: WorkbookSheet, warnings: ConversionWarning[]): NormalizedEquipment[] {
  const values = parseEquipmentTable(sheet)
  if (!values.length) warnings.push(makeWarning('SHEET_EQUIPMENT_NOT_FOUND', 'Equipamentos nao encontrados por ancora.', 'equipment'))
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
  const values = collectSimpleSectionValues(sheet, sectionAnchorAliases.languagesTools).map((value) => value.value)
  const languages = values.filter((value) => /comum|elfico|pequenino/i.test(compactText(value)))
  return {
    tools: field(values.filter((value) => !languages.includes(value)), values.length ? 'medium' : 'low'),
    languages: field(languages, languages.length ? 'high' : 'low'),
    weapons: field(['Armas Simples'], values.length ? 'medium' : 'low'),
    armor: field(['Armaduras Leves', 'Armaduras Medias', 'Escudos'], values.length ? 'medium' : 'low'),
  }
}

function collectSimpleSectionValues(sheet: WorkbookSheet, labels: string[]): Array<{ value: string; raw: string }> {
  const cell = findAnchorCell(sheet, labels)
  if (!cell) return []
  const values: Array<{ value: string; raw: string }> = []
  for (const row of getSectionRows(sheet, cell, 18)) {
    if (rowHasStopAnchor(sheet, row)) break
    for (let col = cell.col; col <= Math.min(maxRowCol(sheet, row), cell.col + 3); col += 1) {
      const candidate = getCellOrMerged(sheet, row, col)
      const value = candidate?.value.trim() ?? ''
      if (!value || isProbablyTableHeaderOrNoise(value) || isFeatureBoundary(value)) continue
      values.push({ value, raw: value })
    }
  }
  return values
}

function findCandidateValuesNearLabels(sheet: WorkbookSheet, labels: string[]): Array<{ anchor: SheetCell; value: SheetCell }> {
  const anchors = findAnchorCells(sheet, labels)
  return anchors.flatMap((anchor) => {
    const positions = [
      [anchor.row, anchor.col + 1],
      [anchor.row, anchor.col + 2],
      [anchor.row, anchor.col + 3],
      [anchor.row + 1, anchor.col],
      [anchor.row + 1, anchor.col + 1],
      [anchor.row - 1, anchor.col],
      [anchor.row, anchor.col - 1],
    ]
    return positions.flatMap(([row, col]) => {
      const cell = getCellOrMerged(sheet, row, col)
      return cell && cell.address !== anchor.address ? [{ anchor, value: cell }] : []
    })
  })
}

function findNumericValueNearLabels(sheet: WorkbookSheet, labels: string[]): { anchor: SheetCell; cell: SheetCell; value: number } | null {
  for (const candidate of findCandidateValuesNearLabels(sheet, labels)) {
    if (isAnchorLabel(candidate.value.value) || isUrlLike(candidate.value.value)) continue
    const parsed = parseSignedNumber(candidate.value.value)
    if (parsed !== null) return { anchor: candidate.anchor, cell: candidate.value, value: parsed }
  }
  return null
}

function findAbilityScore(sheet: WorkbookSheet, labels: string[]): { anchor: SheetCell; scoreCell: SheetCell; score: number; modCell?: SheetCell; mod?: number } | null {
  const candidates = findCandidateValuesNearLabels(sheet, labels)
    .map((candidate) => ({ ...candidate, parsed: parseSignedNumber(candidate.value.value) }))
    .filter((candidate): candidate is { anchor: SheetCell; value: SheetCell; parsed: number } => candidate.parsed !== null)

  const scoreCandidate = candidates.find((candidate) => candidate.parsed >= 1 && candidate.parsed <= 30)
  if (!scoreCandidate) return null
  const modCandidate = candidates.find((candidate) => candidate.value.address !== scoreCandidate.value.address && candidate.parsed >= -5 && candidate.parsed <= 10)
  return { anchor: scoreCandidate.anchor, scoreCell: scoreCandidate.value, score: scoreCandidate.parsed, modCell: modCandidate?.value, mod: modCandidate?.parsed }
}

function findSkillValue(sheet: WorkbookSheet, section: SheetCell, aliases: string[]): { anchor: SheetCell; cell: SheetCell; value: number } | null {
  const maxRow = Math.min(sheet.rows.length - 1, section.row + 40)
  const normalizedAliases = aliases.map(normalizeSheetCellValue)
  const labelCell = sheet.cells.find((cell) => cell.row > section.row && cell.row <= maxRow && normalizedAliases.some((alias) => cell.normalized === alias || cell.normalized.includes(alias)))
  if (!labelCell) return null
  const candidates = [getCellOrMerged(sheet, labelCell.row, labelCell.col + 1), getCellOrMerged(sheet, labelCell.row, labelCell.col - 1), getCellOrMerged(sheet, labelCell.row, labelCell.col + 2), getCellOrMerged(sheet, labelCell.row + 1, labelCell.col)].filter(Boolean) as SheetCell[]
  for (const cell of candidates) {
    const parsed = parseSignedNumber(cell.value)
    if (parsed !== null) return { anchor: labelCell, cell, value: parsed }
  }
  return null
}

function findAnchorCells(sheet: WorkbookSheet, aliases: string[]): SheetCell[] {
  const normalizedAliases = aliases.map(normalizeSheetCellValue)
  return sheet.cells.filter((cell) => normalizedAliases.includes(cell.normalized) || normalizedAliases.some((alias) => alias.length >= 3 && cell.normalized.includes(alias)))
}

function getCellOrMerged(sheet: WorkbookSheet, row: number, col: number): SheetCell | null {
  const direct = sheet.cells.find((cell) => cell.row === row && cell.col === col)
  if (direct) return direct
  const merge = sheet.merges.find((candidate) => row >= candidate.startRow && row <= candidate.endRow && col >= candidate.startCol && col <= candidate.endCol)
  if (!merge) return null
  return sheet.cells.find((cell) => cell.row === merge.startRow && cell.col === merge.startCol) ?? null
}

function findAvatarUrl(sheet: WorkbookSheet, debug: SheetParseDebugInfo): { value: string; raw: string } | null {
  const found = sheet.cells.find((cell) => cell.row <= 12 && isImageUrlLike(cell.value))
  if (!found) {
    debugField(debug, 'media.avatarUrl', undefined, false, 'not found')
    return null
  }
  debugField(debug, 'media.avatarUrl', found, true, 'image URL in top sheet region')
  return { value: found.value, raw: `${found.address}: ${found.value}` }
}

function getSectionRows(sheet: WorkbookSheet, anchor: SheetCell, maxRows: number): number[] {
  const max = Math.min(sheet.rows.length - 1, anchor.row + maxRows)
  return Array.from({ length: max - anchor.row }, (_, index) => anchor.row + index + 1)
}

function rowHasFeatureStop(sheet: WorkbookSheet, row: number): boolean {
  return sheet.cells.some((cell) => cell.row === row && isFeatureBoundary(cell.value))
}

function rowHasStopAnchor(sheet: WorkbookSheet, row: number): boolean {
  return sheet.cells.some((cell) => cell.row === row && (isFeatureBoundary(cell.value) || isAnchorLabel(cell.value)))
}

function isFeatureBoundary(value: string): boolean {
  const normalized = normalizeSheetCellValue(value).replace(/\s+/g, ' ')
  if (featureSectionAliases.some((aliases) => aliases.map(normalizeSheetCellValue).includes(normalized))) return true
  return /^(mochila|mochila & equipamento|equipamento|item|custo|peso|resistencias|imunidades|vulnerabilidades|idiomas|idiomas e ferramentas|magias|spells|ataques|arma|weapon|tabela de classe)$/.test(normalized) || /^nivel\s+(1|4|8|12|16|19)$/.test(normalized)
}

function findEquipmentHeader(sheet: WorkbookSheet, rows: number[]): { row: number; itemCol: number } | null {
  for (const row of rows.slice(0, 6)) {
    const item = sheet.cells.find((cell) => cell.row === row && normalizeSheetCellValue(cell.value) === 'item')
    if (!item) continue
    const headers = sheet.cells.filter((cell) => cell.row === row).map((cell) => cell.normalized)
    if (headers.includes('custo') || headers.includes('peso') || headers.includes('#')) return { row, itemCol: item.col }
  }
  return null
}

function isValidEquipmentName(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (isProbablyTableHeaderOrNoise(trimmed)) return false
  if (isFeatureBoundary(trimmed) || isAnchorLabel(trimmed)) return false
  if (!/[a-zA-ZÀ-ÿ]/.test(trimmed)) return false
  return true
}

function maxRowCol(sheet: WorkbookSheet, row: number): number {
  return Math.max(0, ...sheet.cells.filter((cell) => cell.row === row).map((cell) => cell.col))
}

function isAnchorLabel(value: string): boolean {
  return globalAnchorLabels.has(normalizeSheetCellValue(value))
}

function normalizeFeatureRecovery(recovery: string): 'sr' | 'lr' | 'charges' | 'none' | 'unknown' {
  if (recovery === 'sr-lr') return 'sr'
  if (recovery === 'sr' || recovery === 'lr' || recovery === 'charges' || recovery === 'none') return recovery
  return 'unknown'
}

function parseClassText(value: string): { name: string; level: number; subclass?: string } {
  const match = value.match(/(.+?)\s*(\d+)\s*$/)
  if (!match) return { name: value.trim(), level: 0 }
  return { name: match[1].trim(), level: Number(match[2]) }
}

function buildClericSpellcasting(className: string, level: number): NormalizedCharacter['spells'] {
  const isCleric = compactText(className).toLowerCase().includes('clerigo')
  const levels: NormalizedCharacter['spells']['levels'] = {}
  const slots = isCleric && level >= 5 ? [0, 4, 3, 2, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let spellLevel = 1; spellLevel <= 9; spellLevel += 1) {
    levels[`spell${spellLevel}`] = { slotsMax: field(slots[spellLevel], isCleric ? 'high' : 'medium'), slotsUsed: field(0, 'medium'), spells: [] }
  }
  return { spellcastingClass: field(isCleric ? 'Clerigo' : null, isCleric ? 'high' : 'low'), ability: field(isCleric ? 'wis' : null, isCleric ? 'high' : 'low'), saveDc: field(null, 'low'), attackBonus: field(null, 'low'), cantrips: [], levels }
}

function createEmptyCharacter(workbook: WorkbookData, warnings: ConversionWarning[]): NormalizedCharacter {
  const abilities = Object.fromEntries((Object.keys(abilityLabels) as AbilityKey[]).map((key) => [key, { score: field(null as unknown as number, 'low'), mod: field(null as unknown as number, 'low') }])) as NormalizedCharacter['abilities']
  const saves = Object.fromEntries((Object.keys(abilityLabels) as AbilityKey[]).map((key) => [key, { total: field(null as unknown as number, 'low'), proficient: field(false, 'low'), bonus: field(null as unknown as number, 'low') }])) as NormalizedCharacter['saves']
  const skills = Object.fromEntries(
    (Object.keys(skillDefinitions) as SkillKey[]).map((key) => {
      const definition = skillDefinitions[key]
      return [key, { labelPtBr: definition.labelPtBr, ability: definition.ability, total: field(null as unknown as number, 'low'), proficiencyLevel: field(0 as const, 'low'), bonus: field(null as unknown as number, 'low') }]
    }),
  ) as Record<SkillKey, SkillValue>

  return {
    source: { type: 'bonfire-xlsx', fileName: workbook.fileName, extractedAt: new Date().toISOString() },
    identity: { name: field('', 'low'), classText: field('', 'low'), classes: [], background: field('', 'low'), race: field('', 'low'), alignment: field('', 'low'), xp: field(null, 'low') },
    abilities,
    proficiencyBonus: field(null as unknown as number, 'low'),
    saves,
    skills,
    attributes: {
      ac: field(null, 'low'),
      initiative: field(null, 'low'),
      speed: field(null, 'low'),
      speedUnits: null,
      passivePerception: field(null, 'low'),
      hp: { value: field(null, 'low'), max: field(null, 'low'), temp: field(null, 'low'), tempMax: field(null, 'low') },
      hitDice: { total: field(null, 'low'), spent: field(null, 'low') },
      senses: { darkvision: field(null, 'low') },
    },
    currency: { cp: field(0, 'low'), sp: field(0, 'low'), ep: field(0, 'low'), gp: field(0, 'low'), pp: field(0, 'low') },
    proficiencies: { tools: field([], 'low'), languages: field([], 'low'), weapons: field([], 'low'), armor: field([], 'low') },
    attacks: [],
    equipment: [],
    features: [],
    resources: [],
    spells: buildClericSpellcasting('', 0),
    warnings,
  }
}

function addCriticalParserWarnings(character: NormalizedCharacter) {
  if (isUrlLike(character.identity.name.value)) character.warnings.push(makeWarning('CHARACTER_NAME_IS_URL', 'Nome do personagem parece URL; exportacao bloqueada ate revisao.', 'identity.name', character.identity.name.value, 'error'))
  if (!character.identity.name.value.trim()) character.warnings.push(makeWarning('SHEET_CHARACTER_NAME_MISSING', 'Nome do personagem nao encontrado; exportacao bloqueada ate revisao.', 'identity.name', undefined, 'error'))
  for (const key of Object.keys(abilityLabels) as AbilityKey[]) {
    if (typeof character.abilities[key].score.value !== 'number') character.warnings.push(makeWarning('SHEET_ABILITY_SCORE_MISSING', `Atributo ausente ou invalido: ${key}.`, `abilities.${key}.score`, undefined, 'error'))
  }
  if (typeof character.attributes.ac.value !== 'number') character.warnings.push(makeWarning('SHEET_AC_MISSING', 'CA ausente ou invalida; exportacao bloqueada ate revisao.', 'attributes.ac', undefined, 'error'))
  if (typeof character.attributes.hp.max.value !== 'number') character.warnings.push(makeWarning('SHEET_HP_MAX_MISSING', 'PV maximo ausente ou invalido; exportacao bloqueada ate revisao.', 'attributes.hp.max', undefined, 'error'))
}

function ensureCriticalDebugFields(debug: SheetParseDebugInfo) {
  const present = new Set(debug.extractedFields.map((entry) => entry.fieldPath))
  for (const fieldPath of criticalFieldPaths) {
    if (!present.has(fieldPath)) debugField(debug, fieldPath, undefined, false, 'not evaluated')
  }
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

function debugField(debug: SheetParseDebugInfo, fieldPath: string, cell: SheetCell | undefined, accepted: boolean, reason?: string) {
  debug.extractedFields.push({
    fieldPath,
    cellAddress: cell?.address,
    rawValue: cell?.value,
    normalizedValue: cell ? normalizeSheetCellValue(cell.value) : undefined,
    inheritedFromMerge: cell?.inheritedFromMerge,
    mergeSourceAddress: cell?.mergeSourceAddress,
    accepted,
    reason,
    rejectedReason: accepted ? undefined : reason,
  })
}
