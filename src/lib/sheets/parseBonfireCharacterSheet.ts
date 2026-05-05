import { field } from '../normalize/confidence'
import type { AbilityKey, ConversionWarning, FieldValue, NormalizedAttack, NormalizedCharacter, NormalizedEquipment, NormalizedFeature, SkillKey, SkillValue } from '../character/normalizedCharacterTypes'
import { abilityModifier, compactText, makeWarning, parseSignedNumber } from '../parser/parserUtils'
import { inferSkill, skillDefinitions } from '../parser/parseSkills'
import { defaultBonfireRuleStore } from '../rules/bonfireRuleStore'
import { resolveFeature } from '../rules/featureResolver'
import { resolveWeaponOrEquipment } from '../rules/weaponResolver'
import { detectBestCharacterSheet, findAnchorCell } from './detectSheetTemplate'
import { normalizeSheetCellValue } from './readWorkbook'
import { bonfireSheetAnchors, matchesAnyAnchor, sectionAnchorAliases } from './sheetAnchors'
import type { ExtractedFieldDebugEntry, NameCandidate, SheetCell, SheetCharacterParseResult, SheetParseDebugInfo, SheetRegionCandidate, WorkbookData, WorkbookSheet } from './sheetTypes'
import { foundryId } from '../foundry/ids'
import { bonfireV21AbilitySpecs, bonfireV21EquipmentRangeSources, bonfireV21FieldSpecs, bonfireV21SaveRangeSources, bonfireV21SkillLabelRangeSources, bonfireV21SkillValueRangeSources, bonfireV21SpellRanges, bonfireV21Template } from './templates/bonfireV21Template'
import { getCellsFromWorkbookRef, getSheet as getWorkbookSheet } from './templates/cellRange'
import { getNamedRangeValue, normalizeNamedRangeRef } from './templates/namedRanges'

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

const PARSER_VERSION = '2.7.0'
const PARSER_BUILD_ID = '2026-05-05-bonfire-v21-template'
const PARSER_SOURCE_MARKER = 'bonfire-v21-template-fixed'

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
  selectedRegionIndex?: number
  selectedTemplateId?: 'bonfire-log-v2' | 'bonfire-v2.1' | 'automatic'
  includeHiddenSheets?: boolean
}

export function parseBonfireCharacterSheet(workbook: WorkbookData, options: ParseSheetOptions = {}): SheetCharacterParseResult {
  const requestedTemplateId = resolveRequestedTemplateId(workbook, options)
  if (requestedTemplateId === 'bonfire-v2.1') return parseBonfireV21Workbook(workbook, options)

  const parseRunId = `parse-${foundryId(12)}`
  const normalizedCharacterId = `normalized-${foundryId(12)}`
  const detection = detectBestCharacterSheet(workbook, { ...options, selectedTemplateId: options.selectedTemplateId === 'bonfire-log-v2' ? 'bonfire-log-v2' : undefined })
  const warnings: ConversionWarning[] = [...detection.warnings]
  const sourceSheet = detection.selectedSheetName ? workbook.sheets.find((candidate) => candidate.name === detection.selectedSheetName) : undefined
  const sheet = sourceSheet && detection.selectedRegion ? restrictSheetToRegion(sourceSheet, detection.selectedRegion) : undefined

  const debug: SheetParseDebugInfo = {
    workbookFileName: workbook.fileName,
    parserVersion: PARSER_VERSION,
    parserBuildId: PARSER_BUILD_ID,
    parseRunId,
    normalizedCharacterId,
    actorBuildId: null,
    auditBuildId: null,
    generatedAt: new Date().toISOString(),
    sourceCodeMarker: PARSER_SOURCE_MARKER,
    templateUsed: detection.templateId ?? 'automatic',
    readMode: 'automatic',
    sheetNames: workbook.sheetNames,
    selectedSheets: detection.selectedSheetName ? [detection.selectedSheetName] : [],
    ignoredSheets: workbook.sheetNames.filter((sheetName) => sheetName !== detection.selectedSheetName),
    templateId: detection.templateId,
    templateParserUsed: undefined,
    parseBonfireLogV2SheetCalled: false,
    selectedSheetName: sourceSheet?.name ?? null,
    selectedRegion: detection.selectedRegion,
    selectedBy: detection.selectedBy,
    selectedSheetScore: detection.score,
    confidence: detection.confidence,
    parseBlockedReason: detection.rejectionReasons.join(', ') || undefined,
    anchorsFound: detection.anchorsFound.map((anchor) => ({ label: anchor.label, address: anchor.cell, value: anchor.value })),
    sheetCandidates: detection.candidates,
    regionCandidates: detection.regionCandidates,
    ignoredOutsideRegion: detection.selectedRegion?.ignoredOutsideRegion ?? [],
    discardedDuplicateAnchors: detection.discardedDuplicateAnchors,
    blockedNameMatches: [],
    nameCandidates: [],
    abilityBlockCandidates: [],
    extractedFields: [],
    extractionAttempts: [],
    finalExtractedFields: [],
  }

  if (!sheet || !detection.selectedRegion) {
    const character = createEmptyCharacter(workbook, warnings, parseRunId, normalizedCharacterId)
    character.warnings.push(makeWarning('SHEET_TEMPLATE_LOW_CONFIDENCE', 'A planilha nao foi reconhecida como ficha Bonfire. Verifique se voce exportou a aba correta como .xlsx.', 'source.template', detection.selectedSheetName ?? undefined, 'error'))
    character.warnings.push(makeWarning('SHEET_CHARACTER_REGION_NOT_FOUND', 'Não encontrei a região principal da ficha. Selecione manualmente a aba/região.', 'source.region', detection.selectedSheetName ?? undefined, 'error'))
    ensureCriticalDebugFields(debug)
    return buildResult(workbook, detection, debug, character)
  }

  if (detection.selectedRegion.confidence === 'low') {
    const character = createEmptyCharacter(workbook, warnings, parseRunId, normalizedCharacterId)
    character.warnings.push(
      makeWarning(
        'SHEET_TEMPLATE_LOW_CONFIDENCE',
        'A planilha nao foi reconhecida com confianca suficiente como ficha Bonfire. Verifique se a aba/regiao escolhida e a ficha principal.',
        'source.template',
        (detection.selectedSheetName ?? detection.sheetName) || undefined,
        'error',
      ),
    )
    character.warnings.push(
      makeWarning(
        'SHEET_PARSE_BLOCKED_LOW_CONFIDENCE',
        'A importacao foi bloqueada porque a aba/regiao selecionada parece nao ser a ficha principal.',
        'source.region',
        (detection.selectedSheetName ?? detection.sheetName) || undefined,
        'error',
      ),
    )
    ensureCriticalDebugFields(debug)
    return buildResult(workbook, detection, debug, character)
  }

  if (detection.rejectionReasons.includes('auxiliary-data')) {
    const character = createEmptyCharacter(workbook, warnings, parseRunId, normalizedCharacterId)
    character.warnings.push(makeWarning('SHEET_LOOKS_LIKE_AUXILIARY_DATA', 'A região selecionada parece ser uma região auxiliar/lista de dados, nao uma ficha de personagem.', 'source.region', sheet.name, 'error'))
    ensureCriticalDebugFields(debug)
    return buildResult(workbook, detection, debug, character)
  }

  const avatar = findAvatarUrl(sheet, debug)
  const bonfireLogV2 =
    detection.templateId === 'bonfire-log-v2'
      ? (() => {
          debug.templateParserUsed = 'parseBonfireLogV2Sheet'
          debug.parseBonfireLogV2SheetCalled = true
          return parseBonfireLogV2Sheet(sheet, detection.selectedRegion, warnings, debug)
        })()
      : null
  const identity = bonfireLogV2?.identity ?? {
    name: parseCharacterName(sheet, warnings, debug),
    player: valueForLabels(sheet, identityLabels.player, warnings, debug, 'identity.player', false),
    classText: valueForLabels(sheet, identityLabels.classText, warnings, debug, 'identity.classText'),
    race: valueForLabels(sheet, identityLabels.race, warnings, debug, 'identity.race'),
    background: valueForLabels(sheet, identityLabels.background, warnings, debug, 'identity.background'),
    alignment: valueForLabels(sheet, identityLabels.alignment, warnings, debug, 'identity.alignment', false),
  }
  const name = identity.name
  const player = identity.player
  const classText = identity.classText
  const race = identity.race
  const background = identity.background
  const alignment = identity.alignment
  const parsedClass = bonfireLogV2?.parsedClass ?? parseClassText(classText.value)
  const abilities = bonfireLogV2?.abilities ?? parseAbilitiesFromSheet(sheet, warnings, debug)
  const proficiencyBonus = bonfireLogV2?.proficiencyBonus ?? parseNumberField(sheet, ['BONUS DE PROFICIENCIA', 'PROFICIENCIA'], warnings, debug, 'proficiencyBonus', false)
  const skills = bonfireLogV2?.skills ?? parseSkillsFromSheet(sheet, abilities, proficiencyBonus.value ?? 0, warnings, debug)
  const features = bonfireLogV2?.features ?? parseFeaturesFromSheet(sheet, parsedClass, race.value, background.value, warnings)
  const equipment = bonfireLogV2?.equipment ?? parseEquipmentFromSheet(sheet, warnings)
  const combat = bonfireLogV2?.combat ?? null
  const gp = bonfireLogV2?.gp ?? (parseNumberField(sheet, ['PO', 'GP', 'OURO'], warnings, debug, 'currency.gp', false, 0) as FieldValue<number>)
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
      player,
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
      ac: combat?.ac ?? parseNullableNumberField(sheet, combatLabels.ac, warnings, debug, 'attributes.ac'),
      initiative: combat?.initiative ?? parseNullableNumberField(sheet, combatLabels.initiative, warnings, debug, 'attributes.initiative', false),
      speed: combat?.speed ?? parseNullableNumberField(sheet, combatLabels.speed, warnings, debug, 'attributes.speed'),
      speedUnits: 'ft',
      passivePerception: combat?.passivePerception ?? parseNullableNumberField(sheet, combatLabels.passivePerception, warnings, debug, 'attributes.passivePerception', false),
      hp: {
        value: parseNullableNumberField(sheet, ['PV ATUAL', 'PONTOS DE VIDA ATUAIS', 'CURRENT HIT POINTS'], warnings, debug, 'attributes.hp.value', false),
        max: combat?.hpMax ?? parseNullableNumberField(sheet, combatLabels.hpMax, warnings, debug, 'attributes.hp.max'),
        temp: field(null, 'low'),
        tempMax: field(null, 'low'),
      },
      hitDice: { total: field(parsedClass.level || null, parsedClass.level ? 'medium' : 'low'), spent: field(null, 'low') },
      senses: { darkvision: field(null, 'low') },
    },
    currency: { cp: field(0, 'medium'), sp: field(0, 'medium'), ep: field(0, 'medium'), gp, pp: field(0, 'medium') },
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
    pipeline: {
      parserBuildId: PARSER_BUILD_ID,
      parseRunId,
      normalizedCharacterId,
      actorBuildId: null,
      auditBuildId: null,
    },
    warnings,
  }

  if (detection.templateId === 'bonfire-log-v2' && debug.parseBonfireLogV2SheetCalled !== true) {
    character.warnings.push(
      makeWarning(
        'BONFIRE_LOG_V2_TEMPLATE_PARSER_NOT_CALLED',
        'Template bonfire-log-v2 detectado, mas parseBonfireLogV2Sheet nao foi chamado. Isso indica fluxo incorreto na UI/parser.',
        'source.template',
        detection.selectedSheetName ?? undefined,
        'error',
      ),
    )
  }

  finalizeExtractedFields(character, debug)
  debug.normalizedDebugSnapshot = {
    abilities: abilitySnapshot(character),
  }
  validateExtractedCharacter(character)
  addCriticalParserWarnings(character)
  if (player.value) character.warnings.push(makeWarning('PLAYER_NAME_PRESERVED', `Jogador informado na planilha: ${player.value}.`, 'source.player', player.raw, 'info'))
  ensureCriticalDebugFields(debug)
  return buildResult(workbook, detection, debug, character)
}

