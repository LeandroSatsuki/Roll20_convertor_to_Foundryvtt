import type { AbilityKey, NormalizedAttack, NormalizedEquipment, NormalizedFeature, NormalizedResource, NormalizedSpell } from '../../normalize/normalizedCharacterTypes'
import { resolveFeature } from '../../rules/featureResolver'
import { defaultBonfireRuleStore } from '../../rules/bonfireRuleStore'
import { resolveSpellOverride } from '../../rules/spellResolver'
import { resolveWeaponOrEquipment } from '../../rules/weaponResolver'
import type { FeatureResolution } from '../../rules/bonfireTypes'
import { createAttackActivity, createCastActivity, createHealActivity, createUtilityActivity, validateActivityShape, type FoundryActivityShape } from '../activities'
import type { FoundryItem } from '../foundryTypes'
import { foundryId } from '../ids'
import { toFoundryIdentifier } from '../identifiers'
import { escapeHtml, itemStats } from '../mapWeapons'
import { buildRuleDescriptionMeta, buildSpellDescriptionMeta, type ItemDescriptionMeta } from './ruleDescription'
import { featureLibrarySuggestionAliases } from '../../foundry-library/foundryLibraryAliases'
import { normalizeRuleLookupKey } from '../../rules/store/bonfireAliases'
import { stripFeatureLevelPrefix } from '../../sheets/templateNoise'

export type ItemAutomationLevel = 'full' | 'partial' | 'none'

export type ItemAutomationMeta = {
  level: ItemAutomationLevel
  sourceCodeMarker: string
  activitiesCreated: Array<{ id: string; type: string; name: string }>
  invalidActivitiesCount: number
  warnings: string[]
  usesConfigured: boolean
  recoveryConfigured: boolean
  structuredAutomationConfigured: boolean
}

type BaseItemBuildOptions = {
  name: string
  type: string
  img: string
  identifier: string
  description: string
  descriptionHtml?: string
  sourceBook: string
  converterFlags: Record<string, unknown>
  system?: Record<string, unknown>
  automation?: {
    requestedLevel: ItemAutomationLevel
    activities?: FoundryActivityShape[]
    warnings?: string[]
    usesConfigured?: boolean
    recoveryConfigured?: boolean
    structuredAutomationConfigured?: boolean
  }
}

type FeatureContext = {
  className?: string
  level?: number
  subclass?: string
  race?: string
  background?: string
  sourceFileName?: string
}

const automationSourceCodeMarker = 'foundry-item-automation-v1'
const defaultSource = { rules: '2024', book: 'Bonfire Tales / Sheet', page: '', license: '' }

export function buildGenericItem(options: BaseItemBuildOptions): FoundryItem {
  const item: FoundryItem = {
    _id: foundryId(),
    name: options.name,
    type: options.type,
    img: options.img,
    system: {
      identifier: options.identifier,
      description: { value: options.descriptionHtml ?? `<p>${escapeHtml(options.description)}</p>`, chat: '' },
      source: { ...defaultSource, book: options.sourceBook },
      uses: { spent: null, max: '', recovery: [] },
      activities: {},
      ...(options.system ?? {}),
    },
    effects: [],
    folder: null,
    flags: {
      'roll20-to-foundry': { ...options.converterFlags },
    },
    _stats: itemStats(),
  }

  return applyAutomation(item, options.automation)
}

function mergeDescriptionMeta(flags: Record<string, unknown>, meta: ItemDescriptionMeta): Record<string, unknown> {
  return {
    ...flags,
    sourceUrl: meta.sourceUrl ?? flags.sourceUrl,
    descriptionMeta: {
      status: meta.status,
      sourceUrl: meta.sourceUrl ?? null,
      sourceName: meta.sourceName ?? null,
      sourceType: meta.sourceType ?? null,
      warningCodes: meta.warningCodes,
      warningMessages: meta.warningMessages,
      needsReviewReasons: meta.needsReviewReasons ?? [],
      overrideApplied: Boolean(meta.overrideApplied),
    },
  }
}

