import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('spellSlotsShape', () => {
  it('uses stable dnd5e-compatible spell slot fields for a druid 6 actor', async () => {
    const { bundle } = await buildBonfireBundle({ includeMagias: true }, (character) => {
      character.identity.classText.value = 'Druida 6'
      character.identity.classes = [{ name: 'Druida', level: 6 }]
      character.spells.spellcastingClass.value = 'Druida'
    })

    const spells = bundle.actor.system.spells as Record<string, Record<string, unknown>>

    expect(spells.spell1.value).toBe(4)
    expect(spells.spell2.value).toBe(3)
    expect(spells.spell3.value).toBe(3)
    expect(spells.spell4.value).toBe(0)
    expect(spells.spell1.override).toBeNull()
    expect(spells.spell2.override).toBeNull()
    expect('temp' in spells.spell1).toBe(false)
    expect('max' in spells.spell1).toBe(false)
  })
})
