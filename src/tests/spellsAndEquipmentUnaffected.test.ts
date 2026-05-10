import { describe, expect, it } from 'vitest'
import type { FoundryItem } from '../lib/foundry/foundryTypes'
import { hydrateEquipmentItem } from '../lib/hydration/hydrateEquipmentItem'
import { hydrateSpellItem } from '../lib/hydration/hydrateSpellItem'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('spellsAndEquipmentUnaffected', () => {
  it('keeps Foundry library hydration for spells and equipment while Bonfire feature rules stay separate', () => {
    const library = loadMegaLibraryFixture()
    const spell = hydrateSpellItem(buildSpell('Healing Word'), library, { characterClass: 'Clérigo', spellcastingAbility: 'wis' })
    const item = hydrateEquipmentItem(buildItem('Potion of Healing', 'consumable'), library)

    expect(((spell.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>).source).toBe('foundry-reference-library')
    expect(((item.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>).source).toBe('foundry-reference-library')
  })
})

function buildSpell(name: string): FoundryItem {
  return {
    _id: 'spellcheck001',
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

function buildItem(name: string, type: string): FoundryItem {
  return {
    _id: 'equipcheck001',
    name,
    type,
    img: 'icons/svg/item-bag.svg',
    system: { identifier: 'potion-of-healing', quantity: 1, activities: {} },
    effects: [],
    folder: null,
    flags: { 'roll20-to-foundry': {} },
    _stats: {},
  }
}