export function buildFeatItem(options: {
  feature?: NormalizedFeature
  resource?: NormalizedResource
  identifier: string
  context: FeatureContext
  spellcastingAbility?: AbilityKey | null
}): FoundryItem {
  const name = options.feature?.name.value ?? options.resource?.label.value ?? 'Unknown Feature'
  const raw = options.feature?.raw ?? options.resource?.raw ?? name
  const resolution = resolveFeature(raw || name, { ...options.context, section: options.feature?.sourceType ?? 'action' }, defaultBonfireRuleStore)
  if (options.feature && isBonfireRuleNotFound(resolution)) {
    return buildUnresolvedBonfireRuleItem({
      feature: options.feature,
      resolution,
      identifier: options.identifier,
      context: options.context,
      originalName: name,
      raw,
    })
  }
  const descriptionMeta = buildRuleDescriptionMeta({
    itemName: resolution.confidence === 'low' ? name : resolution.resolvedName,
    itemKind: resolution.kind,
    ruleId: resolution.ruleId,
    fallbackText: options.feature?.description.value || raw,
    sourceUrl: resolution.sourceUrl,
    sourceName: 'Bonfire Tales',
  })
  const max = typeof resolution.uses?.max === 'number' ? resolution.uses.max : options.feature?.uses?.max.value ?? options.resource?.max.value ?? null
  const currentValue = options.feature?.uses?.value.value ?? options.resource?.value.value ?? null
  const spent = typeof max === 'number' && typeof currentValue === 'number' ? Math.max(max - currentValue, 0) : typeof max === 'number' ? 0 : null
  const recovery = mapRecoveryEntries(options.feature?.uses?.recovery ?? options.resource?.recovery.value ?? resolution.uses?.recovery)
  const activationType = resolution.activation ?? options.feature?.activation?.type ?? inferFeatureActivation(name)
  const usesConfigured = max !== null
  const recoveryConfigured = recovery.length > 0
  const activities: FoundryActivityShape[] = []
  const warnings = [...resolution.warnings.map((warning) => warning.message), ...descriptionMeta.warningMessages]
  let requestedLevel: ItemAutomationLevel = 'none'
  let structuredAutomationConfigured = usesConfigured || recoveryConfigured
  const bonfireMatched = shouldPreferBonfireFeatureResolution(options.feature, resolution, raw, name)
  const librarySuggestions = featureLibrarySuggestionAliases(options.feature?.rawName ?? raw)
  const system: Record<string, unknown> = {
    activation: { type: activationType, cost: null, condition: '' },
    uses: {
      spent,
      max: max ?? '',
      recovery,
    },
  }

  if (resolution.kind === 'spellcasting' || /conjura[cç][aã]o/i.test(name)) {
    system.spellcasting = { ability: options.spellcastingAbility ?? 'wis', progression: 'full', preparation: 'prepared' }
    activities.push(
      createCastActivity({
        name,
        activationType: 'special',
        ability: options.spellcastingAbility ?? 'wis',
        progression: 'full',
        preparation: 'prepared',
        consumesSpellSlot: false,
        notes: 'Spellcasting bridge generated by the converter.',
      }),
    )
    requestedLevel = options.spellcastingAbility ? 'full' : 'partial'
    structuredAutomationConfigured = true
    if (!options.spellcastingAbility) warnings.push('Habilidade de conjuração não estava explícita; revisar item Conjuração.')
  } else if (/Canalizar Divindade/i.test(name)) {
    activities.push(
      createUtilityActivity({
        name,
        activationType: 'action',
        notes: 'Uses configured from Bonfire rule resolution.',
      }),
    )
    requestedLevel = 'full'
    structuredAutomationConfigured = true
  }

  return buildGenericItem({
    name: resolution.confidence === 'low' ? name : resolution.resolvedName,
    type: 'feat',
    img: resolution.kind === 'spellcasting' ? 'icons/svg/book.svg' : 'icons/svg/item-bag.svg',
    identifier: options.identifier,
    description: options.feature?.description.value || raw,
    descriptionHtml: descriptionMeta.html,
    sourceBook: resolution.kind === 'spellcasting' ? 'Bonfire Tales' : 'Bonfire Tales / Sheet',
    converterFlags: mergeDescriptionMeta({
      rawName: raw,
      resolvedKind: resolution.kind,
      confidence: resolution.confidence,
      source: 'bonfire-rule-store',
      featureResolution: {
        sourcePriority: 'bonfire-first',
        bonfireMatched,
        bonfireRuleId: resolution.ruleId ?? null,
        libraryCandidateRejectedBecauseBonfireMatched: false,
        librarySuggestionName: null,
        sourceCell: options.feature?.sourceCell ?? null,
        sourceRange: options.feature?.sourceRange ?? null,
        librarySuggestionAliases: librarySuggestions,
      },
      featureSource:
        options.feature?.source === 'bonfire-v2.1'
          ? {
              fromSheetRange: true,
              sourceCell: options.feature.sourceCell ?? null,
              sourceRange: options.feature.sourceRange ?? null,
              sourceGroup: options.feature.sourceGroup ?? null,
              rawName: options.feature.rawName ?? options.feature.raw ?? raw,
              cleanedName: options.feature.cleanedName ?? options.feature.name.value,
              inferredKind: options.feature.inferredKind ?? null,
              classificationReason: options.feature.classificationReason ?? null,
              hydratedFromLibrary: false,
              fallbackBonfire: Boolean(resolution.ruleId),
              unresolved: !resolution.ruleId,
            }
          : undefined,
      sourceUrl: resolution.sourceUrl,
      warnings,
      ruleResolution: toRuleResolution(resolution, raw, raw),
    }, descriptionMeta),
    system,
    automation: {
      requestedLevel,
      activities,
      warnings,
      usesConfigured,
      recoveryConfigured,
      structuredAutomationConfigured,
    },
  })
}

