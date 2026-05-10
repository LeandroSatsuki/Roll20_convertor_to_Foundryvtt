import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createClerigoLevel5WorkbookData } from './createClerigoLevel5Workbook'

describe('parseBonfireCharacterSheet', () => {
  it('extracts clerigo-level5 from the xlsx sheet', async () => {
    const workbook = await readWorkbook(createClerigoLevel5WorkbookData(), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    expect(character.identity.name.value).toBe('Pipkin "Sorte Grande"')
    expect(character.identity.classes[0]).toEqual({ name: 'Clérigo', level: 5 })
    expect(character.identity.race.value).toBe('Folken Limalumes')
    expect(character.identity.background.value).toBe('Espião')
    expect(character.abilities.str.score.value).toBe(8)
    expect(character.abilities.wis.score.value).toBe(18)
    expect(character.proficiencyBonus.value).toBe(3)
    expect(character.attributes.ac.value).toBe(18)
    expect(character.attributes.hp.max.value).toBe(33)
    expect(character.currency.gp.value).toBe(1225)
    expect(character.equipment?.map((item) => item.name.value)).toEqual(expect.arrayContaining(['Scale Mail', 'Shield', 'Potion of Healing', 'Shortbow', 'Holy Symbol', 'Água Benta']))
  })
})