const bonfireV21SkillOrder: SkillKey[] = ['acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'itm', 'inv', 'med', 'nat', 'prc', 'prf', 'per', 'rel', 'slt', 'ste', 'sur']
const bonfireV21AbilityOrder: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const bonfireV21SkillKeyOrder: SkillKey[] = ['acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'itm', 'inv', 'med', 'nat', 'prc', 'prf', 'per', 'rel', 'slt', 'ste', 'sur']

function resolveRequestedTemplateId(workbook: WorkbookData, options: ParseSheetOptions): 'bonfire-log-v2' | 'bonfire-v2.1' | undefined {
  if (options.selectedTemplateId === 'automatic') return undefined
  if (options.selectedTemplateId === 'bonfire-v2.1' || options.selectedTemplateId === 'bonfire-log-v2') return options.selectedTemplateId
  if (options.selectedSheetName || typeof options.selectedRegionIndex === 'number') return undefined
  return looksLikeBonfireV21Workbook(workbook) ? 'bonfire-v2.1' : undefined
}

function looksLikeBonfireV21Workbook(workbook: WorkbookData): boolean {
  return workbook.sheetNames.includes('LOG') && (workbook.sheetNames.includes('Personagem') || workbook.sheetNames.includes('Magias'))
}

function parseBonfireV21Workbook(workbook: WorkbookData, _options: ParseSheetOptions): SheetCharacterParseResult {
  const parseRunId = `parse-${foundryId(12)}`
  const normalizedCharacterId = `normalized-${foundryId(12)}`
  const selectedSheets = [...bonfireV21Template.selectedSheets]
  const ignoredSheets = workbook.sheetNames.filter((sheetName) => !selectedSheets.includes(sheetName))
  const logSheet = getWorkbookSheet(workbook, 'LOG')
  const debug: SheetParseDebugInfo = {
    workbookFileName: workbook.fileName,
    parserVersion: PARSER_VERSION,
    parserBuildId: PARSER_BUILD_ID,
    parseRunId,
    normalizedCharacterId,
    actorBuildId: null,
    auditBuildId: null,
    generatedAt: new Date().toISOString(),
    sourceCodeMarker: PARSER_SOURCE_MARKER,
    templateUsed: 'bonfire-v2.1',
    readMode: 'bonfire-v2.1',
    sheetNames: workbook.sheetNames,
    selectedSheets,
    ignoredSheets,
    templateId: 'bonfire-v2.1',
    templateParserUsed: 'parseBonfireV21Workbook',
    parseBonfireLogV2SheetCalled: false,
    selectedSheetName: logSheet?.name ?? 'LOG',
    selectedRegion: undefined,
    selectedBy: 'template',
    selectedSheetScore: 100,
    confidence: 'high',
    parseBlockedReason: undefined,
    anchorsFound: [],
    sheetCandidates: [],
    regionCandidates: [],
    ignoredOutsideRegion: [],
    discardedDuplicateAnchors: [],
    blockedNameMatches: [],
    nameCandidates: [],
    abilityBlockCandidates: [],
    extractedFields: [],
    extractionAttempts: [],
    finalExtractedFields: [],
  }
  const warnings: ConversionWarning[] = []

  if (!logSheet) {
    const character = createEmptyCharacter(workbook, warnings, parseRunId, normalizedCharacterId)
    addTemplateIssue(warnings, debug, {
      code: 'TEMPLATE_FIELD_MISSING',
      severity: 'error',
      message: 'A aba LOG e obrigatoria para o template Bonfire v2.1.',
      fieldPath: 'source.sheet.LOG',
      sourceType: 'static',
      source: 'LOG',
      accepted: false,
      reason: 'required LOG sheet missing',
    })
    ensureCriticalDebugFields(debug)
    return {
      character,
      rawWorkbookMeta: {
        sheetNames: workbook.sheetNames,
        selectedSheets,
        ignoredSheets,
        readMode: 'bonfire-v2.1',
        detectedTemplate: 'bonfire-v2.1',
        templateId: 'bonfire-v2.1',
        confidence: 'high',
        selectedSheetName: 'LOG',
        selectedSheetScore: 100,
        selectedBy: 'template',
        anchorsFound: [],
        sheetCandidates: [],
        regionCandidates: [],
        ignoredOutsideRegion: [],
      },
      debug,
      warnings: character.warnings,
    }
  }

  const identityName = resolveTemplateTextField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'identity.name')!)
  const classText = resolveTemplateTextField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'identity.classText')!)
  const player = resolveTemplateTextField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'identity.player')!, false)
  const race = resolveTemplateTextField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'identity.race')!)
  const background = resolveTemplateTextField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'identity.background')!)
  const proficiencyBonus = resolveTemplateNumberField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'proficiencyBonus')!) as NormalizedCharacter['proficiencyBonus']
  const ac = resolveTemplateNumberField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'attributes.ac')!)
  const hpMax = resolveTemplateNumberField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'attributes.hp.max')!)
  const speed = resolveTemplateMovementField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'attributes.speed')!)
  const passivePerception = resolveTemplateDirectNumberField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'attributes.passivePerception')!, false)
  const gpValue = resolveTemplateNumberField(workbook, debug, warnings, bonfireV21FieldSpecs.find((fieldSpec) => fieldSpec.fieldPath === 'currency.gp')!, false)
  const gp = (typeof gpValue.value === 'number' ? gpValue : { ...field(0, 'low'), source: 'bonfire-v2.1' }) as FieldValue<number>
  const parsedClass = parseClassText(classText.value)
  const abilities = parseBonfireV21Abilities(workbook, debug, warnings)
  const saves = parseBonfireV21Saves(workbook, abilities, proficiencyBonus.value ?? 0, debug, warnings)
  const skills = parseBonfireV21Skills(workbook, abilities, proficiencyBonus.value ?? 0, debug, warnings)
  const equipment = parseBonfireV21Equipment(workbook, debug, warnings)
  const features = buildBonfireV21Features(parsedClass, race.value, background.value)
  const spells = parseBonfireV21Spells(workbook, parsedClass, debug, warnings)
  const avatar = findAvatarUrl(logSheet, debug)

  const character: NormalizedCharacter = {
    source: { type: 'bonfire-xlsx', fileName: workbook.fileName, extractedAt: new Date().toISOString() },
    identity: {
      name: identityName,
      player,
      classText,
      classes: parsedClass.name ? [{ name: parsedClass.name, level: parsedClass.level }] : [],
      background,
      race,
      alignment: field('', 'low', undefined, undefined),
      xp: field(null, 'low'),
    },
    media: avatar ? { avatarUrl: { ...field(avatar.value, 'high', avatar.raw), source: 'bonfire-v2.1' } } : undefined,
    abilities,
    proficiencyBonus,
    saves,
    skills,
    attributes: {
      ac,
      initiative: field(null, 'low'),
      speed: speed.value,
      speedUnits: speed.units,
      passivePerception,
      hp: {
        value: field(null, 'low'),
        max: hpMax,
        temp: field(null, 'low'),
        tempMax: field(null, 'low'),
      },
      hitDice: { total: field(parsedClass.level || null, parsedClass.level ? 'medium' : 'low'), spent: field(null, 'low') },
      senses: { darkvision: field(null, 'low') },
    },
    currency: { cp: field(0, 'low'), sp: field(0, 'low'), ep: field(0, 'low'), gp, pp: field(0, 'low') },
    proficiencies: { tools: field([], 'low'), languages: field([], 'low'), weapons: field([], 'low'), armor: field([], 'low') },
    attacks: equipment
      .filter((item) => item.category === 'weapon')
      .map((item) => {
        const rule = resolveWeaponOrEquipment(item.name.value)
        return {
          name: item.name,
          attackBonus: field(null, 'low', item.raw),
          damageFormula: field(rule?.damage ?? null, rule?.damage ? 'medium' : 'low', item.raw),
          damageType: field(rule?.damageType ?? null, rule?.damageType ? 'medium' : 'low', item.raw),
          category: 'weapon' as const,
          raw: item.raw,
        }
      }),
    equipment,
    features,
    resources: [],
    spells,
    pipeline: {
      parserBuildId: PARSER_BUILD_ID,
      parseRunId,
      normalizedCharacterId,
      actorBuildId: null,
      auditBuildId: null,
    },
    warnings,
  }

  finalizeExtractedFields(character, debug)
  debug.normalizedDebugSnapshot = { abilities: abilitySnapshot(character) }
  validateExtractedCharacter(character)
  addCriticalParserWarnings(character)
  ensureCriticalDebugFields(debug)

  return {
    character,
    rawWorkbookMeta: {
      sheetNames: workbook.sheetNames,
      selectedSheets,
      ignoredSheets,
      readMode: 'bonfire-v2.1',
      detectedTemplate: 'bonfire-v2.1',
      templateId: 'bonfire-v2.1',
      confidence: 'high',
      selectedSheetName: 'LOG',
      selectedSheetScore: 100,
      selectedBy: 'template',
      anchorsFound: [],
      sheetCandidates: [],
      regionCandidates: [],
      ignoredOutsideRegion: [],
    },
    debug,
    warnings: character.warnings,
  }
}

function parseBonfireV21Abilities(workbook: WorkbookData, debug: SheetParseDebugInfo, warnings: ConversionWarning[]): NormalizedCharacter['abilities'] {
  const result = {} as NormalizedCharacter['abilities']
  for (const abilityKey of bonfireV21AbilityOrder) {
    const spec = bonfireV21AbilitySpecs[abilityKey]
    const modifier = resolveTemplateNumericSources(workbook, spec.modifierSources, `abilities.${abilityKey}.mod`, debug, warnings, false)
    const score = resolveTemplateNumericSources(workbook, spec.scoreSources, `abilities.${abilityKey}.score`, debug, warnings, false)
    const modifierOnly = modifier.value !== null && score.value === null
    if (modifierOnly) {
      const message = `O template encontrou apenas modificador de atributo para ${abilityKey}. Informe a celula ou named range do valor base do atributo.`
      warnings.push(makeWarning('ABILITY_SCORE_MISSING_MODIFIER_ONLY', message, `abilities.${abilityKey}.score`, modifier.raw, 'error'))
      markTemplateFieldIssue(debug, `abilities.${abilityKey}.score`, 'ABILITY_SCORE_MISSING_MODIFIER_ONLY', message)
    }

    let finalScore = score
    let finalModifier = modifier
    if (score.value !== null && modifier.value === null) {
      finalModifier = { ...field(abilityModifier(score.value), 'medium', score.raw), source: 'derived-from-score' }
      pushTemplateFinalField(debug, {
        fieldPath: `abilities.${abilityKey}.mod`,
        sourceType: 'derived',
        source: `abilities.${abilityKey}.score`,
        rawValue: score.raw,
        parsedValue: String(finalModifier.value),
        accepted: true,
        reason: 'calculated from score',
      })
    }

    result[abilityKey] = {
      score: { ...(finalScore as FieldValue<number>), source: finalScore.source ?? 'bonfire-v2.1' },
      mod: { ...(finalModifier as FieldValue<number>), source: finalModifier.source ?? 'bonfire-v2.1' },
    }
  }
  return result
}

function parseBonfireV21Saves(
  workbook: WorkbookData,
  abilities: NormalizedCharacter['abilities'],
  proficiencyBonus: number,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
): NormalizedCharacter['saves'] {
  const values = resolveTemplateNumberList(workbook, bonfireV21SaveRangeSources, 'saves', debug, warnings, false)
  const saves = {} as NormalizedCharacter['saves']
  for (const [index, abilityKey] of bonfireV21AbilityOrder.entries()) {
    const total = values[index] ?? null
    const abilityMod = abilities[abilityKey].mod.value
    const proficient = typeof total === 'number' && typeof abilityMod === 'number' ? total >= abilityMod + proficiencyBonus : false
    const bonus = typeof total === 'number' && typeof abilityMod === 'number' ? total - abilityMod - (proficient ? proficiencyBonus : 0) : null
    saves[abilityKey] = {
      total: { ...field((total ?? null) as unknown as number, total === null ? 'low' : 'medium', total === null ? undefined : String(total)), source: 'bonfire-v2.1' },
      proficient: { ...field(proficient, total === null ? 'low' : 'medium'), source: 'bonfire-v2.1' },
      bonus: { ...field((bonus ?? null) as unknown as number, total === null ? 'low' : 'medium'), source: 'bonfire-v2.1' },
    }
  }
  return saves
}

