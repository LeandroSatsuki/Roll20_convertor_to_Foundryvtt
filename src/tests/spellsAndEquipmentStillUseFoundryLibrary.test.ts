import { describe, expect, it } from 'vitest'
import type { FoundryItem } from '../lib/foundry/foundryTypes'
import { hydrateEquipmentItem } from '../lib/hydration/hydrateEquipmentItem'
import { hydrateSpellItem } from '../lib/hydration/hydrateSpellItem'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('spellsAndEquipmentStillUseFoundryLibrary', () => {
  it('keeps spell hydration active for real spell items', () => {
    const library = loadMegaLibraryFixture()
    const hydrated = hydrateSpellItem(spellItem('Healing Word'), library, { characterClass: 'Clérigo', spellcastingAbility: 'wis' })
    const meta = (hydrated.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(meta.hydrated).toBe(true)
    expect(meta.source).toBe('foundry-reference-library')
  })

  it('keeps equipment hydration active for real equipment items', () => {
    const library = loadMegaLibraryFixture()
    const hydrated = hydrateEquipmentItem(item('Potion of Healing', 'consumable'), library)
    const meta = (hydrated.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(meta.hydrated).toBe(true)
    expect(meta.source).toBe('foundry-reference-library')
  })
})

function spellItem(name: string): FoundryItem {
  return {
    _id: 'requestedspell001',
    name,
    type: 'spell',
    img: 'icons/svg/book.svg',
    system: { identifier: name.toLowerCase().replace(/\s+/g, '-'), level: 1, description: { value: '<p>Fallback</p>' }, activities: {}, preparation: { mode: 'prepared', prepared: true } },
    effects: [],
    folder: null,
    flags: { 'roll20-to-foundry': {} },
    _stats: {},
  }
}

function item(name: string, type: string): FoundryItem {
  return { _id: 'requestedequip01', name, type, img: 'icons/svg/item-bag.svg', system: { identifier: 'potion-of-healing', quantity: 1, activities: {} }, effects: [], folder: null, flags: { 'roll20-to-foundry': {} }, _stats: {} }
}
