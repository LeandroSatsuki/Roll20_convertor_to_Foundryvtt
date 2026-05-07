import type { FoundryActor } from '../foundry/foundryTypes'
import type { FoundryExportAuditReport, FoundryValidationResult } from '../foundry/foundryValidationReport'
import { validateFoundryActorDeep } from '../foundry/validateFoundryActor'
import type { AbilityKey, NormalizedCharacter, SkillKey } from '../normalize/normalizedCharacterTypes'
import { getItemAutomationMeta } from '../foundry/items'
import type { FoundryHydrationReport, FoundryLibraryReport } from '../foundry-library/foundryReferenceLibraryTypes'

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
  const skillValidations = actor && normalized ? collectSkillTotalValidations(actor, normalized) : []
  const hydrationValidations = actor ? collectHydrationValidations(actor) : []
  const sheetFeatureValidations = actor ? collectSheetFeatureValidations(actor) : []
  const progressionValidations = actor ? collectClassProgressionValidations(actor) : []
  const spellcastingValidations = actor ? collectSpellcastingValidations(actor) : []
  const initiativeValidations = actor ? collectInitiativeValidations(actor) : []
  const identifierDedupValidations = actor ? collectIdentifierDedupValidations(actor) : []
  const classRuleValidations = actor ? collectClassRuleValidations(actor) : []
  const parserValidations = (normalized?.warnings ?? []).filter((warning) => warning.severity === 'error').map((warning) => ({
    code: warning.code,
    severity: 'error' as const,
    message: warning.message,
    path: warning.fieldPath,
  }))
  const validations = [
    ...structuralValidations,
    ...ruleValidations,
    ...descriptionValidations,
    ...skillValidations,
    ...hydrationValidations,
    ...sheetFeatureValidations,
    ...progressionValidations,
    ...spellcastingValidations,
    ...initiativeValidations,
    ...classRuleValidations,
    ...identifierDedupValidations,
    ...parserValidations,
  ]
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
  const libraryReport = getLibraryReport(actor)
  const hydrationReport = getHydrationReport(actor)
  const progressionSuggestions = actor ? getClassProgressionSuggestions(actor) : []
  const sheetFeatureStats = actor ? summarizeSheetFeatureItems(items) : emptySheetFeatureStats()
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
      duplicateIdentifierCount: validations.filter((validation) => validation.code === 'FOUNDRY_ITEM_IDENTIFIER_DUPLICATE').length,
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
      libraryFilesLoadedCount: libraryReport?.filesLoadedCount ?? 0,
      libraryItemsLoadedCount: libraryReport?.itemsLoadedCount ?? 0,
      librarySpellsLoadedCount: libraryReport?.spellsLoadedCount ?? 0,
      libraryFeatsLoadedCount: libraryReport?.featsLoadedCount ?? 0,
      libraryEquipmentLoadedCount: libraryReport?.equipmentLoadedCount ?? 0,
      libraryItemsWithActivitiesCount: libraryReport?.itemsWithActivitiesCount ?? 0,
      libraryItemsWithEffectsCount: libraryReport?.itemsWithEffectsCount ?? 0,
      libraryItemsWithMidiCount: libraryReport?.itemsWithMidiCount ?? 0,
      libraryItemsWithPlutoniumCount: libraryReport?.itemsWithPlutoniumCount ?? 0,
      hydratedItemsCount: hydrationReport?.hydratedItemsCount ?? 0,
      hydrationFallbackCount: hydrationReport?.hydrationFallbackCount ?? 0,
      hydratedSpellsCount: hydrationReport?.hydratedSpellsCount ?? 0,
      hydratedClassFeaturesCount: hydrationReport?.hydratedClassFeaturesCount ?? 0,
      hydratedEquipmentCount: hydrationReport?.hydratedEquipmentCount ?? 0,
      hydratedItemsWithActivitiesCount: hydrationReport?.hydratedItemsWithActivitiesCount ?? 0,
      hydratedItemsWithEffectsCount: hydrationReport?.hydratedItemsWithEffectsCount ?? 0,
      hydratedItemsWithMidiCount: hydrationReport?.hydratedItemsWithMidiCount ?? 0,
      hydratedItemsWithPlutoniumCount: hydrationReport?.hydratedItemsWithPlutoniumCount ?? 0,
      hydrationHighCount: hydrationReport?.hydrationHighCount ?? 0,
      hydrationMediumCount: hydrationReport?.hydrationMediumCount ?? 0,
      hydrationLowCount: hydrationReport?.hydrationLowCount ?? 0,
      hydrationCustomFallbackCount: hydrationReport?.hydrationCustomFallbackCount ?? 0,
      bonfireFallbackFeatureCount: hydrationReport?.bonfireFallbackFeatureCount ?? 0,
      hydrationLibraryMissCount: hydrationReport?.hydrationLibraryMissCount ?? 0,
      hydrationUnsafeMatchRejectedCount: hydrationReport?.hydrationUnsafeMatchRejectedCount ?? 0,
      hydrationNoCandidateCount: hydrationReport?.hydrationNoCandidateCount ?? 0,
      sanitizedActorReferenceCount: hydrationReport?.sanitizedActorReferenceCount ?? 0,
      sheetFeatureRangeCount: sheetFeatureStats.rangeCount,
      sheetFeaturesExtractedCount: sheetFeatureStats.extractedCount,
      sheetFeaturesDedupedCount: sheetFeatureStats.dedupedCount,
      hydratedSheetFeaturesCount: sheetFeatureStats.hydratedCount,
      unresolvedSheetFeatureCount: sheetFeatureStats.unresolvedCount,
      classProgressionSuggestedCount: progressionSuggestions.filter((entry) => entry.action === 'suggest').length,
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
      libraryReport,
      hydrationReport,
      classProgressionSuggestions: progressionSuggestions,
      sheetFeatureDebug: {
        rangeCount: sheetFeatureStats.rangeCount,
        extractedCount: sheetFeatureStats.extractedCount,
        dedupedCount: sheetFeatureStats.dedupedCount,
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
const skillKeys: SkillKey[] = ['acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'itm', 'inv', 'med', 'nat', 'prc', 'prf', 'per', 'rel', 'slt', 'ste', 'sur']

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
      summary.activitiesCount += countActivities(item.system?.activities)
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

function collectSkillTotalValidations(actor: FoundryActor, normalized: NormalizedCharacter): FoundryValidationResult[] {
  const usesBonfireV21Skills = skillKeys.some((key) => normalized.skills[key]?.total.source === 'bonfire-v2.1')
  if (!usesBonfireV21Skills) return []

  const actorSystem = actor.system as Record<string, unknown>
  const actorSkills = (actorSystem.skills as Record<string, unknown> | undefined) ?? {}
  const actorAbilities = (actorSystem.abilities as Record<string, unknown> | undefined) ?? {}
  const proficiencyBonus = normalized.proficiencyBonus.value ?? 0

  return skillKeys.flatMap((key) => {
    const normalizedSkill = normalized.skills[key]
    const sheetTotal = normalizedSkill?.total.value
    if (typeof sheetTotal !== 'number') return []

    const actorSkill = actorSkills[key]
    if (!actorSkill || typeof actorSkill !== 'object' || Array.isArray(actorSkill)) return []
    const abilityKey = String((actorSkill as Record<string, unknown>).ability ?? normalizedSkill.ability) as AbilityKey
    const actorAbility = actorAbilities[abilityKey]
    const abilityScore = actorAbility && typeof actorAbility === 'object' ? (actorAbility as Record<string, unknown>).value : null
    const abilityMod = typeof abilityScore === 'number' ? Math.floor((abilityScore - 10) / 2) : 0
    const proficiencyLevel = Number((actorSkill as Record<string, unknown>).value ?? normalizedSkill.proficiencyLevel.value ?? 0)
    const bonuses = (actorSkill as Record<string, unknown>).bonuses
    const checkBonusRaw = bonuses && typeof bonuses === 'object' ? (bonuses as Record<string, unknown>).check : ''
    const residualBonus = parseSkillBonus(checkBonusRaw)
    const actorTotal = abilityMod + proficiencyBonus * proficiencyLevel + residualBonus

    if (actorTotal === sheetTotal) return []

    return [
      {
        code: 'SKILL_TOTAL_MISMATCH',
        severity: 'warning' as const,
        message: `${key}: planilha=${sheetTotal}, foundry=${actorTotal}, marcador=${normalizedSkill.proficiencyLevel.value}, residual=${normalizedSkill.bonus.value}.`,
        path: `system.skills.${key}`,
      },
    ]
  })
}

function collectHydrationValidations(actor: FoundryActor): FoundryValidationResult[] {
  return actor.items.flatMap((item, index) => {
    const hydration = getHydrationMeta(item)
    if (!hydration) return []
    const validations: FoundryValidationResult[] = []
    if (hydration.hydrated === false) {
      if (hydration.fallbackCategory === 'customFallback') {
        validations.push({
          code: 'FOUNDRY_LIBRARY_CUSTOM_FALLBACK',
          severity: 'info',
          message: `${item.name} permaneceu no fallback custom Bonfire, o que e esperado para essa regra.`,
          path: `items.${index}.flags.roll20-to-foundry.hydration`,
          itemName: item.name,
          itemId: item._id,
        })
      } else if (hydration.fallbackCategory === 'bonfireFallback') {
        validations.push({
          code: 'FOUNDRY_LIBRARY_BONFIRE_FALLBACK',
          severity: 'info',
          message: `${item.name} usou fallback Bonfire local quando a biblioteca Foundry nao tinha um clone seguro.`,
          path: `items.${index}.flags.roll20-to-foundry.hydration`,
          itemName: item.name,
          itemId: item._id,
        })
      } else {
        validations.push({
          code: 'FOUNDRY_LIBRARY_ITEM_NOT_FOUND',
          severity: 'warning',
          message: `${item.name} nao foi encontrado na biblioteca Foundry local; fallback atual preservado.`,
          path: `items.${index}.flags.roll20-to-foundry.hydration`,
          itemName: item.name,
          itemId: item._id,
        })
      }
    }
    const confidence = String(hydration.matchConfidence ?? '')
    if (confidence === 'low') {
      validations.push({
        code: 'FOUNDRY_LIBRARY_LOW_CONFIDENCE',
        severity: 'warning',
        message: `${item.name} teve match de baixa confianca na biblioteca Foundry.`,
        path: `items.${index}.flags.roll20-to-foundry.hydration`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    if (Boolean(hydration.ambiguous)) {
      validations.push({
        code: 'FOUNDRY_LIBRARY_AMBIGUOUS_MATCH',
        severity: 'warning',
        message: `${item.name} tem mais de um candidato proximo na biblioteca Foundry.`,
        path: `items.${index}.flags.roll20-to-foundry.hydration`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    if (Number(hydration.sanitizedActorReferences ?? 0) > 0) {
      validations.push({
        code: 'FOUNDRY_LIBRARY_CLONED_WITH_CLEANED_ORIGIN',
        severity: 'warning',
        message: `${item.name} foi clonado com referencias antigas de Actor limpas.`,
        path: `items.${index}`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    ;[
      ['preservedPlutoniumFlags', 'FOUNDRY_LIBRARY_PRESERVED_PLUTONIUM_FLAGS'],
      ['preservedMidiProperties', 'FOUNDRY_LIBRARY_PRESERVED_MIDI_PROPERTIES'],
      ['preservedEffects', 'FOUNDRY_LIBRARY_PRESERVED_EFFECTS'],
      ['preservedActivities', 'FOUNDRY_LIBRARY_PRESERVED_ACTIVITIES'],
    ].forEach(([flag, code]) => {
      if (!hydration[flag]) return
      validations.push({
        code,
        severity: 'info',
        message: `${item.name} preservou ${flag} da biblioteca Foundry.`,
        path: `items.${index}.flags.roll20-to-foundry.hydration`,
        itemName: item.name,
        itemId: item._id,
      })
    })
    if (Array.isArray(hydration.warnings) && hydration.warnings.includes('ACTIVITY_INVALID_SHAPE')) {
      validations.push({
        code: 'ACTIVITY_INVALID_SHAPE',
        severity: 'warning',
        message: `${item.name} teve activity invalida removida durante a hidratacao.`,
        path: `items.${index}.system.activities`,
        itemName: item.name,
        itemId: item._id,
      })
    }
    return validations
  })
}

function collectSheetFeatureValidations(actor: FoundryActor): FoundryValidationResult[] {
  return actor.items.flatMap((item, index) => {
    const featureSource = getFeatureSourceMeta(item)
    if (!featureSource?.fromSheetRange) return []
    const hydration = getHydrationMeta(item)
    const validations: FoundryValidationResult[] = []

    if (hydration?.hydrated === true) {
      validations.push({
        code: 'SHEET_FEATURE_HYDRATED_FROM_LIBRARY',
        severity: 'info',
        message: `${item.name} foi hidratada da biblioteca Foundry a partir dos ranges de características da planilha.`,
        path: `items.${index}`,
        itemName: item.name,
        itemId: item._id,
      })
    } else if (featureSource.fallbackBonfire === true || hydration?.fallbackCategory === 'bonfireFallback') {
      validations.push({
        code: 'SHEET_FEATURE_BONFIRE_FALLBACK',
        severity: 'info',
        message: `${item.name} usou fallback Bonfire a partir dos ranges de características da planilha.`,
        path: `items.${index}`,
        itemName: item.name,
        itemId: item._id,
      })
    } else if (featureSource.unresolved === true) {
      validations.push({
        code: 'SHEET_FEATURE_UNRESOLVED',
        severity: 'warning',
        message: `${item.name} veio dos ranges de características da planilha, mas não foi encontrada na biblioteca Foundry nem no Rule Store Bonfire.`,
        path: `items.${index}`,
        itemName: item.name,
        itemId: item._id,
      })
    }

    return validations
  })
}

function collectClassProgressionValidations(actor: FoundryActor): FoundryValidationResult[] {
  return getClassProgressionSuggestions(actor).flatMap((suggestion, index) => {
    if (suggestion.action === 'suggest') {
      return [
        {
          code: 'CLASS_PROGRESSION_FEATURE_SUGGESTED',
          severity: 'info' as const,
          message: `${suggestion.expectedFeature} é esperada pela progressão da classe no nível ${suggestion.level}, mas não apareceu na ficha importada.`,
          path: `flags.roll20-to-foundry.classProgressionSuggestions.${index}`,
        },
      ]
    }
    if (suggestion.action === 'ignore-subclass') {
      return [
        {
          code: 'SUBCLASS_FEATURE_SKIPPED_CUSTOM_SUBCLASS',
          severity: 'info' as const,
          message: `${suggestion.expectedFeature} foi ignorada porque a subclasse do personagem é tratada como custom Bonfire.`,
          path: `flags.roll20-to-foundry.classProgressionSuggestions.${index}`,
        },
      ]
    }
    return []
  })
}

function collectIdentifierDedupValidations(actor: FoundryActor): FoundryValidationResult[] {
  return actor.items.flatMap((item, index) => {
    const flags = item.flags as Record<string, unknown> | undefined
    const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
    const dedup = converterFlags?.identifierDedup
    if (!dedup || typeof dedup !== 'object' || Array.isArray(dedup)) return []
    const record = dedup as Record<string, unknown>
    return [
      {
        code: 'FOUNDRY_ITEM_IDENTIFIER_DEDUPED',
        severity: 'warning' as const,
        message: `${item.name} teve identifier ajustado de ${String(record.from ?? 'vazio')} para ${String(record.to ?? item.system.identifier)} por ${String(record.reason ?? 'colisao')}.`,
        path: `items.${index}.system.identifier`,
        itemName: item.name,
        itemId: item._id,
      },
    ]
  })
}

function collectSpellcastingValidations(actor: FoundryActor): FoundryValidationResult[] {
  const progression = getConverterObject(actor, 'spellcastingProgression')
  const warnings = Array.isArray(progression?.warnings) ? progression.warnings.map(String) : []
  const results: FoundryValidationResult[] = warnings.map((code) => ({
    code,
    severity: code === 'SPELLCASTING_RULE_MISSING' ? ('warning' as const) : ('info' as const),
    message: code === 'SPELLCASTING_RULE_MISSING' ? 'Regra de conjuracao nao encontrada para a classe do personagem.' : 'Slots de magia calculados a partir da classe e nivel da ficha.',
    path: 'flags.roll20-to-foundry.spellcastingProgression',
  }))
  if (getActorConverterFlag(actor, 'spellcastingAbilityWarning') === 'SPELLCASTING_ABILITY_UNKNOWN') {
    results.push({
      code: 'SPELLCASTING_ABILITY_UNKNOWN',
      severity: 'warning',
      message: 'Habilidade de conjuracao nao determinada para a classe principal.',
      path: 'system.attributes.spellcasting',
    })
  }
  return results
}

function collectInitiativeValidations(actor: FoundryActor): FoundryValidationResult[] {
  if (getActorConverterFlag(actor, 'initiativeWarning') !== 'INITIATIVE_DEFAULTED_TO_DEX') return []
  return [
    {
      code: 'INITIATIVE_DEFAULTED_TO_DEX',
      severity: 'info',
      message: 'Iniciativa nao veio de celula do template; o Actor usara Destreza sem bonus residual.',
      path: 'system.attributes.init',
    },
  ]
}

function collectClassRuleValidations(actor: FoundryActor): FoundryValidationResult[] {
  return actor.items.flatMap((item, index) => {
    if (item.type !== 'class') return []
    const flags = item.flags as Record<string, unknown> | undefined
    const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
    const warnings = Array.isArray(converterFlags?.warnings) ? converterFlags.warnings.map(String) : []
    return warnings
      .filter((code) => code === 'CLASS_RULE_UNKNOWN' || code === 'CLASS_HIT_DIE_UNKNOWN' || code === 'CLASS_RULE_FALLBACK_USED')
      .map((code) => ({
        code,
        severity: 'warning' as const,
        message:
          code === 'CLASS_RULE_UNKNOWN'
            ? `${item.name} nao foi encontrada nas regras de classe conhecidas; fallback seguro aplicado.`
            : code === 'CLASS_HIT_DIE_UNKNOWN'
              ? `${item.name} usou hit die seguro d8 porque a classe nao foi reconhecida.`
              : `${item.name} usou dados basicos de classe por fallback local.`,
        path: `items.${index}`,
        itemName: item.name,
        itemId: item._id,
      }))
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
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    const description = (item.system as Record<string, unknown> | undefined)?.description
    const value = description && typeof description === 'object' && !Array.isArray(description) ? (description as Record<string, unknown>).value : ''
    const sourceUrl = getHydrationSourceUrl(item)
    return { status: typeof value === 'string' && value.trim() ? 'complete' : 'missing', sourceUrl, overrideApplied: false }
  }
  const record = meta as Record<string, unknown>
  return {
    status: typeof record.status === 'string' ? record.status : 'missing',
    sourceUrl: typeof record.sourceUrl === 'string' ? record.sourceUrl : null,
    overrideApplied: Boolean(record.overrideApplied),
  }
}

function getHydrationSourceUrl(item: FoundryActor['items'][number]): string | null {
  const flags = item.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const hydration = converterFlags?.hydration
  if (!hydration || typeof hydration !== 'object' || Array.isArray(hydration)) return null
  return null
}

function getHydrationMeta(item: FoundryActor['items'][number]): Record<string, unknown> | null {
  const flags = item.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const meta = converterFlags?.hydration
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  return meta as Record<string, unknown>
}

function getFeatureSourceMeta(item: FoundryActor['items'][number]): Record<string, unknown> | null {
  const flags = item.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const meta = converterFlags?.featureSource
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  return meta as Record<string, unknown>
}

function summarizeSheetFeatureItems(items: FoundryActor['items']) {
  const sheetFeatureItems = items.filter((item) => Boolean(getFeatureSourceMeta(item)?.fromSheetRange))
  const uniqueRanges = new Set(sheetFeatureItems.map((item) => String(getFeatureSourceMeta(item)?.sourceRange ?? '')).filter(Boolean))
  return {
    rangeCount: uniqueRanges.size,
    extractedCount: sheetFeatureItems.length,
    dedupedCount: sheetFeatureItems.length,
    hydratedCount: sheetFeatureItems.filter((item) => getHydrationMeta(item)?.hydrated === true).length,
    unresolvedCount: sheetFeatureItems.filter((item) => getFeatureSourceMeta(item)?.unresolved === true).length,
  }
}

function emptySheetFeatureStats() {
  return {
    rangeCount: 0,
    extractedCount: 0,
    dedupedCount: 0,
    hydratedCount: 0,
    unresolvedCount: 0,
  }
}

function getClassProgressionSuggestions(actor: FoundryActor): Array<{ expectedFeature: string; level: number; foundInSheet: boolean; foundInLibrary: boolean; action: string }> {
  const flags = actor.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const suggestions = converterFlags?.classProgressionSuggestions
  return Array.isArray(suggestions) ? (suggestions as Array<{ expectedFeature: string; level: number; foundInSheet: boolean; foundInLibrary: boolean; action: string }>) : []
}

function getLibraryReport(actor: FoundryActor | null): FoundryLibraryReport | null {
  const flags = actor?.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const report = converterFlags?.foundryReferenceLibraryReport
  return report && typeof report === 'object' && !Array.isArray(report) ? (report as FoundryLibraryReport) : null
}

function getHydrationReport(actor: FoundryActor | null): FoundryHydrationReport | null {
  const flags = actor?.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const report = converterFlags?.hydrationReport
  return report && typeof report === 'object' && !Array.isArray(report) ? (report as FoundryHydrationReport) : null
}

function getConverterObject(actor: FoundryActor | null, key: string): Record<string, unknown> | null {
  const flags = actor?.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const value = converterFlags?.[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function parseSkillBonus(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string' || !value.trim()) return 0
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function countActivities(activities: unknown): number {
  if (!activities) return 0
  if (Array.isArray(activities)) return activities.length
  return typeof activities === 'object' ? Object.keys(activities as Record<string, unknown>).length : 0
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