function parseBonfireV21Skills(
  workbook: WorkbookData,
  abilities: NormalizedCharacter['abilities'],
  proficiencyBonus: number,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
): Record<SkillKey, SkillValue> {
  const totals = resolveTemplateNumberList(workbook, bonfireV21SkillValueRangeSources, 'skills', debug, warnings, false)
  const labels = resolveTemplateTextList(workbook, bonfireV21SkillLabelRangeSources, 'skills.labels', debug, warnings, false)
  const orderedKeys = labels.length === bonfireV21SkillOrder.length ? remapSkillKeysFromLabels(labels) : bonfireV21SkillOrder
  const skills = {} as Record<SkillKey, SkillValue>

  bonfireV21SkillKeyOrder.forEach((skillKey, index) => {
    const definition = skillDefinitions[skillKey]
    const resolvedSkillKey = orderedKeys[index] ?? skillKey
    const resolvedDefinition = skillDefinitions[resolvedSkillKey]
    const total = totals[index] ?? null
    if (typeof total !== 'number') {
      warnings.push(makeWarning('TEMPLATE_FIELD_MISSING', `Pericia nao encontrada para ${definition.labelPtBr}.`, `skills.${skillKey}.total`, undefined, 'warning'))
      skills[skillKey] = {
        labelPtBr: definition.labelPtBr,
        ability: definition.ability,
        total: { ...field(null as unknown as number, 'low'), source: 'bonfire-v2.1' },
        proficiencyLevel: { ...field(0 as const, 'low'), source: 'bonfire-v2.1' },
        bonus: { ...field(null as unknown as number, 'low'), source: 'bonfire-v2.1' },
      }
      return
    }
    const inferred = inferSkill(total, abilities[resolvedDefinition.ability].mod.value ?? 0, proficiencyBonus)
    skills[skillKey] = {
      labelPtBr: definition.labelPtBr,
      ability: definition.ability,
      total: { ...field(total, 'high', String(total)), source: 'bonfire-v2.1' },
      proficiencyLevel: { ...field(inferred.proficiencyLevel, 'medium', String(total)), source: 'bonfire-v2.1' },
      bonus: { ...field(inferred.bonus, inferred.bonus === 0 ? 'high' : 'medium', String(total)), source: 'bonfire-v2.1' },
    }
  })

  return skills
}

function parseBonfireV21Equipment(workbook: WorkbookData, debug: SheetParseDebugInfo, warnings: ConversionWarning[]): NormalizedEquipment[] {
  const values = resolveTemplateTextList(workbook, bonfireV21EquipmentRangeSources, 'equipment', debug, warnings, false)
  if (!values.length) warnings.push(makeWarning('EQUIPMENT_RANGE_EMPTY', 'Nenhum equipamento foi encontrado nas ranges do template Bonfire v2.1.', 'equipment', bonfireV21EquipmentRangeSources.join(', '), 'warning'))
  return values
    .filter((value) => isValidEquipmentName(value))
    .map((value) => {
      const rule = resolveWeaponOrEquipment(value)
      const category = normalizeEquipmentCategory(rule?.category)
      if (!rule) warnings.push(makeWarning('RULE_NOT_FOUND', `${value} nao foi encontrado no Rule Store; exportado como equipment generico.`, 'equipment', value, 'warning'))
      return {
        name: { ...field(value, rule ? 'high' : 'low', value), source: 'bonfire-v2.1' },
        quantity: { ...field(1, 'medium', value), source: 'bonfire-v2.1' },
        category,
        raw: value,
      }
    })
}

function normalizeEquipmentCategory(category?: string): NormalizedEquipment['category'] {
  if (category === 'simple' || category === 'martial') return 'weapon'
  if (category === 'shield') return 'armor'
  if (category === 'focus') return 'equipment'
  if (category === 'armor' || category === 'consumable' || category === 'equipment' || category === 'tool' || category === 'loot' || category === 'weapon' || category === 'unknown') return category
  return 'equipment'
}

function parseBonfireV21Spells(
  workbook: WorkbookData,
  parsedClass: { name: string; level: number; subclass?: string },
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
): NormalizedCharacter['spells'] {
  const spells = buildClericSpellcasting(parsedClass.name, parsedClass.level)
  if (!getWorkbookSheet(workbook, 'Magias')) return spells
  const cantrips = bonfireV21SpellRanges.cantrips.flatMap((source) => resolveTemplateTextList(workbook, [source], `spells.cantrips`, debug, warnings, false))
  spells.cantrips = cantrips.map((name) => ({ name: { ...field(name, 'high', name), source: 'bonfire-v2.1' }, level: 0, raw: name, prepared: true }))

  for (let level = 1; level <= 9; level += 1) {
    const fieldPath = `spells.levels.spell${level}`
    const values = resolveTemplateTextList(workbook, bonfireV21SpellRanges[`spell${level}` as keyof typeof bonfireV21SpellRanges], fieldPath, debug, warnings, false)
    if (!values.length) warnings.push(makeWarning('SPELL_RANGE_EMPTY', `Nenhuma magia encontrada para spell${level} no template Bonfire v2.1.`, fieldPath, undefined, 'warning'))
    spells.levels[`spell${level}`].spells = values.map((name) => ({ name: { ...field(name, 'high', name), source: 'bonfire-v2.1' }, level, raw: name, prepared: true }))
  }

  return spells
}

function buildBonfireV21Features(parsedClass: { name: string; level: number; subclass?: string }, race: string, background: string): NormalizedFeature[] {
  const features: NormalizedFeature[] = []
  const seen = new Set<string>()

  const classRule = defaultBonfireRuleStore.classes.find((candidate) => ruleMatchesText(candidate.name, candidate.aliases ?? [], parsedClass.name))
  if (classRule) {
    const featureEntries = Object.entries(classRule.featuresByLevel ?? {})
      .map(([level, items]) => ({ level: Number(level), items }))
      .filter((entry) => Number.isInteger(entry.level) && entry.level <= parsedClass.level)
      .sort((left, right) => left.level - right.level)

    for (const entry of featureEntries) {
      for (const candidate of entry.items) addBonfireV21Feature(features, seen, candidate.name, 'class', candidate.description, candidate.level, candidate.uses, candidate.activation)
    }
  }

  const raceRule = defaultBonfireRuleStore.races.find((candidate) => ruleMatchesText(candidate.name, candidate.aliases ?? [], race))
  for (const candidate of raceRule?.features ?? []) addBonfireV21Feature(features, seen, candidate.name, 'race', candidate.description, undefined, candidate.uses, candidate.activation)

  const backgroundRule = defaultBonfireRuleStore.backgrounds.find((candidate) => ruleMatchesText(candidate.name, candidate.aliases ?? [], background))
  for (const candidate of backgroundRule?.features ?? []) addBonfireV21Feature(features, seen, candidate.name, 'background', candidate.description, undefined, candidate.uses, candidate.activation)

  return features
}

function addBonfireV21Feature(
  target: NormalizedFeature[],
  seen: Set<string>,
  name: string,
  sourceType: NormalizedFeature['sourceType'],
  description?: string,
  level?: number,
  uses?: { max?: number | string; recovery?: string },
  activation?: string,
) {
  const key = normalizeSheetCellValue(name)
  if (!key || seen.has(key)) return
  seen.add(key)
  const normalizedRecovery = normalizeFeatureRecovery(uses?.recovery ?? 'none')
  const maxUses = typeof uses?.max === 'number' ? uses.max : typeof uses?.max === 'string' ? parseSignedNumber(uses.max) : null
  target.push({
    name: { ...field(name, 'high', name), source: 'bonfire-v2.1' },
    sourceType,
    level,
    description: { ...field(description ?? name, description ? 'medium' : 'low', name), source: 'bonfire-v2.1' },
    uses:
      maxUses !== null
        ? {
            value: { ...field(maxUses, 'medium', name), source: 'bonfire-v2.1' },
            max: { ...field(maxUses, 'high', name), source: 'bonfire-v2.1' },
            recovery: normalizedRecovery,
          }
        : undefined,
    activation: activation ? { type: normalizeFeatureActivationForTemplate(activation) } : undefined,
    raw: name,
  })
}

function normalizeFeatureActivationForTemplate(value: string): 'action' | 'bonus' | 'reaction' | 'special' | 'none' | 'unknown' {
  if (value === 'action' || value === 'bonus' || value === 'reaction' || value === 'special' || value === 'none') return value
  return 'unknown'
}

function resolveTemplateTextField(
  workbook: WorkbookData,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
  fieldSpec: {
    fieldPath: string
    sources: ReadonlyArray<{ sourceType: 'namedRange' | 'cell' | 'range'; source: string; expectedLabels?: string[]; requireExpectedLabels?: boolean }>
    required?: boolean
  },
  required = true,
): FieldValue<string> {
  const result = resolveTemplateScalarSource(workbook, fieldSpec.sources, fieldSpec.fieldPath, debug, warnings, (value) => sanitizeTemplateText(value))
  if (!result.accepted) {
    if (required && fieldSpec.required !== false) addTemplateIssue(warnings, debug, { code: 'TEMPLATE_FIELD_MISSING', severity: 'error', message: `Campo obrigatorio ausente no template: ${fieldSpec.fieldPath}.`, fieldPath: fieldSpec.fieldPath, accepted: false, reason: 'no valid source' })
    return { ...field('', 'low'), source: 'bonfire-v2.1' }
  }
  return { ...field(result.value ?? '', 'high', `${result.resolvedAddress ?? result.source}: ${result.rawValue ?? result.value ?? ''}`), source: 'bonfire-v2.1' }
}

function resolveTemplateDirectNumberField(
  workbook: WorkbookData,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
  fieldSpec: {
    fieldPath: string
    sources: ReadonlyArray<{ sourceType: 'namedRange' | 'cell' | 'range'; source: string; expectedLabels?: string[]; requireExpectedLabels?: boolean }>
    required?: boolean
  },
  required = true,
): FieldValue<number | null> {
  const result = resolveTemplateScalarSource(workbook, fieldSpec.sources, fieldSpec.fieldPath, debug, warnings, (value) => parseLooseTemplateNumber(value))
  if (!result.accepted) {
    if (required) addTemplateIssue(warnings, debug, { code: 'TEMPLATE_FIELD_MISSING', severity: 'error', message: `Campo obrigatorio ausente no template: ${fieldSpec.fieldPath}.`, fieldPath: fieldSpec.fieldPath, accepted: false, reason: 'no valid numeric source' })
    return { ...field(null, 'low'), source: 'bonfire-v2.1' }
  }
  return { ...field(result.value as number, 'high', `${result.resolvedAddress ?? result.source}: ${result.rawValue ?? String(result.value)}`), source: 'bonfire-v2.1' }
}

function resolveTemplateMovementField(
  workbook: WorkbookData,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
  fieldSpec: {
    fieldPath: string
    sources: ReadonlyArray<{ sourceType: 'namedRange' | 'cell' | 'range'; source: string; expectedLabels?: string[]; requireExpectedLabels?: boolean }>
    required?: boolean
  },
): { value: FieldValue<number | null>; units: 'ft' | 'm' | null } {
  const result = resolveTemplateScalarSource(workbook, fieldSpec.sources, fieldSpec.fieldPath, debug, warnings, (value) => parseTemplateMovement(value))
  if (!result.accepted || !result.value) {
    addTemplateIssue(warnings, debug, { code: 'TEMPLATE_FIELD_MISSING', severity: 'error', message: `Campo obrigatorio ausente no template: ${fieldSpec.fieldPath}.`, fieldPath: fieldSpec.fieldPath, accepted: false, reason: 'no valid movement source' })
    return { value: { ...field(null, 'low'), source: 'bonfire-v2.1' }, units: null }
  }
  return {
    value: { ...field(result.value.value, 'high', `${result.resolvedAddress ?? result.source}: ${result.rawValue ?? String(result.value.value)}`), source: 'bonfire-v2.1' },
    units: result.value.units,
  }
}

