import { describe, expect, it } from 'vitest'
import { matchFoundryLibraryItem } from '../lib/foundry-library/foundryLibraryMatcher'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('hydrationEquipmentAliases', () => {
  it('resolves equipment aliases conservatively and keeps Shield types separate', () => {
    const library = loadMegaLibraryFixture()

    const scimitar = matchFoundryLibraryItem(library, { requestedName: 'Scimiliar', requestedType: 'weapon' })
    const studded = matchFoundryLibraryItem(library, { requestedName: 'Studded Leather Armor', requestedType: 'equipment' })
    const woodcarver = matchFoundryLibraryItem(library, { requestedName: "Woodcarver's Tools", requestedType: 'tool' })
    const shieldSpell = matchFoundryLibraryItem(library, { requestedName: 'Shield', requestedType: 'spell', spellLevel: 1 })
    const shieldEquipment = matchFoundryLibraryItem(library, { requestedName: 'Shield', requestedType: 'equipment' })

    expect(scimitar.confidence).toBe('high')
    expect(scimitar.best?.entry.name).toBe('Scimitar')

    expect(studded.confidence).toBe('high')
    expect(['Studded Leather', 'Studded Leather Armor']).toContain(studded.best?.entry.name)

    expect(woodcarver.confidence).toBe('high')
    expect(woodcarver.best?.entry.name).toBe("Woodcarver's Tools")

    expect(shieldSpell.confidence).toBe('high')
    expect(shieldSpell.best?.entry.type).toBe('spell')
    expect(shieldEquipment.confidence).toBe('high')
    expect(shieldEquipment.best?.entry.type).toBe('equipment')
  })
})
