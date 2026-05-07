import { describe, expect, it } from 'vitest'
import type { FoundryItem } from '../lib/foundry/foundryTypes'
import { hydrateSpellItem } from '../lib/hydration/hydrateSpellItem'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('spellHydrationFromMegaLibrary', () => {
  it.each(['Healing Word', 'Guiding Bolt', 'Phantasmal Force', 'Thunderwave'])('hydrates %s from a real library item when available', (spellName) => {
    const library = loadMegaLibraryFixture()
    const hydrated = hydrateSpellItem(spellItem(spellName), library, { characterClass: 'Clérigo', spellcastingAbility: 'wis' })
    const meta = (hydrated.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(meta.hydrated).toBe(true)
    expect(meta.matchConfidence).toBe('high')
    expect(meta.preservedActivities).toBe(true)
    expect(hydrated.system.sourceClass).toBe('cleric')
    expect(hydrated.system.ability).toBe('wis')
    expect(hydrated.system.method).toBe('spell')
  })

  it('preserves midi and plutonium metadata when the source item has it', () => {
    const library = loadMegaLibraryFixture()
    const hydrated = hydrateSpellItem(spellItem('Thunderwave'), library, { characterClass: 'Clérigo', spellcastingAbility: 'wis' })
    const meta = (hydrated.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(meta.preservedActivities).toBe(true)
    expect(meta.preservedPlutoniumFlags).toBe(true)
    expect(hydrated.flags.plutonium).toBeTruthy()
  })
})

function spellItem(name: string): FoundryItem {
  return {
    _id: 'requestedspell001',
    name,
    type: 'spell',
    img: 'icons/svg/book.svg',
    system: { identifier: name.toLowerCase().replace(/\s+/g, '-'), level: name === 'Phantasmal Force' ? 2 : 1, description: { value: '<p>Fallback</p>' }, activities: {}, preparation: { mode: 'prepared', prepared: true } },
    effects: [],
    folder: null,
    flags: { 'roll20-to-foundry': {} },
    _stats: {},
  }
}