function resolveTemplateNumberField(
  workbook: WorkbookData,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
  fieldSpec: {
    fieldPath: string
    sources: ReadonlyArray<{ sourceType: 'namedRange' | 'cell' | 'range'; source: string; expectedLabels?: string[]; requireExpectedLabels?: boolean }>
    required?: boolean
  },
  required = true,
): FieldValue<number | null> {
  const result = resolveTemplateScalarSource(workbook, fieldSpec.sources, fieldSpec.fieldPath, debug, warnings, (value) => {
    const parsed = parseSignedNumber(value)
    return parsed === null ? null : parsed
  })
  if (!result.accepted) {
    if (required) addTemplateIssue(warnings, debug, { code: 'TEMPLATE_FIELD_MISSING', severity: 'error', message: `Campo obrigatorio ausente no template: ${fieldSpec.fieldPath}.`, fieldPath: fieldSpec.fieldPath, accepted: false, reason: 'no valid numeric source' })
    return { ...field(null, 'low'), source: 'bonfire-v2.1' }
  }
  return { ...field(result.value as number, 'high', `${result.resolvedAddress ?? result.source}: ${result.rawValue ?? String(result.value)}`), source: 'bonfire-v2.1' }
}

function resolveTemplateNumericSources(
  workbook: WorkbookData,
  sources: ReadonlyArray<{ sourceType: 'namedRange' | 'cell'; source: string; expectedLabels?: string[]; requireExpectedLabels?: boolean }>,
  fieldPath: string,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
  required: boolean,
): FieldValue<number | null> {
  const result = resolveTemplateScalarSource(workbook, sources, fieldPath, debug, warnings, (value, source) => classifyTemplateAbilityNumber(source, value))
  if (!result.accepted) {
    if (required) addTemplateIssue(warnings, debug, { code: 'TEMPLATE_FIELD_MISSING', severity: 'error', message: `Campo obrigatorio ausente no template: ${fieldPath}.`, fieldPath, accepted: false, reason: 'numeric source missing' })
    return { ...field(null, 'low'), source: 'bonfire-v2.1' }
  }
  return { ...field(result.value as number, 'high', `${result.resolvedAddress ?? result.source}: ${result.rawValue ?? String(result.value)}`), source: 'bonfire-v2.1' }
}

function resolveTemplateNumberList(
  workbook: WorkbookData,
  sources: readonly string[],
  fieldPath: string,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
  required: boolean,
): number[] {
  for (const source of sources) {
    const resolved = resolveTemplateRangeSource(workbook, source, fieldPath, debug, warnings)
    const numericValues = resolved.values.map((value) => parseSignedNumber(value)).filter((value): value is number => value !== null)
    if (numericValues.length) return numericValues
  }
  if (required) addTemplateIssue(warnings, debug, { code: 'TEMPLATE_FIELD_MISSING', severity: 'error', message: `Range obrigatoria vazia no template: ${fieldPath}.`, fieldPath, accepted: false, reason: 'range empty' })
  return []
}

function resolveTemplateTextList(
  workbook: WorkbookData,
  sources: readonly string[],
  fieldPath: string,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
  required: boolean,
): string[] {
  for (const source of sources) {
    const resolved = resolveTemplateRangeSource(workbook, source, fieldPath, debug, warnings)
    if (resolved.values.length) return resolved.values
  }
  if (required) addTemplateIssue(warnings, debug, { code: 'TEMPLATE_FIELD_MISSING', severity: 'error', message: `Range obrigatoria vazia no template: ${fieldPath}.`, fieldPath, accepted: false, reason: 'range empty' })
  return []
}

function resolveTemplateScalarSource<T>(
  workbook: WorkbookData,
  sources: ReadonlyArray<{ sourceType: 'namedRange' | 'cell' | 'range'; source: string; expectedLabels?: string[]; requireExpectedLabels?: boolean }>,
  fieldPath: string,
  debug: SheetParseDebugInfo,
  warnings: ConversionWarning[],
  parser: (value: string, source: string) => T | null,
): {
  accepted: boolean
  value: T | null
  rawValue?: string
  resolvedSheet?: string
  resolvedAddress?: string
  source: string
} {
  for (const sourceSpec of sources) {
    const resolved = sourceSpec.sourceType === 'namedRange' ? resolveNamedRangeSource(workbook, sourceSpec.source, fieldPath, debug, warnings) : resolveWorkbookSource(workbook, sourceSpec.source, fieldPath, debug, warnings)
    if (!resolved.values.length) continue
    if (sourceSpec.expectedLabels?.length && sourceSpec.requireExpectedLabels && !resolvedMatchesExpectedLabels(workbook, resolved.cells, resolved.resolvedSheet, sourceSpec.expectedLabels)) {
      pushTemplateAttempt(debug, {
        fieldPath,
        sourceType: sourceSpec.sourceType,
        source: sourceSpec.source,
        resolvedSheet: resolved.resolvedSheet,
        resolvedAddress: resolved.resolvedAddress,
        cellAddress: resolved.resolvedAddress,
        rawValue: resolved.values.join(' | '),
        normalizedValue: resolved.values.map((value) => normalizeSheetCellValue(value)).join(' | '),
        accepted: false,
        reason: `expected nearby label not found: ${sourceSpec.expectedLabels.join(', ')}`,
        rejectedReason: `expected nearby label not found: ${sourceSpec.expectedLabels.join(', ')}`,
      })
      continue
    }
    for (const value of resolved.values) {
      const parsed = parser(value, sourceSpec.source)
      if (parsed === null) {
        pushTemplateAttempt(debug, {
          fieldPath,
          sourceType: sourceSpec.sourceType,
          source: sourceSpec.source,
          resolvedSheet: resolved.resolvedSheet,
          resolvedAddress: resolved.resolvedAddress,
          cellAddress: resolved.resolvedAddress,
          rawValue: value,
          normalizedValue: normalizeSheetCellValue(value),
          parsedValue: undefined,
          accepted: false,
          reason: 'value rejected by parser',
          rejectedReason: 'value rejected by parser',
        })
        continue
      }
      pushTemplateFinalField(debug, {
        fieldPath,
        sourceType: sourceSpec.sourceType,
        source: sourceSpec.source,
        resolvedSheet: resolved.resolvedSheet,
        resolvedAddress: resolved.resolvedAddress,
        cellAddress: resolved.resolvedAddress,
        rawValue: value,
        normalizedValue: normalizeSheetCellValue(value),
        parsedValue: typeof parsed === 'string' ? parsed : String(parsed),
        accepted: true,
        reason: 'resolved from template source',
      })
      return { accepted: true, value: parsed, rawValue: value, resolvedSheet: resolved.resolvedSheet, resolvedAddress: resolved.resolvedAddress, source: sourceSpec.source }
    }
  }
  pushTemplateFinalField(debug, { fieldPath, accepted: false, reason: 'not found', rejectedReason: 'not found' })
  return { accepted: false, value: null, source: sources[0]?.source ?? fieldPath }
}

function resolveNamedRangeSource(workbook: WorkbookData, source: string, fieldPath: string, debug: SheetParseDebugInfo, warnings: ConversionWarning[]) {
  const name = normalizeNamedRangeRef(source)
  const namedRangeValue = getNamedRangeValue(workbook, name)
  if (!namedRangeValue) {
    warnings.push(makeWarning('NAMED_RANGE_NOT_FOUND', `Named range nao encontrado: ${name}.`, fieldPath, name, 'warning'))
    pushTemplateAttempt(debug, { fieldPath, sourceType: 'namedRange', source: name, accepted: false, reason: 'named range missing', rejectedReason: 'named range missing', issueCode: 'NAMED_RANGE_NOT_FOUND' })
    return { values: [] as string[], resolvedSheet: undefined, resolvedAddress: undefined, cells: [] as SheetCell[] }
  }
  const values = namedRangeValue.cells.map((cell) => cleanTemplateCellValue(cell.value)).filter(Boolean) as string[]
  if (!values.length) {
    warnings.push(makeWarning('CELL_EMPTY', `Named range vazio: ${name}.`, fieldPath, namedRangeValue.resolvedAddress ?? name, 'warning'))
    pushTemplateAttempt(debug, {
      fieldPath,
      sourceType: 'namedRange',
      source: name,
      resolvedSheet: namedRangeValue.resolvedSheetName ?? undefined,
      resolvedAddress: namedRangeValue.resolvedAddress ?? undefined,
      cellAddress: namedRangeValue.resolvedAddress ?? undefined,
      accepted: false,
      reason: 'named range empty',
      rejectedReason: 'named range empty',
      issueCode: 'CELL_EMPTY',
    })
  }
  return { values, resolvedSheet: namedRangeValue.resolvedSheetName ?? undefined, resolvedAddress: namedRangeValue.resolvedAddress ?? undefined, cells: [...namedRangeValue.cells] }
}

function resolveWorkbookSource(workbook: WorkbookData, source: string, fieldPath: string, debug: SheetParseDebugInfo, _warnings: ConversionWarning[]) {
  const resolved = getCellsFromWorkbookRef(workbook, source)
  if (!resolved) {
    pushTemplateAttempt(debug, { fieldPath, sourceType: source.includes(':') ? 'range' : 'cell', source, accepted: false, reason: 'invalid workbook ref', rejectedReason: 'invalid workbook ref' })
    return { values: [] as string[], resolvedSheet: undefined, resolvedAddress: undefined, cells: [] as SheetCell[] }
  }
  const values = resolved.cells.map((cell) => cleanTemplateCellValue(cell.value)).filter(Boolean) as string[]
  if (!values.length) {
    pushTemplateAttempt(debug, {
      fieldPath,
      sourceType: resolved.parsed.kind,
      source,
      resolvedSheet: resolved.sheet?.name,
      resolvedAddress: resolved.parsed.kind === 'cell' ? resolved.parsed.address : `${resolved.parsed.startAddress}:${resolved.parsed.endAddress}`,
      cellAddress: resolved.parsed.kind === 'cell' ? resolved.parsed.address : `${resolved.parsed.startAddress}:${resolved.parsed.endAddress}`,
      accepted: false,
      reason: 'cell or range empty',
      rejectedReason: 'cell or range empty',
    })
  }
  return {
    values,
    resolvedSheet: resolved.sheet?.name,
    resolvedAddress: resolved.parsed.kind === 'cell' ? resolved.parsed.address : `${resolved.parsed.startAddress}:${resolved.parsed.endAddress}`,
    cells: resolved.cells,
  }
}

function resolveTemplateRangeSource(workbook: WorkbookData, source: string, fieldPath: string, debug: SheetParseDebugInfo, warnings: ConversionWarning[]) {
  const resolved = resolveWorkbookSource(workbook, source, fieldPath, debug, warnings)
  if (resolved.values.length) {
    pushTemplateFinalField(debug, {
      fieldPath,
      sourceType: 'range',
      source,
      resolvedSheet: resolved.resolvedSheet,
      resolvedAddress: resolved.resolvedAddress,
      cellAddress: resolved.resolvedAddress,
      rawValue: resolved.values.join(' | '),
      normalizedValue: resolved.values.map((value) => normalizeSheetCellValue(value)).join(' | '),
      parsedValue: resolved.values.join(' | '),
      accepted: true,
      reason: 'resolved from template range',
    })
  }
  return resolved
}

function classifyTemplateAbilityNumber(source: string, value: string): number | null {
  const parsed = parseSignedNumber(value)
  if (parsed === null) return null
  const normalizedSource = source.toLowerCase()
  if (normalizedSource.includes('mod') && parsed >= -5 && parsed <= 10) return parsed
  if (parsed >= 1 && parsed <= 30) return parsed
  if (parsed >= -5 && parsed <= 10) return parsed
  return null
}

function parseLooseTemplateNumber(value: string): number | null {
  const parsed = /([+-]?\d+)/.exec(value.replace(',', '.'))
  if (!parsed) return null
  const numeric = Number.parseInt(parsed[1], 10)
  return Number.isFinite(numeric) ? numeric : null
}

function parseTemplateMovement(value: string): { value: number; units: 'ft' | 'm' | null } | null {
  const numeric = parseLooseTemplateNumber(value)
  if (numeric === null) return null
  const normalized = normalizeSheetCellValue(value)
  if (/\b(m|metros?)\b/.test(normalized)) return { value: numeric, units: 'm' }
  return { value: numeric, units: 'ft' }
}

function resolvedMatchesExpectedLabels(workbook: WorkbookData, cells: SheetCell[], resolvedSheetName: string | undefined, expectedLabels: string[]): boolean {
  if (!cells.length || !resolvedSheetName) return false
  const sheet = getWorkbookSheet(workbook, resolvedSheetName)
  if (!sheet) return false
  const normalizedLabels = expectedLabels.map((label) => normalizeSheetCellValue(label))
  return cells.some((cell) => {
    const nearby = dedupeCells(
      [
        cell,
        ...collectOffsetCells(sheet, cell, 2, 2),
      ].filter(Boolean) as SheetCell[],
    )
    return nearby.some((candidate) => normalizedLabels.includes(candidate.normalized))
  })
}

