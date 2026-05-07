import { describe, expect, it } from 'vitest'
import { hydrateSpellItem } from '../lib/hydration/hydrateSpellItem'
import type { FoundryItem } from '../lib/foundry/foundryTypes'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('preserveMidiPlutonium', () => {
  it('preserves Midi-QOL-like properties and Plutonium flags from hydrated items', () => {
    const library = loadMegaLibraryFixture()
    const hydrated = hydrateSpellItem(spellItem('Thunderwave'), library, { characterClass: 'Druida', spellcastingAbility: 'wis' })
    const meta = (hydrated.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(meta.hydrated).toBe(true)
    expect(meta.preservedMidiProperties).toBe(true)
    expect(meta.preservedPlutoniumFlags).toBe(true)
    expect(hydrated.flags.plutonium).toBeTruthy()
    expect(hydrated.system.properties).toBeTruthy()
  })
})

function spellItem(name: string): FoundryItem {
  return {
    _id: 'requestedspell001',
    name,
    type: 'spell',
    img: 'icons/svg/book.svg',
    system: { identifier: 'thunderwave', level: 1, description: { value: '<p>Fallback</p>' }, activities: {}, preparation: { mode: 'prepared', prepared: true } },
    effects: [],
    folder: null,
    flags: { 'roll20-to-foundry': {} },
    _stats: {},
  }
}