function isBonfireRuleNotFound(resolution: FeatureResolution): boolean {
  return !resolution.ruleId || resolution.confidence === 'low' || resolution.kind === 'unknown'
}

function buildUnresolvedBonfireRuleItem(options: {
  feature: NormalizedFeature
  resolution: FeatureResolution
  identifier: string
  context: FeatureContext
  originalName: string
  raw: string
}): FoundryItem {
  const category = inferUnresolvedBonfireCategory(options.feature)
  const originalName = cleanOriginalRuleName(options.feature.rawName ?? options.feature.cleanedName ?? options.originalName)
  const placeholderName = `${originalName} (Não Encontrado, CORRIGIR!)`
  const descriptionHtml = renderUnresolvedBonfireDescription({
    originalName,
    category,
    sourceCell: options.feature.sourceCell,
    sourceRange: options.feature.sourceRange,
    sourceFileName: options.context.sourceFileName,
  })

  return buildGenericItem({
    name: placeholderName,
    type: 'feat',
    img: 'icons/svg/hazard.svg',
    identifier: options.identifier,
    description: `${originalName}: regra Bonfire nao encontrada; revisar manualmente.`,
    descriptionHtml,
    sourceBook: 'Bonfire Tales / Sheet',
    converterFlags: {
      rawName: options.raw,
      resolvedKind: options.feature.inferredKind ?? options.feature.sourceType ?? 'unknownFeature',
      confidence: 'low',
      source: 'bonfire-rule-store',
      warnings: ['BONFIRE_RULE_COVERAGE_MISSING', 'FEATURE_UNRESOLVED_REVIEW_REQUIRED'],
      descriptionMeta: {
        status: 'complete',
        sourceUrl: null,
        sourceName: 'Conversor local',
        warningCodes: [],
        warningMessages: [],
        overrideApplied: false,
      },
      bonfireResolution: {
        status: 'not-found',
        playerVisibleStatus: 'Não Encontrado, CORRIGIR!',
        source: 'bonfire-rule-store',
        originalName,
        category,
        sourceCell: options.feature.sourceCell ?? null,
        sourceRange: options.feature.sourceRange ?? null,
        sourceFileName: options.context.sourceFileName ?? null,
        shouldReview: true,
      },
      featureResolution: {
        sourcePriority: 'bonfire-first',
        bonfireMatched: false,
        bonfireRuleId: null,
        libraryCandidateRejectedBecauseBonfireMatched: false,
        librarySuggestionName: null,
        sourceCell: options.feature.sourceCell ?? null,
        sourceRange: options.feature.sourceRange ?? null,
        librarySuggestionAliases: featureLibrarySuggestionAliases(options.feature.rawName ?? options.raw),
      },
      featureSource:
        options.feature.source === 'bonfire-v2.1'
          ? {
              fromSheetRange: true,
              sourceCell: options.feature.sourceCell ?? null,
              sourceRange: options.feature.sourceRange ?? null,
              sourceGroup: options.feature.sourceGroup ?? null,
              rawName: options.feature.rawName ?? options.feature.raw ?? options.raw,
              cleanedName: options.feature.cleanedName ?? options.feature.name.value,
              inferredKind: options.feature.inferredKind ?? null,
              classificationReason: options.feature.classificationReason ?? null,
              hydratedFromLibrary: false,
              fallbackBonfire: false,
              unresolved: true,
            }
          : undefined,
      ruleResolution: {
        rawName: options.raw,
        resolvedName: originalName,
        kind: options.resolution.kind,
        confidence: 'unknown',
        score: options.resolution.score ?? 0,
        ruleId: null,
        sourceUrl: null,
        candidates: options.resolution.candidates ?? [],
        manuallyResolved: false,
      },
    },
    system: {
      type: { value: category, subtype: '' },
    },
    automation: {
      requestedLevel: 'none',
      warnings: ['Regra Bonfire nao encontrada; nenhum activity foi criado.'],
      structuredAutomationConfigured: false,
    },
  })
}