function collectOffsetCells(sheet: WorkbookSheet, origin: SheetCell, rowRadius: number, colRadius: number): SheetCell[] {
  const cells: SheetCell[] = []
  for (let rowOffset = -rowRadius; rowOffset <= rowRadius; rowOffset += 1) {
    for (let colOffset = -colRadius; colOffset <= colRadius; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue
      const candidate = getCellOrMerged(sheet, origin.row + rowOffset, origin.col + colOffset)
      if (candidate) cells.push(candidate)
    }
  }
  return cells
}

function cleanTemplateCellValue(value: string): string | null {
  const trimmed = value.replace(/\r\n?/g, '\n').replace(/\n{2,}/g, '\n').trim()
  if (!trimmed) return null
  if (['-', '—', '#N/A', '#VALUE!'].includes(trimmed)) return null
  return trimmed
}

function sanitizeTemplateText(value: string): string | null {
  const cleaned = cleanTemplateCellValue(value)
  if (!cleaned) return null
  if (isUrlLike(cleaned)) return null
  if (isProbablyTableHeaderOrNoise(cleaned)) return null
  return cleaned
}

function remapSkillKeysFromLabels(labels: string[]): SkillKey[] {
  const mapped = labels.map((label) => (Object.keys(skillDefinitions) as SkillKey[]).find((key) => skillDefinitions[key].aliases.some((alias) => normalizeSheetCellValue(alias) === normalizeSheetCellValue(label))) ?? bonfireV21SkillOrder[labels.indexOf(label)])
  return mapped.every(Boolean) ? (mapped as SkillKey[]) : bonfireV21SkillOrder
}

function addTemplateIssue(
  warnings: ConversionWarning[],
  debug: SheetParseDebugInfo,
  options: {
    code: string
    severity: ConversionWarning['severity']
    message: string
    fieldPath?: string
    raw?: string
    sourceType?: 'namedRange' | 'cell' | 'range' | 'derived' | 'static'
    source?: string
    accepted: boolean
    reason?: string
  },
) {
  warnings.push(makeWarning(options.code, options.message, options.fieldPath, options.raw, options.severity))
  pushTemplateFinalField(debug, {
    fieldPath: options.fieldPath ?? 'template',
    sourceType: options.sourceType,
    source: options.source,
    rawValue: options.raw,
    accepted: options.accepted,
    reason: options.reason ?? options.message,
    rejectedReason: options.accepted ? undefined : options.reason ?? options.message,
    issueCode: options.code,
  })
}

function markTemplateFieldIssue(debug: SheetParseDebugInfo, fieldPath: string, issueCode: string, reason: string) {
  const index = debug.finalExtractedFields.findIndex((entry) => entry.fieldPath === fieldPath)
  if (index >= 0) {
    debug.finalExtractedFields[index] = { ...debug.finalExtractedFields[index], accepted: false, issueCode, rejectedReason: reason, reason }
    return
  }
  pushTemplateFinalField(debug, { fieldPath, accepted: false, issueCode, reason, rejectedReason: reason })
}

function pushTemplateAttempt(debug: SheetParseDebugInfo, entry: ExtractedFieldDebugEntry) {
  debug.extractedFields.push(entry)
  debug.extractionAttempts.push(entry)
}

function pushTemplateFinalField(debug: SheetParseDebugInfo, entry: ExtractedFieldDebugEntry) {
  pushTemplateAttempt(debug, entry)
  const index = debug.finalExtractedFields.findIndex((candidate) => candidate.fieldPath === entry.fieldPath)
  if (index >= 0) debug.finalExtractedFields[index] = { ...debug.finalExtractedFields[index], ...entry }
  else debug.finalExtractedFields.push(entry)
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
      selectedSheets: debug.selectedSheets,
      ignoredSheets: debug.ignoredSheets,
      readMode: debug.readMode,
      detectedTemplate: detection.templateId ?? (detection.confidence === 'low' ? 'unknown' : 'bonfire-character-sheet'),
      templateId: detection.templateId,
      confidence: detection.confidence,
      selectedSheetName: debug.selectedSheetName,
      selectedRegion: debug.selectedRegion,
      selectedSheetScore: detection.score,
      selectedBy: debug.selectedBy,
      anchorsFound: debug.anchorsFound,
      sheetCandidates: detection.candidates,
      regionCandidates: detection.regionCandidates,
      ignoredOutsideRegion: debug.ignoredOutsideRegion,
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
    if (rejectedReason && /personagem|aparencia|personalidade/i.test(candidate.cell.value)) {
      debug.blockedNameMatches.push({ value: candidate.cell.value, normalizedValue: normalizeSheetCellValue(candidate.cell.value), reason: rejectedReason })
    }
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
  if (value.length > 80) return 'candidate is long descriptive text'
  if (isUrlLike(value)) return isImageUrlLike(value) ? 'image URL cannot be character name' : 'URL cannot be character name'
  if (/^(apar[eê]ncia do personagem|tra[cç]os de personalidade|personalidade|log\/ficha)$/i.test(value)) return 'blocked descriptive phrase'
  if (isAnchorLabel(value)) return 'candidate is another label/anchor'
  if (isProbablyTableHeaderOrNoise(value)) return 'candidate is table header/noise'
  if (/^(artifice|artificer|associated skills|bludgeoning|piercing|slashing)$/i.test(normalizeSheetCellValue(value))) return 'candidate is auxiliary-list value'
  if (!/[a-zA-ZÀ-ÿ]/.test(value)) return 'candidate has no letters'
  return null
}

