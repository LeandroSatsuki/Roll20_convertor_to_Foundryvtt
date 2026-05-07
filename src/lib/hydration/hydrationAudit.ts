import type { FoundryActor, FoundryItem } from '../foundry/foundryTypes'
import type { FoundryHydrationDetail, FoundryHydrationReport } from '../foundry-library/foundryReferenceLibraryTypes'

export function buildHydrationReport(items: FoundryItem[]): FoundryHydrationReport {
  const matches = items.map((item) => ({ item, meta: getHydrationMeta(item) }))
  const hydrated = matches.filter(({ meta }) => meta?.hydrated === true)
  const fallback = matches.filter(({ meta }) => meta?.hydrated === false)
  const details = matches.map(({ item, meta }) => toHydrationDetail(item, meta))

  return {
    requestedItemsCount: items.length,
    hydratedItemsCount: hydrated.length,
    hydrationFallbackCount: fallback.filter(({ meta }) => {
      const category = meta?.fallbackCategory
      return category === 'libraryMiss' || category === 'unsafeMatchRejected' || category === 'noCandidate'
    }).length,
    hydratedSpellsCount: hydrated.filter(({ item }) => item.type === 'spell').length,
    hydratedClassFeaturesCount: hydrated.filter(({ item }) => item.type === 'feat').length,
    hydratedEquipmentCount: hydrated.filter(({ item }) => ['equipment', 'weapon', 'consumable', 'loot', 'tool'].includes(item.type)).length,
    hydratedItemsWithActivitiesCount: hydrated.filter(({ item }) => countItemActivities(item) > 0).length,
    hydratedItemsWithEffectsCount: hydrated.filter(({ item }) => Array.isArray(item.effects) && item.effects.length > 0).length,
    hydratedItemsWithMidiCount: hydrated.filter(({ item }) => hasMidiProperties(item)).length,
    hydratedItemsWithPlutoniumCount: hydrated.filter(({ item }) => hasPlutoniumFlags(item)).length,
    hydrationHighCount: hydrated.filter(({ meta }) => meta?.matchConfidence === 'high').length,
    hydrationMediumCount: hydrated.filter(({ meta }) => meta?.matchConfidence === 'medium').length,
    hydrationLowCount: hydrated.filter(({ meta }) => meta?.matchConfidence === 'low').length,
    hydrationCustomFallbackCount: fallback.filter(({ meta }) => meta?.fallbackCategory === 'customFallback').length,
    bonfireFallbackFeatureCount: fallback.filter(({ meta }) => meta?.fallbackCategory === 'bonfireFallback').length,
    hydrationLibraryMissCount: fallback.filter(({ meta }) => meta?.fallbackCategory === 'libraryMiss').length,
    hydrationUnsafeMatchRejectedCount: fallback.filter(({ meta }) => meta?.fallbackCategory === 'unsafeMatchRejected').length,
    hydrationNoCandidateCount: fallback.filter(({ meta }) => meta?.fallbackCategory === 'noCandidate').length,
    sanitizedActorReferenceCount: hydrated.reduce((total, { meta }) => total + numeric(meta?.sanitizedActorReferences), 0),
    entries: details,
    hydrationDetails: details,
    warnings: fallback.flatMap(({ item, meta }) =>
      (Array.isArray(meta?.warnings) && meta.warnings.length ? meta.warnings.map(String) : ['FOUNDRY_LIBRARY_ITEM_NOT_FOUND']).map((code) => ({
        code,
        message: `${item.name} usou fallback porque nao houve match high na biblioteca.`,
        itemName: item.name,
      })),
    ),
  }
}

