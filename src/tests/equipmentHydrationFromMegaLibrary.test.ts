import { describe, expect, it } from 'vitest'
import type { FoundryItem } from '../lib/foundry/foundryTypes'
import { hydrateEquipmentItem } from '../lib/hydration/hydrateEquipmentItem'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('equipmentHydrationFromMegaLibrary', () => {
  it('clones Potion of Healing with effects and uses when found', () => {
    const library = loadMegaLibraryFixture()
    const hydrated = hydrateEquipmentItem(item('Potion of Healing', 'consumable'), library)
    const meta = (hydrated.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(meta.hydrated).toBe(true)
    expect(hydrated.type).toBe('consumable')
    expect(hydrated.effects.length).toBeGreaterThan(0)
    expect(hydrated.system.uses).toBeTruthy()
  })
})

function item(name: string, type: string): FoundryItem {
  return { _id: 'requestedequip01', name, type, img: 'icons/svg/item-bag.svg', system: { identifier: 'potion-of-healing', quantity: 2, activities: {} }, effects: [], folder: null, flags: { 'roll20-to-foundry': {} }, _stats: {} }
}
