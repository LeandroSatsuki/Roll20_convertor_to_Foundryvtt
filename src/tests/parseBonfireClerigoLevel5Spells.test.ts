import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'

describe('parseclerigo-level5Spells', () => {
  it('reads cantrips and spell levels from the Magias sheet and marks them as prepared', async () => {
    const workbook = await readWorkbook(createBonfireV21Workbook({ includeMagias: true }), 'pipkin-magias.xlsx')
    const result = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const { spells } = result.character

    expect(spells.cantrips.map((spell) => spell.name.value)).toEqual(expect.arrayContaining(['Thaumaturgy', 'Guidance', 'Sacred Flame']))
    expect(spells.levels.spell1.spells.map((spell) => spell.name.value)).toEqual(expect.arrayContaining(['Bless', 'Cure Wounds']))
    expect(spells.levels.spell2.spells.map((spell) => spell.name.value)).toEqual(expect.arrayContaining(['Aid']))
    expect(spells.levels.spell3.spells.map((spell) => spell.name.value)).toEqual(expect.arrayContaining(['Spirit Guardians']))
    expect(spells.cantrips.every((spell) => spell.prepared === true)).toBe(true)
    expect(spells.levels.spell1.spells.every((spell) => spell.prepared === true)).toBe(true)
  })
})
