import type { FoundryItem } from '../foundry/foundryTypes'
import { cloneFoundryLibraryItem, markFallbackHydration } from '../foundry-library/cloneFoundryLibraryItem'
import { matchFoundryLibraryItem } from '../foundry-library/foundryLibraryMatcher'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { classifyHydrationFallback, fallbackReason, shouldHydrateWithLibrary } from './hydrationPriority'

export function hydrateClassItem(item: FoundryItem, library: FoundryReferenceLibrary, context: { characterClass?: string; characterLevel?: number }): FoundryItem {
  const match = matchFoundryLibraryItem(library, { requestedName: item.name, requestedType: 'class', characterClass: context.characterClass, characterLevel: context.characterLevel })
  if (!shouldHydrateWithLibrary(match)) {
    return markFallbackHydration(item, item.name, 'class', match.warnings.includes('FOUNDRY_LIBRARY_TYPE_CONFLICT') ? 'type-conflict' : fallbackReason(match), {
      fallbackCategory: classifyHydrationFallback(item, 'class', match),
      matchScore: match.best?.score,
      matchConfidence: match.best?.confidence ?? match.confidence,
      warnings: match.warnings,
      ambiguous: match.warnings.includes('FOUNDRY_LIBRARY_AMBIGUOUS_MATCH'),
    })
  }
  const hydrated = cloneFoundryLibraryItem(match, item.name, 'class')
  if (typeof context.characterLevel === 'number') hydrated.system.levels = context.characterLevel
  if (Array.isArray(hydrated.system.advancement)) hydrated.system.advancement = []
  return hydrated
}