function inferUnresolvedBonfireCategory(feature: NormalizedFeature): 'race' | 'class' | 'feat' | 'background' | 'other' {
  const kind = feature.inferredKind ?? feature.sourceType
  if (/race/i.test(kind)) return 'race'
  if (/class|subclass/i.test(kind)) return 'class'
  if (/background/i.test(kind)) return 'background'
  if (/feat|talento/i.test(kind)) return 'feat'
  return 'other'
}

function cleanOriginalRuleName(name: string): string {
  return stripFeatureLevelPrefix(name.replace(/\s+\(N(?:a|ã)o Encontrado, CORRIGIR!\)$/i, '').trim()) || 'Regra Bonfire'
}

function renderUnresolvedBonfireDescription(options: {
  originalName: string
  category: string
  sourceCell?: string
  sourceRange?: string
  sourceFileName?: string
}): string {
  return [
    '<section class="bonfire-unresolved-rule">',
    `<h2>${escapeHtml(options.originalName)}</h2>`,
    '<p><strong>Status:</strong> Não Encontrado, CORRIGIR!</p>',
    '<p>Esta regra foi detectada na ficha, mas não foi encontrada no Bonfire Rule Store.</p>',
    `<p><strong>Categoria inferida:</strong> ${escapeHtml(options.category)}</p>`,
    `<p><strong>Origem:</strong> ${escapeHtml(options.sourceCell ?? 'desconhecida')} / ${escapeHtml(options.sourceRange ?? 'desconhecida')}</p>`,
    `<p><strong>Arquivo:</strong> ${escapeHtml(options.sourceFileName ?? 'desconhecido')}</p>`,
    '</section>',
  ].join('')
}

const bonfirePreferredFeatureKeys = new Set(
  [
    'vinculo-natural',
    'ordem-primal',
    'ordem-primal-xama',
    'ordem-primal-guardiao',
    'surto-selvagem',
    'surto-selvagem-elo-primal',
    'surto-selvagem-veu-do-crepusculo',
    'juramento-tres-luas',
    'iniciado-no-juramento-das-tres-luas',
    'refugio-onirico',
    'intuicao-selvagem',
    'sonho-da-lua',
    'bruma-serenante',
    'ancestralidade-feerica',
    'transe-elfico',
    'sentidos-entreplanos',
    'lestos-como-o-vento',
    'afinidade-lunar',
  ],
)

function shouldPreferBonfireFeatureResolution(
  feature: NormalizedFeature | undefined,
  resolution: FeatureResolution,
  raw: string,
  name: string,
): boolean {
  if (!feature || !resolution.ruleId) return false
  if (resolution.confidence !== 'high' && resolution.confidence !== 'medium') return false
  const keys = [feature.rawName, feature.cleanedName, raw, name, resolution.resolvedName]
    .map((value) => normalizeRuleLookupKey(value ?? ''))
    .filter(Boolean)
  return keys.some((key) => bonfirePreferredFeatureKeys.has(key))
}

