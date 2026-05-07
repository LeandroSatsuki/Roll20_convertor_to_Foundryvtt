import type { FoundryItem } from '../foundry/foundryTypes'
import { cloneFoundryLibraryItem, markFallbackHydration } from '../foundry-library/cloneFoundryLibraryItem'
import { matchFoundryLibraryItem } from '../foundry-library/foundryLibraryMatcher'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { classifyHydrationFallback, fallbackReason, shouldHydrateWithLibrary } from './hydrationPriority'

export function hydrateFeatItem(item: FoundryItem, library: FoundryReferenceLibrary, context: { characterClass?: string; characterLevel?: number }): FoundryItem {
  const existingFlags = item.flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const existingFeatureSource = existingFlags?.featureSource
  const match = matchFoundryLibraryItem(library, {
    requestedName: item.name,
    requestedType: item.type === 'background' || item.type === 'race' ? item.type : 'feat',
    characterClass: context.characterClass,
    characterLevel: context.characterLevel,
  })
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
  }
  return hydrated
}
