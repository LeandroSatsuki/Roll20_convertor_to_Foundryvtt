import type { FoundryActor } from '../foundry/foundryTypes'
import type { FoundryExportAuditReport, FoundryValidationResult } from '../foundry/foundryValidationReport'
import { validateFoundryActorDeep } from '../foundry/validateFoundryActor'
import type { AbilityKey, NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import { getItemAutomationMeta } from '../foundry/items'

const blockingCodes = new Set([
  'CHARACTER_NAME_IS_URL',
  'FOUNDRY_ACTOR_SYSTEM_MISSING',
  'FOUNDRY_ACTOR_UNDEFINED',
  'FOUNDRY_ITEM_IDENTIFIER_INVALID',
  'FOUNDRY_ITEM_IDENTIFIER_DUPLICATE',
  'FOUNDRY_ITEM_NAME_MISSING',
  'FOUNDRY_ITEM_TYPE_MISSING',
  'FOUNDRY_ITEM_TYPE_INVALID',
  'FOUNDRY_ITEM_UNDEFINED',
  'FOUNDRY_SPELL_SLOT_VALUE_INVALID',
  'FOUNDRY_CLERIC5_SLOTS_INVALID',
  'SHEET_CHARACTER_NAME_MISSING',
  'SHEET_ABILITY_NOT_FOUND',
  'SHEET_ABILITY_SCORE_INVALID',
  'SHEET_ABILITY_SCORE_MISSING',
  'SHEET_AC_MISSING',
  'BACKGROUND_INVALID_TEMPLATE_VALUE',
  'PASSIVE_PERCEPTION_INVALID',
  'CURRENCY_GP_INVALID',
  'SHEET_SPEED_LOOKS_LIKE_HP_DUPLICATE',
  'SHEET_HP_MAX_MISSING',
  'TEMPLATE_FIELD_MISSING',
  'ABILITY_SCORE_MISSING_MODIFIER_ONLY',
  'BONFIRE_LOG_V2_TEMPLATE_PARSER_NOT_CALLED',
  'SHEET_CHARACTER_REGION_NOT_FOUND',
  'SHEET_PARSE_BLOCKED_LOW_CONFIDENCE',
  'SHEET_TEMPLATE_LOW_CONFIDENCE',
])

export function buildExportAuditReport(actor: FoundryActor | null, normalized?: NormalizedCharacter | null): FoundryExportAuditReport {
  const structuralValidations = actor ? validateFoundryActorDeep(actor) : [{ code: 'FOUNDRY_ACTOR_MISSING', severity: 'error' as const, message: 'Actor nao foi gerado.' }]
  const ruleValidations = actor ? collectRuleResolutionValidations(actor) : []
  const descriptionValidations = actor ? collectDescriptionValidations(actor) : []
  const parserValidations = (normalized?.warnings ?? []).filter((warning) => warning.severity === 'error').map((warning) => ({
    code: warning.code,
    severity: 'error' as const,
    message: warning.message,
    path: warning.fieldPath,
  }))
  const validations = [...structuralValidations, ...ruleValidations, ...descriptionValidations, ...parserValidations]
  const errors = validations.filter((validation) => validation.severity === 'error')
  const warnings = validations.filter((validation) => validation.severity === 'warning')
  const blockingReasons = validations.filter((validation) => validation.severity === 'error' && blockingCodes.has(validation.code)).map(formatBlockingReason)
  const unresolvedFeatures = (normalized?.features ?? [])
    .filter((feature) => feature.name.confidence !== 'high' || feature.sourceType === 'other')
    .map((feature) => ({
      rawName: feature.raw || feature.name.value,
      section: feature.sourceType,
      confidence: feature.name.confidence,
      suggestedKind: feature.sourceType,
      message: feature.name.warnings?.join(' ') || 'Caracteristica precisa de revisao manual.',
    }))

  const items = actor?.items ?? []
  const ruleStats = summarizeRuleResolution(items)
  const descriptionStats = summarizeDescriptions(items)
  const automationStats = summarizeItemAutomation(items)
  const pipeline = normalized?.pipeline
  return {
    actorName: actor?.name ?? normalized?.identity.name.value ?? '',
    generatedAt: new Date().toISOString(),
    parserBuildId: pipeline?.parserBuildId,
    parseRunId: pipeline?.parseRunId,
    normalizedCharacterId: pipeline?.normalizedCharacterId,
    actorBuildId: pipeline?.actorBuildId ?? getActorConverterFlag(actor, 'actorBuildId'),
    auditBuildId: pipeline?.auditBuildId ?? getActorConverterFlag(actor, 'auditBuildId'),
    sourceType: normalized?.source.type ?? 'unknown',
    sourceFileName: normalized?.source.fileName,
    summary: {
      itemCount: items.length,
      featureCount: items.filter((item) => item.type === 'feat').length,
      weaponCount: items.filter((item) => item.type === 'weapon').length,
      equipmentCount: items.filter((item) => ['equipment', 'consumable', 'loot', 'tool'].includes(item.type)).length,
      spellCount: items.filter((item) => item.type === 'spell').length,
      warningCount: warnings.length + unresolvedFeatures.length,
      errorCount: errors.length,
      invalidIdentifierCount: validations.filter((validation) => validation.code === 'FOUNDRY_ITEM_IDENTIFIER_INVALID' || validation.code === 'FOUNDRY_ITEM_IDENTIFIER_DUPLICATE').length,
      unresolvedFeatureCount: unresolvedFeatures.length,
      resolvedHighCount: ruleStats.high,
      resolvedMediumCount: ruleStats.medium,
      resolvedLowCount: ruleStats.low,
      unresolvedCount: ruleStats.unknown,
      manuallyResolvedCount: ruleStats.manual,
      genericItemCount: ruleStats.generic,
      describedItemCount: descriptionStats.complete,
      missingDescriptionCount: descriptionStats.missing,
      descriptionFallbackCount: descriptionStats.fallback,
      sourceUrlCount: descriptionStats.withSourceUrl,
      automatedFullCount: automationStats.full,
      automatedPartialCount: automationStats.partial,
      automatedNoneCount: automationStats.none,
      activitiesCount: automationStats.activitiesCount,
      invalidActivitiesCount: automationStats.invalidActivitiesCount,
      usesConfiguredCount: automationStats.usesConfiguredCount,
      recoveryConfiguredCount: automationStats.recoveryConfiguredCount,
    },
    validations,
    auditDebug: {
      parserBuildId: pipeline?.parserBuildId ?? getActorConverterFlag(actor, 'parserBuildId') ?? undefined,
      parseRunId: pipeline?.parseRunId ?? getActorConverterFlag(actor, 'parseRunId') ?? undefined,
      normalizedCharacterId: pipeline?.normalizedCharacterId ?? getActorConverterFlag(actor, 'normalizedCharacterId') ?? undefined,
      actorBuildId: pipeline?.actorBuildId ?? getActorConverterFlag(actor, 'actorBuildId'),
      auditBuildId: pipeline?.auditBuildId ?? getActorConverterFlag(actor, 'auditBuildId'),
      normalizedDebugSnapshot: {
        abilities: collectNormalizedAbilities(normalized),
      },
      actorInputSnapshot: {
        abilities: getActorInputAbilitySnapshot(actor),
      },
      abilitiesBeforeActorBuild: collectNormalizedAbilities(normalized),
      abilitiesInsideActor: collectActorAbilities(actor),
      itemNames: items.map((item) => item.name),
      itemDescriptions: descriptionStats.items,
      automationSummary: {
        automatedFullCount: automationStats.full,
        automatedPartialCount: automationStats.partial,
        automatedNoneCount: automationStats.none,
        activitiesCount: automationStats.activitiesCount,
        invalidActivitiesCount: automationStats.invalidActivitiesCount,
        usesConfiguredCount: automationStats.usesConfiguredCount,
        recoveryConfiguredCount: automationStats.recoveryConfiguredCount,
      },
    },
    unresolvedFeatures,
    importReadiness: {
      canExport: blockingReasons.length === 0,
      canImportIntoFoundry: blockingReasons.length === 0,
      blockingReasons,
    },
  }
}

const abilityKeys: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function summarizeItemAutomation(items: FoundryActor['items']): {
  full: number
  partial: number
  none: number
  activitiesCount: number
  invalidActivitiesCount: number
  usesConfiguredCount: number
  recoveryConfiguredCount: number
} {
  return items.reduce(
    (summary, item) => {
      const automation = getItemAutomationMeta(item)
      const level = automation?.level ?? 'none'
      if (level === 'full') summary.full += 1
      else if (level === 'partial') summary.partial += 1
      else summary.none += 1
      summary.activitiesCount += automation?.activitiesCreated.length ?? 0
      summary.invalidActivitiesCount += automation?.invalidActivitiesCount ?? 0
      if (automation?.usesConfigured) summary.usesConfiguredCount += 1
      if (automation?.recoveryConfigured) summary.recoveryConfiguredCount += 1
      return summary
    },
    { full: 0, partial: 0, none: 0, activitiesCount: 0, invalidActivitiesCount: 0, usesConfiguredCount: 0, recoveryConfiguredCount: 0 },
  )
}

function formatBlockingReason(result: FoundryValidationResult): string {
  return `${result.code}${result.path ? ` at ${result.path}` : ''}: ${result.message}`
}

function collectRuleResolutionValidations(actor: FoundryActor): FoundryValidationResult[] {
  return actor.items.flatMap((item, index) => {
    const resolution = getRuleResolution(item)
    if (!resolution) return []
    const validations: FoundryValidationResult[] = []
    const confidence = String(resolution.confidence ?? '')
    const kind = String(resolution.kind ?? '')
    if (confidence === 'low') {
      validations.push({
        code: 'RULE_RESOLUTION_LOW_CONFIDENCE',
        severity: 'warning',
        message: `Resolucao de baixa confianca para ${item.name}.`,
        path: `items.${index}.flags.roll20-to-foundry.ruleResolution`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    if (confidence === 'unknown' || kind === 'unknown') {
      validations.push({
        code: 'RULE_NOT_FOUND',
        severity: 'warning',
        message: `${item.name} foi exportado como item generico para revisao.`,
        path: `items.${index}`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    const candidates = Array.isArray(resolution.candidates) ? resolution.candidates : []
    const score = typeof resolution.score === 'number' ? resolution.score : 0
    if (candidates.length > 1 && Math.abs(score - Number((candidates[1] as Record<string, unknown>)?.score ?? -999)) <= 10) {
      validations.push({
        code: 'RULE_RESOLUTION_AMBIGUOUS',
        severity: 'warning',
        message: `${item.name} tem candidatos de regra proximos.`,
        path: `items.${index}`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    return validations
  })
}

function summarizeRuleResolution(items: FoundryActor['items']): { high: number; medium: number; low: number; unknown: number; manual: number; generic: number } {
  return items.reduce(
    (summary, item) => {
      const resolution = getRuleResolution(item)
      if (!resolution) return summary
      const confidence = String(resolution.confidence ?? '')
      if (confidence === 'high') summary.high += 1
      else if (confidence === 'medium') summary.medium += 1
      else if (confidence === 'low') summary.low += 1
      else summary.unknown += 1
      if (resolution.manuallyResolved) summary.manual += 1
      if (String(resolution.kind ?? '') === 'unknown') summary.generic += 1
      return summary
    },
    { high: 0, medium: 0, low: 0, unknown: 0, manual: 0, generic: 0 },
  )
}

function collectDescriptionValidations(actor: FoundryActor): FoundryValidationResult[] {
  return actor.items.flatMap((item, index) => {
    const meta = getDescriptionMeta(item)
    if (!meta) return []
    const validations: FoundryValidationResult[] = []
    if (meta.status === 'missing') {
      validations.push({
        code: 'RULE_DESCRIPTION_MISSING',
        severity: 'warning',
        message: `${item.name} foi exportado sem descricao de regra completa.`,
        path: `items.${index}.system.description.value`,
        itemName: item.name,
        itemId: item._id,
      })
    } else if (meta.status === 'fallback') {
      validations.push({
        code: 'RULE_DESCRIPTION_FALLBACK_USED',
        severity: 'warning',
        message: `${item.name} usa descricao fallback da Rule Store.`,
        path: `items.${index}.system.description.value`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    if (meta.overrideApplied) {
      validations.push({
        code: 'SPELL_OVERRIDE_DESCRIPTION_APPLIED',
        severity: 'info',
        message: `${item.name} recebeu bloco de ajuste Bonfire na descricao.`,
        path: `items.${index}.system.description.value`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    return validations
  })
}

function summarizeDescriptions(items: FoundryActor['items']): {
  complete: number
  fallback: number
  missing: number
  withSourceUrl: number
  items: {
    complete: Array<{ name: string; sourceUrl?: string | null }>
    fallback: Array<{ name: string; sourceUrl?: string | null }>
    missing: Array<{ name: string; sourceUrl?: string | null }>
  }
} {
  return items.reduce(
    (summary, item) => {
      const meta = getDescriptionMeta(item)
      const bucket = meta?.status === 'complete' ? 'complete' : meta?.status === 'fallback' ? 'fallback' : 'missing'
      summary[bucket] += 1
      const sourceUrl = meta?.sourceUrl ?? null
      if (sourceUrl) summary.withSourceUrl += 1
      summary.items[bucket].push({ name: item.name, sourceUrl })
      return summary
    },
    {
      complete: 0,
      fallback: 0,
      missing: 0,
      withSourceUrl: 0,
      items: {
        complete: [] as Array<{ name: string; sourceUrl?: string | null }>,
        fallback: [] as Array<{ name: string; sourceUrl?: string | null }>,
        missing: [] as Array<{ name: string; sourceUrl?: string | null }>,
      },
    },
  )
}

function getRuleResolution(item: FoundryActor['items'][number]): Record<string, unknown> | null {
  const flags = item.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const resolution = converterFlags?.ruleResolution
  return resolution && typeof resolution === 'object' ? (resolution as Record<string, unknown>) : null
}

function getDescriptionMeta(item: FoundryActor['items'][number]): { status: string; sourceUrl?: string | null; overrideApplied?: boolean } | null {
  const flags = item.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const meta = converterFlags?.descriptionMeta
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const record = meta as Record<string, unknown>
  return {
    status: typeof record.status === 'string' ? record.status : 'missing',
    sourceUrl: typeof record.sourceUrl === 'string' ? record.sourceUrl : null,
    overrideApplied: Boolean(record.overrideApplied),
  }
}

function collectNormalizedAbilities(normalized?: NormalizedCharacter | null): Record<string, number | null> {
  if (!normalized) return Object.fromEntries(abilityKeys.map((key) => [key, null]))
  return Object.fromEntries(abilityKeys.map((key) => [key, normalized.abilities[key].score.value ?? null]))
}

function collectActorAbilities(actor: FoundryActor | null): Record<string, number | null> {
  const abilities = (actor?.system as Record<string, unknown> | undefined)?.abilities as Record<string, unknown> | undefined
  return Object.fromEntries(
    abilityKeys.map((key) => {
      const value = abilities?.[key]
      const numeric = value && typeof value === 'object' ? (value as Record<string, unknown>).value : null
      return [key, typeof numeric === 'number' ? numeric : null]
    }),
  )
}

function getActorConverterFlag(actor: FoundryActor | null, key: string): string | null {
  const flags = actor?.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const value = converterFlags?.[key]
  return typeof value === 'string' ? value : null
}

function getActorInputAbilitySnapshot(actor: FoundryActor | null): Record<string, number | null> {
  const flags = actor?.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const snapshot = converterFlags?.actorInputSnapshot
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return Object.fromEntries(abilityKeys.map((key) => [key, null]))
  const abilities = (snapshot as Record<string, unknown>).abilities
  if (!abilities || typeof abilities !== 'object' || Array.isArray(abilities)) return Object.fromEntries(abilityKeys.map((key) => [key, null]))
  return Object.fromEntries(
    abilityKeys.map((key) => {
      const value = (abilities as Record<string, unknown>)[key]
      return [key, typeof value === 'number' ? value : null]
    }),
  )
}