export function buildWeaponItem(attack: NormalizedAttack, identifier: string): FoundryItem {
  const rule = resolveWeaponOrEquipment(attack.name.value)
  const descriptionMeta = buildRuleDescriptionMeta({
    itemName: rule?.name ?? attack.name.value,
    itemKind: 'weapon',
    ruleId: rule?.id,
    fallbackText: attack.raw || attack.name.value,
    sourceUrl: rule?.sourceUrl,
    sourceName: 'Bonfire Tales',
  })
  const formula = attack.damageFormula.value ?? rule?.damage ?? ''
  const damage = parseDamageFormula(formula)
  const damageType = attack.damageType.value ?? rule?.damageType ?? ''
  const mode = rule?.properties.includes('ammunition') ? 'ranged' : 'melee'
  const ability = mode === 'ranged' ? 'dex' : 'str'
  const activities: FoundryActivityShape[] = []
  const warnings: string[] = [...descriptionMeta.warningMessages]
  let requestedLevel: ItemAutomationLevel = 'partial'

  if (damage.formula && damageType) {
    activities.push(
      createAttackActivity({
        name: attack.name.value,
        activationType: 'action',
        ability,
        mode,
        classification: 'weapon',
        damageFormula: damage.formula,
        damageType,
        attackBonus: attack.attackBonus.value,
        range: mode === 'ranged' ? { value: 80, long: 320, units: 'ft' } : undefined,
        notes: 'Weapon activity generated from attack row and Bonfire item rule.',
      }),
    )
    requestedLevel = 'full'
  } else {
    warnings.push('Arma exportada sem activity porque dano/tipo não ficaram seguros.')
  }

  return buildGenericItem({
    name: attack.name.value,
    type: 'weapon',
    img: 'icons/weapons/bows/shortbow-recurve-leather-brown.webp',
    identifier,
    description: attack.raw || attack.name.value,
    descriptionHtml: descriptionMeta.html,
    sourceBook: 'Bonfire Tales / Sheet',
    converterFlags: mergeDescriptionMeta({
      source: 'roll20-pdf',
      confidence: attack.name.confidence,
      raw: attack.raw,
      warnings,
      ruleResolution: {
        rawName: attack.raw || attack.name.value,
        resolvedName: rule?.name ?? attack.name.value,
        kind: 'weapon',
        confidence: rule ? 'high' : 'low',
        score: rule ? 100 : 0,
        ruleId: rule?.id,
        sourceUrl: rule?.sourceUrl,
        candidates: rule ? [{ ruleId: rule.id, name: rule.name, kind: 'weapon', score: 100, confidence: 'high' }] : [],
        manuallyResolved: false,
      },
    }, descriptionMeta),
    system: {
      equipped: true,
      proficient: 1,
      type: { value: mode === 'ranged' ? 'simpleR' : 'simpleM', baseItem: '' },
      damage: {
        base: {
          number: damage.number,
          denomination: damage.denomination,
          bonus: damage.bonus,
          types: damageType ? [damageType] : [],
          custom: { enabled: Boolean(damage.formula), formula: damage.formula },
        },
      },
      range: { value: mode === 'ranged' ? 80 : null, long: mode === 'ranged' ? 320 : null, units: 'ft' },
    },
    automation: {
      requestedLevel,
      activities,
      warnings,
      structuredAutomationConfigured: true,
    },
  })
}

export function buildArmorItem(item: NormalizedEquipment, identifier: string): FoundryItem {
  const rule = resolveWeaponOrEquipment(item.name.value)
  const descriptionMeta = buildRuleDescriptionMeta({
    itemName: rule?.name ?? item.name.value,
    itemKind: 'armor',
    ruleId: rule?.id,
    fallbackText: item.raw,
    sourceUrl: rule?.sourceUrl,
    sourceName: 'Bonfire Tales',
  })
  const warnings: string[] = [...descriptionMeta.warningMessages]
  let structuredAutomationConfigured = false
  let requestedLevel: ItemAutomationLevel = 'partial'
  const system: Record<string, unknown> = {
    quantity: item.quantity.value,
    equipped: true,
  }

  if (rule?.category === 'shield' || /shield/i.test(item.name.value)) {
    system.armor = { type: 'shield', value: 2 }
    structuredAutomationConfigured = true
    requestedLevel = 'full'
  } else if (/scale mail/i.test(item.name.value) || rule?.id === 'scale-mail') {
    system.armor = { type: 'medium', value: 14, dex: 2 }
    system.stealth = { disadvantage: true }
    structuredAutomationConfigured = true
    requestedLevel = 'full'
  } else if (rule) {
    system.armor = { type: rule.category, value: null }
    warnings.push('Armadura reconhecida, mas sem automação específica além do tipo.')
    structuredAutomationConfigured = true
  } else {
    warnings.push('Armadura exportada com shape genérico; revisar AC manualmente.')
  }

  return buildGenericItem({
    name: item.name.value,
    type: 'equipment',
    img: /shield/i.test(item.name.value) ? 'icons/equipment/shield/heater-crystal-blue.webp' : 'icons/equipment/chest/breastplate-layered-steel.webp',
    identifier,
    description: rule?.properties.join(', ') || item.raw,
    descriptionHtml: descriptionMeta.html,
    sourceBook: 'Bonfire Tales / Sheet',
    converterFlags: mergeDescriptionMeta({
      rawName: item.raw,
      resolvedKind: rule?.category === 'shield' ? 'armor' : 'armor',
      confidence: item.name.confidence,
      source: 'bonfire-xlsx',
      sourceUrl: rule?.sourceUrl,
      warnings,
      ruleResolution: {
        rawName: item.raw || item.name.value,
        resolvedName: rule?.name ?? item.name.value,
        kind: 'armor',
        confidence: rule ? 'high' : 'low',
        score: rule ? 100 : 0,
        ruleId: rule?.id,
        sourceUrl: rule?.sourceUrl,
        candidates: rule ? [{ ruleId: rule.id, name: rule.name, kind: 'armor', score: 100, confidence: 'high' }] : [],
        manuallyResolved: false,
      },
    }, descriptionMeta),
    system,
    automation: {
      requestedLevel,
      warnings,
      structuredAutomationConfigured,
    },
  })
}

