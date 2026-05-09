import type { FoundryItem } from '../foundry/foundryTypes'
import { markFallbackHydration } from '../foundry-library/cloneFoundryLibraryItem'
import { matchFoundryLibraryItem } from '../foundry-library/foundryLibraryMatcher'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { fallbackReason, shouldHydrateWithLibrary } from './hydrationPriority'

export function hydrateClassItem(item: FoundryItem, library: FoundryReferenceLibrary, context: { characterClass?: string; characterLevel?: number }): FoundryItem {
  const match = matchFoundryLibraryItem(library, { requestedName: item.name, requestedType: 'class', characterClass: context.characterClass, characterLevel: context.characterLevel })
  const hydrated = markFallbackHydration(item, item.name, 'class', shouldHydrateWithLibrary(match) ? 'fallback' : match.warnings.includes('FOUNDRY_LIBRARY_TYPE_CONFLICT') ? 'type-conflict' : fallbackReason(match), {
    fallbackCategory: 'bonfireFallback',
    matchScore: match.best?.score,
    matchConfidence: match.best?.confidence ?? match.confidence,
    warnings: Array.from(new Set([...(match.warnings ?? []), 'FOUNDRY_FEATURE_HYDRATION_BLOCKED_BY_POLICY'])),
    ambiguous: match.warnings.includes('FOUNDRY_LIBRARY_AMBIGUOUS_MATCH'),
  })
  if (typeof context.characterLevel === 'number') hydrated.system.levels = context.characterLevel
  if (Array.isArray(hydrated.system.advancement)) hydrated.system.advancement = []
  const flags = hydrated.flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  if (flags) {
    flags.foundryLibrarySuggestionOnly = true
    flags.classResolution = {
      sourcePriority: 'bonfire-first',
      libraryCandidateRejectedBecauseBonfireMatched: Boolean(match.best),
      librarySuggestionName: match.best?.entry.name ?? null,
    }
  }
  return hydrated
}
