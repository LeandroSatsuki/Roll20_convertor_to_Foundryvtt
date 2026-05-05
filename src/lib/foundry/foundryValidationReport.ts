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
    unresolvedFeatureCount: number
    resolvedHighCount: number
    resolvedMediumCount: number
    resolvedLowCount: number
    unresolvedCount: number
    manuallyResolvedCount: number
    genericItemCount: number
    automatedFullCount: number
    automatedPartialCount: number
    automatedNoneCount: number
    activitiesCount: number
    invalidActivitiesCount: number
    usesConfiguredCount: number
    recoveryConfiguredCount: number
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
    automationSummary: {
      automatedFullCount: number
      automatedPartialCount: number
      automatedNoneCount: number
      activitiesCount: number
      invalidActivitiesCount: number
      usesConfiguredCount: number
      recoveryConfiguredCount: number
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
