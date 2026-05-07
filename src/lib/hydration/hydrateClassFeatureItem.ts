import type { FoundryItem } from '../foundry/foundryTypes'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { hydrateFeatItem } from './hydrateFeatItem'

export function hydrateClassFeatureItem(item: FoundryItem, library: FoundryReferenceLibrary, context: { characterClass?: string; characterLevel?: number }): FoundryItem {
  return hydrateFeatItem(item, library, context)
}
