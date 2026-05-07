export type FoundryValidationSeverity = 'info' | 'warning' | 'error'

export type FoundryValidationResult = {
  code: string
  severity: FoundryValidationSeverity
  message: string
  path?: string
  itemName?: string
  itemId?: string
}

export type FoundryExportAuditReport = {
  actorName: string
  generatedAt: string
  parserBuildId?: string
  parseRunId?: string
  normalizedCharacterId?: string
  actorBuildId?: string | null
  auditBuildId?: string | null
  sourceType: string
  sourceFileName?: string
  summary: {
    itemCount: number
    featureCount: number
    weaponCount: number
    equipmentCount: number
    spellCount: number
    warningCount: number
    errorCount: number
    invalidIdentifierCount: number
    duplicateIdentifierCount: number
    unresolvedFeatureCount: number
    resolvedHighCount: number
    resolvedMediumCount: number
    resolvedLowCount: number
    unresolvedCount: number
    manuallyResolvedCount: number
    genericItemCount: number
    describedItemCount: number
    missingDescriptionCount: number
    descriptionFallbackCount: number
    sourceUrlCount: number
    automatedFullCount: number
    automatedPartialCount: number
    automatedNoneCount: number
    activitiesCount: number
    invalidActivitiesCount: number
    usesConfiguredCount: number
    recoveryConfiguredCount: number
    libraryFilesLoadedCount: number
    libraryItemsLoadedCount: number
    librarySpellsLoadedCount: number
    libraryFeatsLoadedCount: number
    libraryEquipmentLoadedCount: number
    libraryItemsWithActivitiesCount: number
    libraryItemsWithEffectsCount: number
    libraryItemsWithMidiCount: number
    libraryItemsWithPlutoniumCount: number
    hydratedItemsCount: number
    hydrationFallbackCount: number
    hydratedSpellsCount: number
    hydratedClassFeaturesCount: number
    hydratedEquipmentCount: number
    hydratedItemsWithActivitiesCount: number
    hydratedItemsWithEffectsCount: number
    hydratedItemsWithMidiCount: number
    hydratedItemsWithPlutoniumCount: number
    hydrationHighCount: number
    hydrationMediumCount: number
    hydrationLowCount: number
    hydrationCustomFallbackCount: number
    bonfireFallbackFeatureCount: number
    hydrationLibraryMissCount: number
    hydrationUnsafeMatchRejectedCount: number
    hydrationNoCandidateCount: number
    sanitizedActorReferenceCount: number
    sheetFeatureRangeCount: number
    sheetFeaturesExtractedCount: number
    sheetFeaturesDedupedCount: number
    hydratedSheetFeaturesCount: number
    unresolvedSheetFeatureCount: number
    classProgressionSuggestedCount: number
  }
  validations: FoundryValidationResult[]
  auditDebug: {
    parserBuildId?: string
    parseRunId?: string
    normalizedCharacterId?: string
    actorBuildId?: string | null
    auditBuildId?: string | null
    normalizedDebugSnapshot: {
      abilities: Record<string, number | null>
    }
    actorInputSnapshot: {
      abilities: Record<string, number | null>
    }
    abilitiesBeforeActorBuild: Record<string, number | null>
    abilitiesInsideActor: Record<string, number | null>
    itemNames: string[]
    itemDescriptions: {
      complete: Array<{ name: string; sourceUrl?: string | null }>
      fallback: Array<{ name: string; sourceUrl?: string | null }>
      missing: Array<{ name: string; sourceUrl?: string | null }>
    }
    automationSummary: {
      automatedFullCount: number
      automatedPartialCount: number
      automatedNoneCount: number
      activitiesCount: number
      invalidActivitiesCount: number
      usesConfiguredCount: number
      recoveryConfiguredCount: number
    }
    libraryReport?: unknown
    hydrationReport?: unknown
    classProgressionSuggestions?: unknown
    sheetFeatureDebug?: {
      rangeCount: number
      extractedCount: number
      dedupedCount: number
    }
  }
  unresolvedFeatures: Array<{
    rawName: string
    section?: string
    confidence: 'high' | 'medium' | 'low'
    suggestedKind?: string
    message: string
  }>
  importReadiness: {
    canExport: boolean
    canImportIntoFoundry: boolean
    blockingReasons: string[]
  }
}

export function validation(code: string, severity: FoundryValidationSeverity, message: string, path?: string, itemName?: string, itemId?: string): FoundryValidationResult {
  return { code, severity, message, path, itemName, itemId }
}

export function hasUndefinedDeep(value: unknown): boolean {
  if (value === undefined) return true
  if (value === null) return false
  if (Array.isArray(value)) return value.some(hasUndefinedDeep)
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasUndefinedDeep)
  return false
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
