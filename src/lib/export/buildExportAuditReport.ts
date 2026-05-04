import type { FoundryActor } from '../foundry/foundryTypes'
import type { FoundryExportAuditReport, FoundryValidationResult } from '../foundry/foundryValidationReport'
import { validateFoundryActorDeep } from '../foundry/validateFoundryActor'
import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'

const blockingCodes = new Set([
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
])

export function buildExportAuditReport(actor: FoundryActor | null, normalized?: NormalizedCharacter | null): FoundryExportAuditReport {
  const structuralValidations = actor ? validateFoundryActorDeep(actor) : [{ code: 'FOUNDRY_ACTOR_MISSING', severity: 'error' as const, message: 'Actor nao foi gerado.' }]
  const ruleValidations = actor ? collectRuleResolutionValidations(actor) : []
  const validations = [...structuralValidations, ...ruleValidations]
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
  return {
    actorName: actor?.name ?? normalized?.identity.name.value ?? '',
    generatedAt: new Date().toISOString(),
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
    },
    validations,
    unresolvedFeatures,
    importReadiness: {
      canExport: blockingReasons.length === 0,
      canImportIntoFoundry: blockingReasons.length === 0,
      blockingReasons,
    },
  }
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

function getRuleResolution(item: FoundryActor['items'][number]): Record<string, unknown> | null {
  const flags = item.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const resolution = converterFlags?.ruleResolution
  return resolution && typeof resolution === 'object' ? (resolution as Record<string, unknown>) : null
}