export function buildConsumableItem(item: NormalizedEquipment, identifier: string): FoundryItem {
  const rule = resolveWeaponOrEquipment(item.name.value)
  const descriptionMeta = buildRuleDescriptionMeta({
    itemName: rule?.name ?? item.name.value,
    itemKind: 'consumable',
    ruleId: rule?.id,
    fallbackText: item.raw,
    sourceUrl: rule?.sourceUrl,
    sourceName: 'Bonfire Tales',
  })
  const warnings: string[] = [...descriptionMeta.warningMessages]
  const activities: FoundryActivityShape[] = []
  let usesConfigured = false
  let recoveryConfigured = false
  let requestedLevel: ItemAutomationLevel = 'none'
  let structuredAutomationConfigured = false
  const system: Record<string, unknown> = {
    quantity: item.quantity.value,
    type: { value: 'consumable' },
  }

  if (/Potion of Healing/i.test(item.name.value)) {
    activities.push(
      createHealActivity({
        name: item.name.value,
        activationType: 'action',
        formula: '2d4+2',
        notes: 'Standard potion healing formula.',
      }),
    )
    system.uses = {
      spent: 0,
      max: 1,
      recovery: [],
    }
    system.consumableType = 'potion'
    usesConfigured = true
    structuredAutomationConfigured = true
    requestedLevel = 'full'
  } else if (/[ÁA]gua Benta|Holy Water/i.test(item.name.value)) {
    system.consumableType = 'gear'
    warnings.push('Água Benta exportada sem activity de dano porque a aplicação segura não ficou determinada.')
    structuredAutomationConfigured = true
    requestedLevel = 'partial'
  } else {
    warnings.push('Consumível exportado com shape genérico.')
  }

  return buildGenericItem({
    name: item.name.value,
    type: 'consumable',
    img: 'icons/consumables/potions/potion-bottle-red.webp',
    identifier,
    description: rule?.properties.join(', ') || item.raw,
    descriptionHtml: descriptionMeta.html,
    sourceBook: 'Bonfire Tales / Sheet',
    converterFlags: mergeDescriptionMeta({
      rawName: item.raw,
      resolvedKind: 'consumable',
      confidence: item.name.confidence,
      source: 'bonfire-xlsx',
      sourceUrl: rule?.sourceUrl,
      warnings,
      ruleResolution: {
        rawName: item.raw || item.name.value,
        resolvedName: rule?.name ?? item.name.value,
        kind: 'consumable',
        confidence: rule ? 'high' : 'low',
        score: rule ? 100 : 0,
        ruleId: rule?.id,
        sourceUrl: rule?.sourceUrl,
        candidates: rule ? [{ ruleId: rule.id, name: rule.name, kind: 'consumable', score: 100, confidence: 'high' }] : [],
        manuallyResolved: false,
      },
    }, descriptionMeta),
    system,
    automation: {
      requestedLevel,
      activities,
      warnings,
      usesConfigured,
      recoveryConfigured,
      structuredAutomationConfigured,
    },
  })
}