function rejectNameLikeOrNoise(value: string): string | null {
  if (isUrlLike(value)) return 'URL rejected'
  if (isAnchorLabel(value)) return 'label/noise rejected'
  if (isProbablyTableHeaderOrNoise(value)) return 'label/noise rejected'
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

function parseBonfireLogV2Sheet(sheet: WorkbookSheet, region: SheetRegionCandidate | undefined, warnings: ConversionWarning[], debug: SheetParseDebugInfo) {
  const identity = parseBonfireLogIdentity(sheet, warnings, debug)
  const parsedClass = parseClassText(identity.classText.value)
  const abilities = parseBonfireLogAbilities(sheet, warnings, debug)
  const proficiencyBonus = parseBonfireLogProficiencyBonus(sheet, parsedClass.level, warnings, debug)
  const combat = parseBonfireLogCombat(sheet, identity.race.value, warnings, debug)
  const skills = parseBonfireLogSkills(sheet, abilities, proficiencyBonus.value ?? 0, warnings, debug)
  const passiveFromSkills = coercePassivePerceptionFromSkills(skills)
  if (combat.passivePerception.value === null && passiveFromSkills !== null) {
    combat.passivePerception = { ...field(passiveFromSkills, 'medium', 'derived from Percepcao total', ['Percepcao passiva derivada como 10 + Percepcao.']), source: 'derived-from-skills' }
    debugField(debug, 'attributes.passivePerception', undefined, true, 'derived from Percepcao total')
  }
  const features = parseBonfireLogFeatures(sheet, parsedClass, identity.race.value, identity.background.value, warnings)
  const equipment = parseBonfireLogEquipment(sheet, warnings)
  const gp = parseBonfireLogCurrency(sheet, warnings, debug)
  return { region, identity, parsedClass, abilities, proficiencyBonus, combat, skills, features, equipment, gp }
}

function parseBonfireLogIdentity(sheet: WorkbookSheet, warnings: ConversionWarning[], debug: SheetParseDebugInfo) {
  const classText = extractTemplateTextValue(sheet, warnings, debug, 'identity.classText', {
    labels: identityLabels.classText,
    addresses: ['T5', 'U6', 'U5'],
    range: { startAddress: 'T5', endAddress: 'W6' },
  })
  const race = extractTemplateTextValue(sheet, warnings, debug, 'identity.race', {
    labels: identityLabels.race,
    addresses: ['T7', 'U8', 'U7'],
    range: { startAddress: 'T7', endAddress: 'W8' },
  })
  const background = parseBonfireLogBackground(sheet, warnings, debug)
  const player = extractTemplateTextValue(sheet, warnings, debug, 'identity.player', {
    labels: identityLabels.player,
    addresses: ['AE5', 'AF5', 'AE6'],
    required: false,
  })
  const alignment = valueForLabelsTemplateAware(sheet, identityLabels.alignment, warnings, debug, 'identity.alignment', false)
  const name = parseBonfireLogName(sheet, warnings, debug)
  return { name, player, classText, race, background, alignment }
}

function parseBonfireLogName(sheet: WorkbookSheet, warnings: ConversionWarning[], debug: SheetParseDebugInfo): FieldValue<string> {
  const rangeCandidates = getCellsInAddressRange(sheet, 'C6', 'R7')
    .filter((cell) => !rejectNameCandidate(cell))
    .sort((left, right) => nameCandidateScore({ cell: right, distance: right.row + right.col, preference: 10 }) - nameCandidateScore({ cell: left, distance: left.row + left.col, preference: 10 }))

  for (const cell of rangeCandidates) {
    debug.nameCandidates.push({ value: cell.value, address: cell.address, strategy: 'template-name-range', distance: cell.row + cell.col, accepted: true })
  }

  const ranged = rangeCandidates[0]
  if (ranged) {
    debugField(debug, 'identity.name', ranged, true, 'template-name-range')
    return { ...field(ranged.value.trim(), 'high', `${ranged.address}: ${ranged.value}`), source: 'sheet-template-bonfire-log' }
  }

  const anchored = parseCharacterName(sheet, warnings, debug)
  if (anchored.value.trim()) return anchored

  const topCells = sheet.cells
    .filter((cell) => cell.row <= 15 && cell.col <= 24)
    .filter((cell) => !isAnchorLabel(cell.value) && !isProbablyTableHeaderOrNoise(cell.value) && !isUrlLike(cell.value))
    .filter((cell) => !rejectNameCandidate(cell))
    .sort((left, right) => nameCandidateScore({ cell: right, distance: right.row + right.col, preference: 20 }) - nameCandidateScore({ cell: left, distance: left.row + left.col, preference: 20 }))

  for (const cell of topCells) {
    debug.nameCandidates.push({ value: cell.value, address: cell.address, strategy: 'template-top-region', distance: cell.row + cell.col, accepted: true })
  }

  const best = topCells[0]
  if (!best) return anchored
  debugField(debug, 'identity.name', best, true, 'template-top-region')
  return { ...field(best.value.trim(), 'medium', `${best.address}: ${best.value}`), source: 'sheet-template-bonfire-log' }
}

function parseBonfireLogBackground(sheet: WorkbookSheet, warnings: ConversionWarning[], debug: SheetParseDebugInfo): FieldValue<string> {
  const explicitCandidates = dedupeCells([
    ...getCellsInAddressRange(sheet, 'C10', 'R12'),
    ...['T10', 'U10', 'C11', 'D11', 'C12', 'D12'].map((address) => getCellByAddress(sheet, address)).filter(Boolean),
  ] as SheetCell[])

  for (const candidate of explicitCandidates) {
    const rejectedReason = rejectBackgroundCandidate(candidate.value)
    if (rejectedReason) {
      debugField(debug, 'identity.background', candidate, false, rejectedReason)
      continue
    }
    const matchingBackground = defaultBonfireRuleStore.backgrounds.find((background) => ruleMatchesText(background.name, background.aliases ?? [], candidate.value))
    if (matchingBackground) {
      debugField(debug, 'identity.background', candidate, true, 'matched Bonfire background rule')
      return { ...field(candidate.value.trim(), 'high', `${candidate.address}: ${candidate.value}`), source: 'sheet-template-bonfire-log' }
    }
  }

  const anchored = valueForLabelsTemplateAware(sheet, identityLabels.background, warnings, debug, 'identity.background', false)
  if (anchored.value && !rejectBackgroundCandidate(anchored.value)) return anchored
  if (anchored.value && rejectBackgroundCandidate(anchored.value)) debugField(debug, 'identity.background', undefined, false, 'rejected anchored background value')
  warnings.push(makeWarning('BACKGROUND_NOT_FOUND_FOR_TEMPLATE', 'Antecedente nao encontrado no template bonfire-log-v2.', 'identity.background', undefined, 'warning'))
  return field('', 'low')
}

function parseBonfireLogAbilities(sheet: WorkbookSheet, warnings: ConversionWarning[], debug: SheetParseDebugInfo): NormalizedCharacter['abilities'] {
  const templateCells: Record<AbilityKey, { label: string; score: string[]; mod: string[] }> = {
    str: { label: 'J17', score: ['K17', 'L17'], mod: ['I17', 'H17'] },
    dex: { label: 'J18', score: ['K18', 'L18'], mod: ['I18', 'H18'] },
    con: { label: 'J19', score: ['K19', 'L19'], mod: ['I19', 'H19'] },
    int: { label: 'J20', score: ['K20', 'L20'], mod: ['I20', 'H20'] },
    wis: { label: 'J21', score: ['K21', 'L21'], mod: ['I21', 'H21'] },
    cha: { label: 'J22', score: ['K22', 'L22'], mod: ['I22', 'H22'] },
  }
  const abilities = {} as NormalizedCharacter['abilities']

  for (const key of Object.keys(templateCells) as AbilityKey[]) {
    const template = templateCells[key]
    const labelCell = getCellByAddress(sheet, template.label) ?? findAnchorCellsInRange(sheet, abilityLabels[key], 'H16', 'L22')[0] ?? findAnchorCells(sheet, abilityLabels[key])[0]
    const candidateCells = labelCell ? collectAbilityBlockCandidateCells(sheet, labelCell) : []
    const scoreCell = labelCell ? selectAbilityScoreCell(candidateCells, key, debug, labelCell) : null
    if (!labelCell || !scoreCell) {
      warnings.push(makeWarning('ABILITY_SCORE_NOT_FOUND_FOR_TEMPLATE', `Score do atributo nao encontrado no template: ${abilityLabels[key][0]}.`, `abilities.${key}.score`, undefined, 'error'))
      debugField(debug, `abilities.${key}.score`, undefined, false, 'ability score not found for template')
      debug.abilityBlockCandidates.push({
        ability: key,
        labelAddress: labelCell?.address,
        candidateCells: candidateCells.map((cell) => ({
          address: cell.address,
          rawValue: cell.value,
          normalizedValue: normalizeSheetCellValue(cell.value),
          accepted: false,
          rejectedReason: describeAbilityCandidateRejection(cell, candidateCells),
        })),
      })
      abilities[key] = { score: field(null as unknown as number, 'low'), mod: field(null as unknown as number, 'low') }
      continue
    }

    const score = parseUnsignedInteger(scoreCell.value)
    if (!isValidAbilityScore(scoreCell.value) || score === null) {
      warnings.push(makeWarning('SHEET_ABILITY_SCORE_INVALID', `Atributo invalido: ${abilityLabels[key][0]}.`, `abilities.${key}.score`, `${scoreCell.address}: ${scoreCell.value}`, 'error'))
      debugField(debug, `abilities.${key}.score`, scoreCell, false, 'invalid unsigned score')
      abilities[key] = { score: field(null as unknown as number, 'low', `${scoreCell.address}: ${scoreCell.value}`), mod: field(null as unknown as number, 'low') }
      continue
    }

    debug.abilityBlockCandidates.push({
      ability: key,
      labelAddress: labelCell.address,
      candidateCells: candidateCells.map((cell) => ({
        address: cell.address,
        rawValue: cell.value,
        normalizedValue: normalizeSheetCellValue(cell.value),
        accepted: cell.address === scoreCell.address,
        rejectedReason: cell.address === scoreCell.address ? undefined : describeAbilityCandidateRejection(cell, candidateCells),
      })),
      selectedCell: scoreCell.address,
    })

    const mod = abilityModifier(score)
    debugField(debug, `abilities.${key}.score`, scoreCell, true, `template row ${labelCell.address}`)
    debugField(debug, `abilities.${key}.mod`, scoreCell, true, `derived from ${scoreCell.address}`)
    abilities[key] = {
      score: field(score, 'high', `${scoreCell.address}: ${scoreCell.value}`),
      mod: { ...field(mod, 'high', `${scoreCell.address}: ${scoreCell.value}`), source: 'derived-from-score' },
    }
  }

  return abilities
}

function parseBonfireLogCombat(sheet: WorkbookSheet, raceName: string, warnings: ConversionWarning[], debug: SheetParseDebugInfo) {
  const acAnchor = findAnchorCellInRange(sheet, combatLabels.ac, 'P14', 'S16') ?? findAnchorCell(sheet, combatLabels.ac)
  const ac = findTemplateNumberFromAnchor(sheet, acAnchor, 'attributes.ac', warnings, debug, { required: true, min: 1, max: 40 })
  const hpAnchor = findAnchorCellInRange(sheet, combatLabels.hpMax, 'R14', 'V17') ?? findAnchorCell(sheet, combatLabels.hpMax)
  const hpMax = findTemplateNumberFromAnchor(sheet, hpAnchor, 'attributes.hp.max', warnings, debug, { required: true, min: 1, max: 999 })
  const speedAnchor = findAnchorCellInRange(sheet, combatLabels.speed, 'T14', 'Z18') ?? findAnchorCell(sheet, combatLabels.speed)
  const passiveAnchor = findAnchorCellInRange(sheet, combatLabels.passivePerception, 'F43', 'K46') ?? findAnchorCell(sheet, combatLabels.passivePerception)
  const passivePerception = findTemplateNumberFromAnchor(sheet, passiveAnchor, 'attributes.passivePerception', warnings, debug, {
    required: false,
    min: 1,
    max: 40,
    rejectTextLike: true,
  })
  let speed = findTemplateNumberFromAnchor(sheet, speedAnchor, 'attributes.speed', warnings, debug, {
    required: false,
    min: 1,
    max: 120,
    blockedCellAddresses: [extractCellAddressFromRaw(hpMax.raw)].filter(Boolean) as string[],
  })
  if (speed.value === null) {
    const raceRule = defaultBonfireRuleStore.races.find((candidate) => ruleMatchesText(candidate.name, candidate.aliases ?? [], raceName))
    if (typeof raceRule?.speed === 'number') {
      warnings.push(makeWarning('SPEED_FROM_RACE_RULE', `Velocidade nao encontrada na ficha; usando ${raceRule.speed} da raca ${raceRule.name}.`, 'attributes.speed', raceName, 'warning'))
      speed = { ...field(raceRule.speed, 'medium', raceName, ['Velocidade nao encontrada na planilha; usando speed da raca no Rule Store.']), source: 'rule-store' }
      debugField(debug, 'attributes.speed', undefined, true, `rule-store ${raceRule.name}`)
    } else {
      warnings.push(makeWarning('SHEET_SPEED_NOT_FOUND', 'Velocidade nao encontrada na planilha nem inferida pela raca.', 'attributes.speed', undefined, 'warning'))
    }
  } else {
    speed = { ...speed, source: 'sheet' }
  }

  return {
    ac,
    initiative: parseNullableNumberFieldTemplateAware(sheet, combatLabels.initiative, warnings, debug, 'attributes.initiative', false),
    hpMax,
    speed,
    passivePerception,
  }
}

function parseBonfireLogSkills(sheet: WorkbookSheet, abilities: NormalizedCharacter['abilities'], proficiencyBonus: number, warnings: ConversionWarning[], debug: SheetParseDebugInfo): Record<SkillKey, SkillValue> {
  const skills = {} as Record<SkillKey, SkillValue>
  const rows = Array.from({ length: 18 }, (_, index) => 43 + index)

  for (const key of Object.keys(skillDefinitions) as SkillKey[]) {
    const definition = skillDefinitions[key]
    const aliases = definition.aliases.flatMap((alias) => (alias === 'Arcanismo' ? [alias, 'Arcana'] : alias === 'Adestrar Animais' ? [alias, 'Lidar com Animais'] : [alias]))
    const labelCell = rows
      .map((row) => getCellOrMerged(sheet, row, 7))
      .find((cell) => cell && aliases.some((alias) => normalizeSheetCellValue(alias) === cell.normalized))
    const valueCell = labelCell ? getCellOrMerged(sheet, labelCell.row, labelCell.col + 1) : null
    const parsed = valueCell ? parseSignedNumber(valueCell.value) : null
    const abilityMod = typeof abilities[definition.ability].mod.value === 'number' ? abilities[definition.ability].mod.value : null

    if (!labelCell || !valueCell || parsed === null || abilityMod === null) {
      warnings.push(makeWarning('SHEET_SKILL_NOT_FOUND', `Pericia nao encontrada: ${definition.labelPtBr}.`, `skills.${key}`))
      debugField(debug, `skills.${key}.total`, valueCell ?? undefined, false, labelCell ? 'skill total not found' : 'skill label not found')
      skills[key] = {
        labelPtBr: definition.labelPtBr,
        ability: definition.ability,
        total: field(null as unknown as number, 'low'),
        proficiencyLevel: field(0 as const, 'low'),
        bonus: field(null as unknown as number, 'low'),
      }
      continue
    }

    const inferred = inferSkill(parsed, abilityMod, proficiencyBonus)
    debugField(debug, `skills.${key}.total`, valueCell, true, `skill row ${labelCell.address}`)
    skills[key] = {
      labelPtBr: definition.labelPtBr,
      ability: definition.ability,
      total: field(parsed, 'high', `${valueCell.address}: ${valueCell.value}`),
      proficiencyLevel: field(inferred.proficiencyLevel, inferred.bonus === 0 ? 'high' : 'medium', `${valueCell.address}: ${valueCell.value}`),
      bonus: field(inferred.bonus, inferred.bonus === 0 ? 'high' : 'medium', `${valueCell.address}: ${valueCell.value}`),
    }
  }

  return skills
}

function parseBonfireLogFeatures(sheet: WorkbookSheet, parsedClass: { name: string; level: number; subclass?: string }, race: string, background: string, warnings: ConversionWarning[]): NormalizedFeature[] {
  return parseFeaturesFromSheet(sheet, parsedClass, race, background, warnings)
}

function parseBonfireLogEquipment(sheet: WorkbookSheet, warnings: ConversionWarning[]): NormalizedEquipment[] {
  return parseEquipmentFromSheet(sheet, warnings)
}

function parseBonfireLogCurrency(sheet: WorkbookSheet, warnings: ConversionWarning[], debug: SheetParseDebugInfo): FieldValue<number> {
  const candidates = sheet.cells
    .filter((cell) => cell.row >= 80)
    .filter((cell) => ['po', 'gp', 'ouro'].includes(cell.normalized))
    .flatMap((labelCell) => {
      const next = getCellOrMerged(sheet, labelCell.row, labelCell.col + 1)
      return next ? [{ labelCell, valueCell: next }] : []
    })

  for (const candidate of candidates) {
    const priceLike = /\b(gp|po|sp|pp|cp|ep)\b/i.test(candidate.valueCell.value) || /\./.test(candidate.valueCell.value)
    if (priceLike) {
      debugField(debug, 'currency.gp', candidate.valueCell, false, 'item price rejected')
      continue
    }
    const value = parseUnsignedInteger(candidate.valueCell.value)
    if (value === null) {
      debugField(debug, 'currency.gp', candidate.valueCell, false, 'not an integer coin total')
      continue
    }
    debugField(debug, 'currency.gp', candidate.valueCell, true, `template coin label ${candidate.labelCell.address}`)
    return { ...field(value, 'high', `${candidate.valueCell.address}: ${candidate.valueCell.value}`), source: 'sheet-template-bonfire-log' }
  }

  warnings.push(makeWarning('CURRENCY_GP_NOT_FOUND', 'Riqueza total em gp nao encontrada na area de moedas; usando 0.', 'currency.gp', undefined, 'warning'))
  debugField(debug, 'currency.gp', undefined, false, 'not found')
  return { ...field(0, 'low', undefined, ['Moedas nao encontradas na area esperada.']), source: 'default-zero' }
}

function parseBonfireLogProficiencyBonus(sheet: WorkbookSheet, totalLevel: number, warnings: ConversionWarning[], debug: SheetParseDebugInfo): FieldValue<number> {
  const anchor = findAnchorCell(sheet, ['BONUS DE PROFICIENCIA', 'PROFICIENCIA'])
  const fromSheet = findTemplateNumberFromAnchor(sheet, anchor, 'proficiencyBonus', warnings, debug, { required: false, min: 2, max: 6, allowSigned: true })
  if (typeof fromSheet.value === 'number') return { ...field(fromSheet.value, fromSheet.confidence, fromSheet.raw, fromSheet.warnings), source: 'sheet' }
  const derived = deriveProficiencyBonusFromLevel(totalLevel)
  if (derived !== null) {
    debugField(debug, 'proficiencyBonus', undefined, true, `derived from level ${totalLevel}`)
    return { ...field(derived, 'medium', `level ${totalLevel}`, ['Bonus de proficiencia derivado do nivel total.']), source: 'derived-from-level' }
  }
  warnings.push(makeWarning('PROFICIENCY_BONUS_NOT_FOUND', 'Bonus de proficiencia nao encontrado nem derivado do nivel.', 'proficiencyBonus', undefined, 'error'))
  return field(null as unknown as number, 'low')
}

function deriveProficiencyBonusFromLevel(totalLevel: number): number | null {
  if (!Number.isInteger(totalLevel) || totalLevel < 1) return null
  if (totalLevel <= 4) return 2
  if (totalLevel <= 8) return 3
  if (totalLevel <= 12) return 4
  if (totalLevel <= 16) return 5
  return 6
}

function coercePassivePerceptionFromSkills(skills: Record<SkillKey, SkillValue>): number | null {
  const perception = skills.prc?.total.value
  return typeof perception === 'number' ? 10 + perception : null
}

function rejectBackgroundCandidate(value: string): string | null {
  const normalized = normalizeSheetCellValue(value).replace(/\s+/g, ' ')
  if (!normalized) return 'empty'
  if (isUrlLike(value)) return 'background is URL'
  if (isAnchorLabel(value)) return 'background is another label'
  if (isProbablyTableHeaderOrNoise(value)) return 'background is table noise'
  if (['for', 'forca', 'str', 'destreza', 'dex', 'constituicao', 'con', 'inteligencia', 'int', 'sabedoria', 'sab', 'wis', 'carisma', 'car', 'cha'].includes(normalized)) return 'background is ability label'
  return null
}

function extractTemplateTextValue(
  sheet: WorkbookSheet,
  warnings: ConversionWarning[],
  debug: SheetParseDebugInfo,
  fieldPath: string,
  options: {
    labels: string[]
    addresses?: string[]
    range?: { startAddress: string; endAddress: string }
    required?: boolean
  },
): FieldValue<string> {
  const required = options.required ?? true
  const candidates = [
    ...(options.addresses ?? []).map((address) => getCellByAddress(sheet, address)).filter(Boolean),
    ...(options.range ? getCellsInAddressRange(sheet, options.range.startAddress, options.range.endAddress) : []),
  ] as SheetCell[]

  for (const candidate of dedupeCells(candidates)) {
    const rejectedReason = fieldPath === 'identity.name' ? rejectNameCandidate(candidate) : rejectNameLikeOrNoise(candidate.value)
    if (rejectedReason) {
      debugField(debug, fieldPath, candidate, false, rejectedReason)
      continue
    }
    debugField(debug, fieldPath, candidate, true, 'template-priority')
    return { ...field(candidate.value.trim(), 'high', `${candidate.address}: ${candidate.value}`), source: 'sheet-template-bonfire-log' }
  }

  return valueForLabelsTemplateAware(sheet, options.labels, warnings, debug, fieldPath, required)
}

function findAnchorCellsInRange(sheet: WorkbookSheet, aliases: string[], startAddress: string, endAddress: string): SheetCell[] {
  const bounds = getBoundsFromAddresses(startAddress, endAddress)
  if (!bounds) return []
  return sheet.cells.filter((cell) => cell.row >= bounds.startRow && cell.row <= bounds.endRow && cell.col >= bounds.startCol && cell.col <= bounds.endCol && matchesAnyAnchor(cell.value, aliases))
}

function findAnchorCellInRange(sheet: WorkbookSheet, aliases: string[], startAddress: string, endAddress: string): SheetCell | null {
  return findAnchorCellsInRange(sheet, aliases, startAddress, endAddress)[0] ?? null
}

function findTemplateNumberFromAnchor(
  sheet: WorkbookSheet,
  anchor: SheetCell | null,
  fieldPath: string,
  warnings: ConversionWarning[],
  debug: SheetParseDebugInfo,
  options: {
    required?: boolean
    min?: number
    max?: number
    allowSigned?: boolean
    rejectTextLike?: boolean
    blockedCellAddresses?: string[]
  },
): FieldValue<number | null> {
  const required = options.required ?? true
  if (!anchor) {
    if (required) warnings.push(makeWarning('SHEET_NUMBER_NOT_FOUND', `Numero nao encontrado na planilha: ${fieldPath}.`, fieldPath, undefined, 'warning'))
    debugField(debug, fieldPath, undefined, false, 'anchor not found')
    return field(null, 'low')
  }

  const candidates = [
    ...collectCellsAroundAnchor(sheet, anchor, [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
      [1, 1],
      [1, 2],
      [-1, 0],
      [-1, 1],
    ]),
  ]

  for (const candidate of candidates) {
    if ((options.blockedCellAddresses ?? []).includes(candidate.address)) {
      debugField(debug, fieldPath, candidate, false, 'blocked candidate address')
      continue
    }
    if (options.rejectTextLike && !/^[+-]?\d+$/.test(candidate.value.trim())) {
      debugField(debug, fieldPath, candidate, false, 'text value rejected')
      continue
    }
    const parsed = options.allowSigned ? parseSignedNumber(candidate.value) : parseUnsignedInteger(candidate.value)
    if (parsed === null) {
      debugField(debug, fieldPath, candidate, false, options.allowSigned ? 'not a signed number' : 'not an unsigned integer')
      continue
    }
    if ((options.min !== undefined && parsed < options.min) || (options.max !== undefined && parsed > options.max)) {
      debugField(debug, fieldPath, candidate, false, 'out of allowed range')
      continue
    }
    debugField(debug, fieldPath, candidate, true, `anchor ${anchor.address}`)
    return { ...field(parsed, 'high', `${candidate.address}: ${candidate.value}`), source: 'sheet-template-bonfire-log' }
  }

  if (required) warnings.push(makeWarning('SHEET_NUMBER_NOT_FOUND', `Numero nao encontrado na planilha: ${fieldPath}.`, fieldPath, anchor.value, 'warning'))
  debugField(debug, fieldPath, undefined, false, 'not found near anchor')
  return field(null, 'low')
}

function collectAbilityBlockCandidateCells(sheet: WorkbookSheet, labelCell: SheetCell): SheetCell[] {
  return dedupeCells(
    [
      [0, -3],
      [0, -2],
      [0, -1],
      [0, 1],
      [0, 2],
      [0, 3],
      [-1, 1],
      [1, 1],
    ]
      .map(([rowOffset, colOffset]) => getCellOrMerged(sheet, labelCell.row + rowOffset, labelCell.col + colOffset))
      .filter(Boolean) as SheetCell[],
  )
}

function selectAbilityScoreCell(candidates: SheetCell[], ability: AbilityKey, debug: SheetParseDebugInfo, labelCell: SheetCell): SheetCell | null {
  const validCandidates = candidates
    .map((cell) => ({ cell, score: scoreAbilityCandidate(cell, candidates) }))
    .filter((candidate) => candidate.score > Number.NEGATIVE_INFINITY)
    .sort((left, right) => right.score - left.score)
  if (!validCandidates.length) return null
  const selected = validCandidates[0].cell
  if (selected) return selected
  debugField(debug, `abilities.${ability}.score`, undefined, false, `no candidate survived near ${labelCell.address}`)
  return null
}

function scoreAbilityCandidate(cell: SheetCell, neighbors: SheetCell[]): number {
  if (isSignedModifierLike(cell.value)) return Number.NEGATIVE_INFINITY
  if (!/^\d+$/.test(cell.value.trim())) return Number.NEGATIVE_INFINITY
  const parsed = parseUnsignedInteger(cell.value)
  if (parsed === null || parsed < 1 || parsed > 30) return Number.NEGATIVE_INFINITY
  if (cell.col <= 8) return Number.NEGATIVE_INFINITY

  let score = 0
  if (cell.col === 10) score += 100
  if (cell.col === 11) score += 40
  if (parsed >= 3) score += 20
  if (parsed < 3 && neighbors.some((neighbor) => neighbor.address !== cell.address && isValidAbilityScore(neighbor.value) && parseUnsignedInteger(neighbor.value)! >= 3)) score -= 60
  score -= Math.abs(cell.col - 10) * 10
  return score
}

function describeAbilityCandidateRejection(cell: SheetCell, neighbors: SheetCell[]): string {
  if (isSignedModifierLike(cell.value)) return 'signed modifier-like value'
  if (!/^\d+$/.test(cell.value.trim())) return 'not an unsigned integer'
  const parsed = parseUnsignedInteger(cell.value)
  if (parsed === null || parsed < 1 || parsed > 30) return 'outside valid ability score range'
  if (cell.col <= 8) return 'candidate is in an auxiliary column'
  if (parsed < 3 && neighbors.some((neighbor) => neighbor.address !== cell.address && isValidAbilityScore(neighbor.value) && parseUnsignedInteger(neighbor.value)! >= 3)) return 'too small; better nearby score exists'
  return 'lower-priority nearby candidate'
}

function collectCellsAroundAnchor(sheet: WorkbookSheet, anchor: SheetCell, offsets: Array<[number, number]>): SheetCell[] {
  return dedupeCells(
    offsets
      .map(([rowOffset, colOffset]) => getCellOrMerged(sheet, anchor.row + rowOffset, anchor.col + colOffset))
      .filter(Boolean) as SheetCell[],
  )
}

function parseUnsignedInteger(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  return Number.parseInt(trimmed, 10)
}

function isValidAbilityScore(value: string): boolean {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return false
  const parsed = Number.parseInt(trimmed, 10)
  return parsed >= 1 && parsed <= 30
}

function isSignedModifierLike(value: string): boolean {
  return /^[+-]\d+$/.test(value.trim())
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

function valueForLabelsTemplateAware(sheet: WorkbookSheet, labels: string[], warnings: ConversionWarning[], debug: SheetParseDebugInfo, fieldPath: string, required = true): FieldValue<string> {
  for (const candidate of findCandidateValuesNearLabels(sheet, labels, true)) {
    const rejectedReason = rejectNameLikeOrNoise(candidate.value.value)
    if (rejectedReason) {
      debugField(debug, fieldPath, candidate.value, false, rejectedReason)
      continue
    }
    debugField(debug, fieldPath, candidate.value, true, `template anchor ${candidate.anchor.address}`)
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

function parseNullableNumberFieldTemplateAware(sheet: WorkbookSheet, labels: string[], warnings: ConversionWarning[], debug: SheetParseDebugInfo, fieldPath: string, required = true): FieldValue<number | null> {
  const found = findNumericValueNearLabels(sheet, labels, true)
  if (found) {
    debugField(debug, fieldPath, found.cell, true, `template anchor ${found.anchor.address}`)
    return field(found.value, 'high', `${found.anchor.value}: ${found.cell.value}`)
  }
  if (required) warnings.push(makeWarning('SHEET_NUMBER_NOT_FOUND', `Numero nao encontrado na planilha: ${labels[0]}.`, fieldPath))
  debugField(debug, fieldPath, undefined, false, 'not found')
  return field(null, 'low')
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

function findCandidateValuesNearLabels(sheet: WorkbookSheet, labels: string[], wide = false): Array<{ anchor: SheetCell; value: SheetCell }> {
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
    if (wide) {
      positions.push([anchor.row, anchor.col + 4], [anchor.row + 1, anchor.col + 2], [anchor.row - 1, anchor.col + 2], [anchor.row + 2, anchor.col], [anchor.row - 2, anchor.col])
    }
    return positions.flatMap(([row, col]) => {
      const cell = getCellOrMerged(sheet, row, col)
      return cell && cell.address !== anchor.address ? [{ anchor, value: cell }] : []
    })
  })
}

function findNumericValueNearLabels(sheet: WorkbookSheet, labels: string[], wide = false): { anchor: SheetCell; cell: SheetCell; value: number } | null {
  for (const candidate of findCandidateValuesNearLabels(sheet, labels, wide)) {
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
  const labelCell = sheet.cells.find((cell) => cell.row > section.row && cell.row <= maxRow && matchesAnyAnchor(cell.value, aliases, 'phrase', 4))
  if (!labelCell) return null
  const candidates = [getCellOrMerged(sheet, labelCell.row, labelCell.col + 1), getCellOrMerged(sheet, labelCell.row, labelCell.col - 1), getCellOrMerged(sheet, labelCell.row, labelCell.col + 2), getCellOrMerged(sheet, labelCell.row + 1, labelCell.col)].filter(Boolean) as SheetCell[]
  for (const cell of candidates) {
    const parsed = parseSignedNumber(cell.value)
    if (parsed !== null) return { anchor: labelCell, cell, value: parsed }
  }
  return null
}

function findAnchorCells(sheet: WorkbookSheet, aliases: string[]): SheetCell[] {
  return sheet.cells.filter((cell) => matchesAnyAnchor(cell.value, aliases))
}

function getCellByAddress(sheet: WorkbookSheet, address: string): SheetCell | null {
  return sheet.cells.find((cell) => cell.address === address) ?? null
}

function getCellsInAddressRange(sheet: WorkbookSheet, startAddress: string, endAddress: string): SheetCell[] {
  const start = parseA1Address(startAddress)
  const end = parseA1Address(endAddress)
  if (!start || !end) return []
  const startRow = Math.min(start.row, end.row)
  const endRow = Math.max(start.row, end.row)
  const startCol = Math.min(start.col, end.col)
  const endCol = Math.max(start.col, end.col)
  return dedupeCells(
    sheet.cells.filter((cell) => cell.row >= startRow && cell.row <= endRow && cell.col >= startCol && cell.col <= endCol),
  )
}

function getCellOrMerged(sheet: WorkbookSheet, row: number, col: number): SheetCell | null {
  const direct = sheet.cells.find((cell) => cell.row === row && cell.col === col)
  if (direct) return direct
  const merge = sheet.merges.find((candidate) => row >= candidate.startRow && row <= candidate.endRow && col >= candidate.startCol && col <= candidate.endCol)
  if (!merge) return null
  return sheet.cells.find((cell) => cell.row === merge.startRow && cell.col === merge.startCol) ?? null
}

function parseA1Address(address: string): { row: number; col: number } | null {
  const match = /^([A-Z]+)(\d+)$/i.exec(address.trim())
  if (!match) return null
  const [, letters, rowText] = match
  let col = 0
  for (const letter of letters.toUpperCase()) col = col * 26 + (letter.charCodeAt(0) - 64)
  return { row: Number.parseInt(rowText, 10) - 1, col: col - 1 }
}

function getBoundsFromAddresses(startAddress: string, endAddress: string): { startRow: number; endRow: number; startCol: number; endCol: number } | null {
  const start = parseA1Address(startAddress)
  const end = parseA1Address(endAddress)
  if (!start || !end) return null
  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endCol: Math.max(start.col, end.col),
  }
}

function dedupeCells(cells: SheetCell[]): SheetCell[] {
  const seen = new Set<string>()
  return cells.filter((cell) => {
    const key = `${cell.address}:${cell.mergeSourceAddress ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function restrictSheetToRegion(sheet: WorkbookSheet, region: SheetRegionCandidate): WorkbookSheet {
  const { bounds } = region
  const cells = sheet.cells.filter((cell) => cell.row >= bounds.startRow && cell.row <= bounds.endRow && cell.col >= bounds.startCol && cell.col <= bounds.endCol)
  const rows = sheet.rows.map((row, rowIndex) => row.map((value, colIndex) => (rowIndex >= bounds.startRow && rowIndex <= bounds.endRow && colIndex >= bounds.startCol && colIndex <= bounds.endCol ? value : '')))
  const merges = sheet.merges.filter((merge) => merge.startRow >= bounds.startRow && merge.endRow <= bounds.endRow && merge.startCol >= bounds.startCol && merge.endCol <= bounds.endCol)
  return { ...sheet, rows, cells, merges }
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

function createEmptyCharacter(workbook: WorkbookData, warnings: ConversionWarning[], parseRunId: string, normalizedCharacterId: string): NormalizedCharacter {
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
    identity: { name: field('', 'low'), player: field('', 'low'), classText: field('', 'low'), classes: [], background: field('', 'low'), race: field('', 'low'), alignment: field('', 'low'), xp: field(null, 'low') },
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
    pipeline: {
      parserBuildId: PARSER_BUILD_ID,
      parseRunId,
      normalizedCharacterId,
      actorBuildId: null,
      auditBuildId: null,
    },
    warnings,
  }
}

function finalizeExtractedFields(character: NormalizedCharacter, debug: SheetParseDebugInfo) {
  setExtractedField({ character, debug, fieldPath: 'identity.name', extracted: character.identity.name })
  if (character.identity.player) setExtractedField({ character, debug, fieldPath: 'identity.player', extracted: character.identity.player })
  setExtractedField({ character, debug, fieldPath: 'identity.classText', extracted: character.identity.classText })
  setExtractedField({ character, debug, fieldPath: 'identity.race', extracted: character.identity.race })
  setExtractedField({ character, debug, fieldPath: 'identity.background', extracted: character.identity.background })
  setExtractedField({ character, debug, fieldPath: 'identity.alignment', extracted: character.identity.alignment })
  setExtractedField({ character, debug, fieldPath: 'proficiencyBonus', extracted: character.proficiencyBonus })
  setExtractedField({ character, debug, fieldPath: 'currency.gp', extracted: character.currency.gp })

  for (const key of Object.keys(abilityLabels) as AbilityKey[]) {
    setExtractedField({ character, debug, fieldPath: `abilities.${key}.score`, extracted: character.abilities[key].score })
    setExtractedField({ character, debug, fieldPath: `abilities.${key}.mod`, extracted: character.abilities[key].mod })
  }

  setExtractedField({ character, debug, fieldPath: 'attributes.ac', extracted: character.attributes.ac })
  setExtractedField({ character, debug, fieldPath: 'attributes.initiative', extracted: character.attributes.initiative })
  setExtractedField({ character, debug, fieldPath: 'attributes.speed', extracted: character.attributes.speed })
  setExtractedField({ character, debug, fieldPath: 'attributes.passivePerception', extracted: character.attributes.passivePerception })
  setExtractedField({ character, debug, fieldPath: 'attributes.hp.max', extracted: character.attributes.hp.max })
  setExtractedField({ character, debug, fieldPath: 'attributes.hp.value', extracted: character.attributes.hp.value })
}

function setExtractedField({
  character,
  debug,
  fieldPath,
  extracted,
}: {
  character: NormalizedCharacter
  debug: SheetParseDebugInfo
  fieldPath: string
  extracted: FieldValue<unknown> | undefined
}) {
  if (!extracted) return
  setFieldValueAtPath(character, fieldPath, extracted)
  const accepted = isAcceptedExtractedValue(extracted.value)
  const entry: ExtractedFieldDebugEntry = {
    fieldPath,
    cellAddress: extractCellAddressFromRaw(extracted.raw),
    rawValue: normalizeRawDisplay(extracted.raw),
    normalizedValue: typeof extracted.value === 'string' ? normalizeSheetCellValue(extracted.value) : extracted.value === null || extracted.value === undefined ? undefined : String(extracted.value),
    accepted,
    reason: accepted ? extracted.source ?? extracted.raw ?? 'final extracted value' : 'not found',
    rejectedReason: accepted ? undefined : 'not found',
  }
  const existingIndex = debug.finalExtractedFields.findIndex((candidate) => candidate.fieldPath === fieldPath)
  if (existingIndex >= 0) debug.finalExtractedFields[existingIndex] = { ...debug.finalExtractedFields[existingIndex], ...entry }
  else debug.finalExtractedFields.push(entry)
}

function setFieldValueAtPath(target: Record<string, unknown>, fieldPath: string, value: unknown) {
  const segments = fieldPath.split('.')
  let current: Record<string, unknown> = target
  for (const segment of segments.slice(0, -1)) {
    const next = current[segment]
    if (!next || typeof next !== 'object') return
    current = next as Record<string, unknown>
  }
  current[segments.at(-1) as string] = value
}

function isAcceptedExtractedValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return Boolean(value.trim())
  return true
}

function extractCellAddressFromRaw(raw?: string): string | undefined {
  if (!raw) return undefined
  const match = /\b([A-Z]+[0-9]+)\b/.exec(raw)
  return match?.[1]
}

function normalizeRawDisplay(raw?: string): string | undefined {
  if (!raw) return undefined
  const colonIndex = raw.indexOf(':')
  return colonIndex >= 0 ? raw.slice(colonIndex + 1).trim() : raw
}

function ruleMatchesText(name: string, aliases: string[], value: string): boolean {
  const normalizedValue = normalizeSheetCellValue(value)
  if (!normalizedValue) return false
  return [name, ...aliases].some((candidate) => normalizeSheetCellValue(candidate) === normalizedValue)
}

function validateExtractedCharacter(character: NormalizedCharacter) {
  for (const key of Object.keys(abilityLabels) as AbilityKey[]) {
    const score = character.abilities[key].score
    const raw = score.raw ?? ''
    const invalid =
      typeof score.value !== 'number' ||
      !Number.isInteger(score.value) ||
      score.value < 1 ||
      score.value > 30 ||
      /^[-+]/.test(normalizeRawDisplay(raw) ?? '')
    if (invalid) {
      character.warnings.push(makeWarning('SHEET_ABILITY_SCORE_INVALID', `Atributo invalido para ${key}.`, `abilities.${key}.score`, raw || undefined, 'error'))
    }
  }

  if (rejectBackgroundCandidate(character.identity.background.value)) {
    character.warnings.push(
      makeWarning(
        'BACKGROUND_INVALID_TEMPLATE_VALUE',
        'Antecedente extraido parece ser label de atributo ou valor invalido.',
        'identity.background',
        character.identity.background.raw ?? character.identity.background.value,
        'error',
      ),
    )
  }

  const passive = character.attributes.passivePerception
  if (passive.value !== null && (typeof passive.value !== 'number' || !Number.isInteger(passive.value))) {
    character.warnings.push(makeWarning('PASSIVE_PERCEPTION_INVALID', 'Percepcao passiva precisa ser numero inteiro ou nula.', 'attributes.passivePerception', passive.raw, 'error'))
  }

  const speed = character.attributes.speed
  const hpMax = character.attributes.hp.max
  if (
    typeof speed.value === 'number' &&
    typeof hpMax.value === 'number' &&
    speed.value === hpMax.value &&
    extractCellAddressFromRaw(speed.raw) &&
    extractCellAddressFromRaw(speed.raw) === extractCellAddressFromRaw(hpMax.raw)
  ) {
    character.warnings.push(makeWarning('SHEET_SPEED_LOOKS_LIKE_HP_DUPLICATE', 'Velocidade parece ter sido lida da mesma celula de PV maximo.', 'attributes.speed', speed.raw, 'error'))
  }

  const gp = character.currency.gp
  if (typeof gp.value !== 'number' || !Number.isFinite(gp.value) || /\b(gp|po|sp|pp|cp|ep)\b/i.test(gp.raw ?? '') || /\./.test(gp.raw ?? '')) {
    character.warnings.push(makeWarning('CURRENCY_GP_INVALID', 'O valor de gp parece vir de preco de item ou nao e um total valido.', 'currency.gp', gp.raw, 'error'))
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
  const present = new Set(debug.finalExtractedFields.map((entry) => entry.fieldPath))
  for (const fieldPath of criticalFieldPaths) {
    if (!present.has(fieldPath)) {
      debug.finalExtractedFields.push({
        fieldPath,
        accepted: false,
        reason: 'not evaluated',
        rejectedReason: 'not evaluated',
      })
    }
  }
}

function abilitySnapshot(character: NormalizedCharacter): Record<string, number | null> {
  return Object.fromEntries((Object.keys(abilityLabels) as AbilityKey[]).map((key) => [key, character.abilities[key].score.value ?? null]))
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
  const entry: ExtractedFieldDebugEntry = {
    fieldPath,
    cellAddress: cell?.address,
    rawValue: cell?.value,
    normalizedValue: cell ? normalizeSheetCellValue(cell.value) : undefined,
    inheritedFromMerge: cell?.inheritedFromMerge,
    mergeSourceAddress: cell?.mergeSourceAddress,
    accepted,
    reason,
    rejectedReason: accepted ? undefined : reason,
  }
  debug.extractedFields.push(entry)
  debug.extractionAttempts.push(entry)
}
