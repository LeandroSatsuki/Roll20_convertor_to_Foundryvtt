import type { FoundryItem } from '../foundry/foundryTypes'
import { cloneFoundryLibraryItem, markFallbackHydration } from '../foundry-library/cloneFoundryLibraryItem'
import { matchFoundryLibraryItem } from '../foundry-library/foundryLibraryMatcher'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { classifyHydrationFallback, fallbackReason, shouldHydrateWithLibrary } from './hydrationPriority'

export function hydrateFeatItem(item: FoundryItem, library: FoundryReferenceLibrary, context: { characterClass?: string; characterLevel?: number }): FoundryItem {
  const existingFlags = item.flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const existingFeatureSource = existingFlags?.featureSource
  const existingFeatureResolution = existingFlags?.featureResolution && typeof existingFlags.featureResolution === 'object' && !Array.isArray(existingFlags.featureResolution)
    ? { ...(existingFlags.featureResolution as Record<string, unknown>) }
    : {}
  const suggestionAliases = Array.isArray(existingFeatureResolution.librarySuggestionAliases)
    ? existingFeatureResolution.librarySuggestionAliases.map(String)
    : []
  const match = matchFoundryLibraryItem(library, {
    requestedName: item.name,
    requestedType: item.type === 'background' || item.type === 'race' ? item.type : 'feat',
    characterClass: context.characterClass,
    characterLevel: context.characterLevel,
    aliases: suggestionAliases,
  })
  const bonfireLocked = existingFeatureResolution.sourcePriority === 'bonfire-first' && existingFeatureResolution.bonfireMatched === true
  if (bonfireLocked) {
    const fallback = markFallbackHydration(item, item.name, item.type, 'fallback', {
      fallbackCategory: 'bonfireFallback',
      matchScore: match.best?.score,
      matchConfidence: match.best?.confidence ?? match.confidence,
      warnings: match.warnings,
      ambiguous: match.warnings.includes('FOUNDRY_LIBRARY_AMBIGUOUS_MATCH'),
    })
    const flags = fallback.flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
    if (flags) {
      const featureSource = existingFeatureSource && typeof existingFeatureSource === 'object' && !Array.isArray(existingFeatureSource) ? { ...(existingFeatureSource as Record<string, unknown>) } : {}
      featureSource.hydratedFromLibrary = false
      featureSource.fallbackBonfire = true
      featureSource.unresolved = false
      flags.featureSource = featureSource
      flags.featureResolution = {
        ...existingFeatureResolution,
        sourcePriority: 'bonfire-first',
        bonfireMatched: true,
        libraryCandidateRejectedBecauseBonfireMatched: Boolean(match.best),
        librarySuggestionName: match.best?.entry.name ?? null,
      }
    }
    return fallback
  }
  if (!shouldHydrateWithLibrary(match)) {
    return markFallbackHydration(item, item.name, item.type, match.warnings.includes('FOUNDRY_LIBRARY_TYPE_CONFLICT') ? 'type-conflict' : fallbackReason(match), {
      fallbackCategory: classifyHydrationFallback(item, item.type, match),
      matchScore: match.best?.score,
      matchConfidence: match.best?.confidence ?? match.confidence,
      warnings: match.warnings,
      ambiguous: match.warnings.includes('FOUNDRY_LIBRARY_AMBIGUOUS_MATCH'),
    })
  }
  const hydrated = cloneFoundryLibraryItem(match, item.name, item.type)
  const flags = hydrated.flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  if (flags) {
    const featureSource = existingFeatureSource && typeof existingFeatureSource === 'object' && !Array.isArray(existingFeatureSource) ? { ...(existingFeatureSource as Record<string, unknown>) } : {}
    featureSource.hydratedFromLibrary = true
    featureSource.fallbackBonfire = false
    featureSource.unresolved = false
    flags.featureSource = featureSource
    flags.featureResolution = existingFeatureResolution
  }
  return hydrated
}