export function buildEquipmentItem(item: NormalizedEquipment, identifier: string): FoundryItem {
  const rule = resolveWeaponOrEquipment(item.name.value)
  const descriptionMeta = buildRuleDescriptionMeta({
    itemName: rule?.name ?? item.name.value,
    itemKind: item.category === 'tool' ? 'tool' : rule?.category ?? item.category,
    ruleId: rule?.id,
    fallbackText: item.raw,
    sourceUrl: rule?.sourceUrl,
    sourceName: 'Bonfire Tales',
  })
  const warnings: string[] = [...descriptionMeta.warningMessages]
  const isHolySymbol = /Holy Symbol|S[íi]mbolo Sagrado/i.test(item.name.value)
  const itemType = isHolySymbol ? 'equipment' : item.category === 'tool' ? 'tool' : 'equipment'
  const system: Record<string, unknown> = {
    quantity: item.quantity.value,
    equipped: false,
  }
  let structuredAutomationConfigured = false
  let requestedLevel: ItemAutomationLevel = 'none'

  if (isHolySymbol) {
    system.type = { value: 'focus' }
    system.focus = { spellcasting: true, class: 'cleric' }
    structuredAutomationConfigured = true
    requestedLevel = 'full'
  } else if (rule) {
    system.type = { value: rule.category }
    structuredAutomationConfigured = true
    requestedLevel = 'partial'
  }

  return buildGenericItem({
    name: item.name.value,
    type: itemType,
    img: isHolySymbol ? 'icons/sundries/symbols/cross-star-gold.webp' : 'icons/svg/item-bag.svg',
    identifier,
    description: rule?.properties.join(', ') || item.raw,
    descriptionHtml: descriptionMeta.html,
    sourceBook: 'Bonfire Tales / Sheet',
    converterFlags: mergeDescriptionMeta({
      rawName: item.raw,
      resolvedKind: rule?.category ?? item.category,
      confidence: item.name.confidence,
      source: 'bonfire-xlsx',
      sourceUrl: rule?.sourceUrl,
      warnings,
      ruleResolution: {
        rawName: item.raw || item.name.value,
        resolvedName: rule?.name ?? item.name.value,
        kind: rule?.category ?? item.category,
        confidence: rule ? 'high' : 'low',
        score: rule ? 100 : 0,
        ruleId: rule?.id,
        sourceUrl: rule?.sourceUrl,
        candidates: rule ? [{ ruleId: rule.id, name: rule.name, kind: rule.category, score: 100, confidence: 'high' }] : [],
        manuallyResolved: false,
      },
    }, descriptionMeta),
    system,
    automation: {
      requestedLevel,
      warnings,
      structuredAutomationConfigured,
    },
  })
}

export function buildSpellItem(spell: NormalizedSpell): FoundryItem {
  const override = resolveSpellOverride(spell.name.value)
  const descriptionMeta = buildSpellDescriptionMeta({
    itemName: spell.name.value,
    fallbackText: spell.raw,
    overrideRule: override,
  })
  return buildGenericItem({
    name: spell.name.value,
    type: 'spell',
    img: 'icons/svg/book.svg',
    identifier: toFoundryIdentifier(spell.name.value, 'spell'),
    description: spell.raw,
    descriptionHtml: descriptionMeta.html,
    sourceBook: 'Bonfire Tales / Sheet',
    converterFlags: mergeDescriptionMeta({
      source: 'sheet',
      confidence: spell.name.confidence,
      raw: spell.raw,
      ruleResolution: {
        rawName: spell.name.value,
        resolvedName: spell.name.value,
        kind: 'spell',
        confidence: spell.name.confidence,
        score: spell.name.confidence === 'high' ? 100 : 50,
        ruleId: override?.id,
        sourceUrl: override?.sourceUrl,
        candidates: override ? [{ ruleId: override.id, name: override.spellName, kind: 'spellOverride', score: 100, confidence: 'high' }] : [],
        manuallyResolved: false,
      },
    }, descriptionMeta),
    system: {
      level: spell.level,
      preparation: { mode: spell.prepared === false ? 'atwill' : 'prepared', prepared: spell.prepared !== false },
    },
    automation: {
      requestedLevel: 'none',
    },
  })
}

export function getItemAutomationMeta(item: FoundryItem): ItemAutomationMeta | null {
  const flags = item.flags?.['roll20-to-foundry']
  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) return null
  const automation = (flags as Record<string, unknown>).automation
  if (!automation || typeof automation !== 'object' || Array.isArray(automation)) return null
  return automation as ItemAutomationMeta
}

