import type { FoundryItem } from '../foundry/foundryTypes'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { hydrateEquipmentItem } from './hydrateEquipmentItem'

export function hydrateConsumableItem(item: FoundryItem, library: FoundryReferenceLibrary): FoundryItem {
  return hydrateEquipmentItem(item, library)
}
