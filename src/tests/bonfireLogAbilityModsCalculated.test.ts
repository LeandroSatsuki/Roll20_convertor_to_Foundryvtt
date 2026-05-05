import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log ability mods calculated', () => {
  it('derives mods from the selected scores', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)

    expect(character.abilities.str.mod.value).toBe(-1)
    expect(character.abilities.dex.mod.value).toBe(2)
    expect(character.abilities.con.mod.value).toBe(1)
    expect(character.abilities.int.mod.value).toBe(0)
    expect(character.abilities.wis.mod.value).toBe(4)
    expect(character.abilities.cha.mod.value).toBe(2)
  })
})
