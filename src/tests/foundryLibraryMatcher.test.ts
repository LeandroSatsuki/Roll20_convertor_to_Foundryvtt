import { describe, expect, it } from 'vitest'
import { matchFoundryLibraryItem } from '../lib/foundry-library/foundryLibraryMatcher'
import { normalizeFoundryLibraryName } from '../lib/foundry-library/foundryLibraryAliases'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('foundryLibraryMatcher', () => {
  it('keeps Shield spell separate from Shield equipment', () => {
    const library = loadMegaLibraryFixture()
    const spellMatch = matchFoundryLibraryItem(library, { requestedName: 'Shield', requestedType: 'spell', spellLevel: 1 })
    const equipmentMatch = matchFoundryLibraryItem(library, { requestedName: 'Shield', requestedType: 'equipment' })

    expect(spellMatch.confidence).toBe('high')
    expect(spellMatch.best?.entry.type).toBe('spell')
    expect(equipmentMatch.confidence).toBe('high')
    expect(['equipment', 'loot', 'tool', 'consumable', 'weapon']).toContain(equipmentMatch.best?.entry.type)
  })

  it.each([
    ['Barksin', 'Barkskin', 'spell'],
    ['Scimiliar', 'Scimitar', 'weapon'],
    ["Sylune's Viper", "Sylune's Viper", 'spell'],
    ["Syluné's Viper", "Sylune's Viper", 'spell'],
    ['Healing Word', 'Healing Word', 'spell'],
    ['Potion of Healing', 'Potion of Healing', 'consumable'],
  ])('resolves %s to %s', (requestedName, expectedName, requestedType) => {
    const library = loadMegaLibraryFixture()
    const match = matchFoundryLibraryItem(library, { requestedName, requestedType })

    expect(match.confidence).toBe('high')
    expect(normalizeFoundryLibraryName(match.best?.entry.name)).toBe(normalizeFoundryLibraryName(expectedName))
  })
})