function applyAutomation(item: FoundryItem, automation?: BaseItemBuildOptions['automation']): FoundryItem {
  const attempted = automation?.activities ?? []
  const activityMap: Record<string, FoundryActivityShape> = {}
  const activityWarnings = [...(automation?.warnings ?? [])]
  const activitiesCreated: ItemAutomationMeta['activitiesCreated'] = []
  let invalidActivitiesCount = 0

  attempted.forEach((activity) => {
    const validation = validateActivityShape(activity)
    if (!validation.valid) {
      invalidActivitiesCount += 1
      activityWarnings.push(`${activity.name}: ${validation.errors.join(' ')}`)
      return
    }
    activityMap[activity._id] = activity
    activitiesCreated.push({ id: activity._id, type: activity.type, name: activity.name })
  })

  item.system.activities = activityMap
  const structuredAutomationConfigured = Boolean(automation?.structuredAutomationConfigured)
  const usesConfigured = Boolean(automation?.usesConfigured || hasUsesConfigured(item.system.uses))
  const recoveryConfigured = Boolean(automation?.recoveryConfigured || hasRecoveryConfigured(item.system.uses))
  const hasAnyAutomation = structuredAutomationConfigured || usesConfigured || recoveryConfigured || activitiesCreated.length > 0
  const requestedLevel = automation?.requestedLevel ?? 'none'
  const level = resolveAutomationLevel(requestedLevel, hasAnyAutomation, invalidActivitiesCount)
  ;(item.flags['roll20-to-foundry'] as Record<string, unknown>).automation = {
    level,
    sourceCodeMarker: automationSourceCodeMarker,
    activitiesCreated,
    invalidActivitiesCount,
    warnings: Array.from(new Set(activityWarnings.filter(Boolean))),
    usesConfigured,
    recoveryConfigured,
    structuredAutomationConfigured,
  } satisfies ItemAutomationMeta
  return item
}

function resolveAutomationLevel(requestedLevel: ItemAutomationLevel, hasAnyAutomation: boolean, invalidActivitiesCount: number): ItemAutomationLevel {
  if (invalidActivitiesCount > 0) return 'partial'
  if (!hasAnyAutomation) return 'none'
  if (requestedLevel === 'none') return hasAnyAutomation ? 'partial' : 'none'
  return requestedLevel
}

function toRuleResolution(resolution: FeatureResolution, rawName: string, fallbackName: string): Record<string, unknown> {
  return {
    rawName,
    resolvedName: resolution.resolvedName || fallbackName,
    kind: resolution.kind,
    confidence: resolution.confidence,
    score: resolution.score ?? 0,
    ruleId: resolution.ruleId,
    sourceUrl: resolution.sourceUrl,
    candidates: resolution.candidates ?? [],
    manuallyResolved: resolution.manuallyResolved ?? false,
  }
}

function mapRecoveryEntries(recovery: string | undefined): Array<{ period: string; type: string }> {
  switch (recovery) {
    case 'sr':
      return [{ period: 'sr', type: 'recoverAll' }]
    case 'lr':
      return [{ period: 'lr', type: 'recoverAll' }]
    case 'sr-lr':
      return [
        { period: 'sr', type: 'recoverAll' },
        { period: 'lr', type: 'recoverAll' },
      ]
    case 'day':
      return [{ period: 'day', type: 'recoverAll' }]
    case 'charges':
      return [{ period: 'charges', type: 'recoverAll' }]
    default:
      return []
  }
}

function inferFeatureActivation(name: string): string {
  if (/Canalizar Divindade/i.test(name)) return 'action'
  if (/Conjura[cç][aã]o/i.test(name)) return 'special'
  return 'special'
}

function hasUsesConfigured(uses: unknown): boolean {
  if (!uses || typeof uses !== 'object' || Array.isArray(uses)) return false
  const max = (uses as Record<string, unknown>).max
  return max !== null && max !== undefined && max !== ''
}

function hasRecoveryConfigured(uses: unknown): boolean {
  if (!uses || typeof uses !== 'object' || Array.isArray(uses)) return false
  const recovery = (uses as Record<string, unknown>).recovery
  return Array.isArray(recovery) && recovery.length > 0
}

function parseDamageFormula(formula: string): { formula: string; number: number | null; denomination: number | null; bonus: string } {
  const trimmed = formula.trim()
  const match = trimmed.match(/^(\d+)d(\d+)([+-]\d+)?$/i)
  if (!match) {
    return {
      formula: trimmed,
      number: null,
      denomination: null,
      bonus: trimmed,
    }
  }
  return {
    formula: trimmed,
    number: Number(match[1]),
    denomination: Number(match[2]),
    bonus: match[3] ?? '',
  }
}
