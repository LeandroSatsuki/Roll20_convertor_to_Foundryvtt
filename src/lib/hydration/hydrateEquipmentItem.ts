import type { FoundryItem } from '../foundry/foundryTypes'
import { cloneFoundryLibraryItem, markFallbackHydration } from '../foundry-library/cloneFoundryLibraryItem'
import { matchFoundryLibraryItem } from '../foundry-library/foundryLibraryMatcher'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { classifyHydrationFallback, fallbackReason, shouldHydrateWithLibrary } from './hydrationPriority'

export function hydrateEquipmentItem(item: FoundryItem, library: FoundryReferenceLibrary): FoundryItem {
  const match = matchFoundryLibraryItem(library, { requestedName: item.name, requestedType: item.type })
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
  const quantity = item.system.quantity
  if (typeof quantity === 'number') hydrated.system.quantity = quantity
  return hydrated
}
