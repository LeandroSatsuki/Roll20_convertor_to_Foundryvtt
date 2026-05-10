import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('parseclerigo-level5BonfireV21', () => {
  it('parses clerigo-level5.xlsx with the fixed Bonfire template', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const { character, debug } = result

    expect(debug.templateUsed).toBe('bonfire-v2.1')
    expect(debug.selectedSheets).toEqual(['LOG', 'Personagem', 'Magias'])
    expect(character.identity.name.value).toContain('Pipkin')
    expect(character.identity.classText.value).toContain('Clérigo 5')
    expect(character.identity.race.value).toContain('Folken')
    expect(character.identity.background.value).toContain('Espião')
    expect(character.attributes.ac.value).toBe(18)
    expect(character.attributes.hp.max.value).toBe(33)
    expect(character.attributes.speed.value).toBe(25)
    expect(character.proficiencyBonus.value).toBe(3)
    expect(character.attributes.passivePerception.value).toBe(14)
    expect(character.saves.str.total.value).toBe(-1)
    expect(character.saves.wis.total.value).toBe(4)
    expect(character.skills.prc.total.value).toBe(4)
    expect(character.skills.sur.total.value).toBe(7)
    expect((character.equipment ?? []).map((item) => item.name.value)).toEqual(
      expect.arrayContaining(['Scale Mail', 'Shield', 'Potion of Healing', 'Shortbow', "Explorer's Pack", 'Holy Symbol', 'Água Benta']),
    )
    expect(debug.ignoredSheets).toEqual([])
  })
})
