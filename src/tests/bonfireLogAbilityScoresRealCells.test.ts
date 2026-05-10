import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log ability scores real cells', () => {
  it('extracts the six real ability scores from clerigo-level5.xlsx', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)

    expect(character.abilities.str.score.value).toBe(8)
    expect(character.abilities.dex.score.value).toBe(14)
    expect(character.abilities.con.score.value).toBe(12)
    expect(character.abilities.int.score.value).toBe(10)
    expect(character.abilities.wis.score.value).toBe(18)
    expect(character.abilities.cha.score.value).toBe(14)
  })
})