function toHydrationDetail(item: FoundryItem, meta: Record<string, unknown> | null): FoundryHydrationDetail {
  return {
    requestedName: String(meta?.requestedName ?? item.name),
    requestedType: String(meta?.requestedType ?? item.type),
    finalItemName: item.name,
    finalItemType: item.type,
    hydrated: Boolean(meta?.hydrated),
    fallbackUsed: meta?.hydrated !== true,
    fallbackCategory: parseFallbackCategory(meta?.fallbackCategory),
    matchedName: typeof meta?.sourceItemName === 'string' ? meta.sourceItemName : undefined,
    sourceActorName: typeof meta?.sourceActorName === 'string' ? meta.sourceActorName : undefined,
    sourceFileName: typeof meta?.sourceFileName === 'string' ? meta.sourceFileName : undefined,
    matchScore: numericOrUndefined(meta?.matchScore),
    matchConfidence: parseConfidence(meta?.matchConfidence, meta?.hydrated),
    preservedActivities: Boolean(meta?.preservedActivities),
    preservedEffects: Boolean(meta?.preservedEffects),
    preservedMidiProperties: Boolean(meta?.preservedMidiProperties),
    preservedPlutoniumFlags: Boolean(meta?.preservedPlutoniumFlags),
    sanitizedActorReferences: numeric(meta?.sanitizedActorReferences),
    warnings: Array.isArray(meta?.warnings) ? meta.warnings.map(String) : [],
  }
}

export function attachHydrationReport(actor: FoundryActor, report: FoundryHydrationReport): FoundryActor {
  const flags = actor.flags as Record<string, unknown>
  const converterFlags = (flags['roll20-to-foundry'] as Record<string, unknown> | undefined) ?? {}
  converterFlags.hydrationReport = removeUndefinedDeep(report)
  flags['roll20-to-foundry'] = converterFlags
  actor.flags = flags
  return actor
}

export function getActorHydrationReport(actor: FoundryActor | null | undefined): FoundryHydrationReport | null {
  const report = getConverterFlags(actor)?.hydrationReport
  return report && typeof report === 'object' && !Array.isArray(report) ? (report as FoundryHydrationReport) : null
}

function getHydrationMeta(item: FoundryItem): Record<string, unknown> | null {
  const flags = item.flags?.['roll20-to-foundry']
  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) return null
  const hydration = (flags as Record<string, unknown>).hydration
  return hydration && typeof hydration === 'object' && !Array.isArray(hydration) ? (hydration as Record<string, unknown>) : null
}

function getConverterFlags(actor: FoundryActor | null | undefined): Record<string, unknown> | null {
  const flags = actor?.flags as Record<string, unknown> | undefined
  const converterFlags = flags?.['roll20-to-foundry']
  return converterFlags && typeof converterFlags === 'object' && !Array.isArray(converterFlags) ? (converterFlags as Record<string, unknown>) : null
}

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function numericOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function parseConfidence(value: unknown, hydrated: unknown): 'high' | 'medium' | 'low' | 'not-found' {
  if (value === 'high' || value === 'medium' || value === 'low' || value === 'not-found') return value
  return hydrated ? 'low' : 'not-found'
}

function parseFallbackCategory(value: unknown): 'customFallback' | 'bonfireFallback' | 'libraryMiss' | 'unsafeMatchRejected' | 'noCandidate' | null {
  return value === 'customFallback' || value === 'bonfireFallback' || value === 'libraryMiss' || value === 'unsafeMatchRejected' || value === 'noCandidate' ? value : null
}

function countItemActivities(item: FoundryItem): number {
  const activities = item.system?.activities
  if (!activities) return 0
  if (Array.isArray(activities)) return activities.length
  if (typeof activities === 'object') return Object.keys(activities as Record<string, unknown>).length
  return 0
}

function hasMidiProperties(item: FoundryItem): boolean {
  const flags = item.flags as Record<string, unknown> | undefined
  if (flags?.['midi-qol'] && typeof flags['midi-qol'] === 'object') return true
  if (flags?.midiProperties && typeof flags.midiProperties === 'object') return true
  const system = item.system as Record<string, unknown> | undefined
  const midiProperties = system?.midiProperties
  return Boolean(midiProperties && typeof midiProperties === 'object' && Object.keys(midiProperties as Record<string, unknown>).length)
}

function hasPlutoniumFlags(item: FoundryItem): boolean {
  const flags = item.flags as Record<string, unknown> | undefined
  return Boolean(flags?.plutonium && typeof flags.plutonium === 'object' && !Array.isArray(flags.plutonium))
}

function removeUndefinedDeep<T>(value: T): T {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      if (value[index] === undefined) value.splice(index, 1)
      else removeUndefinedDeep(value[index])
    }
    return value
  }
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) delete record[key]
    else removeUndefinedDeep(record[key])
  }
  return value
}
