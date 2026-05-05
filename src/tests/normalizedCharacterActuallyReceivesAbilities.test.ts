import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('normalized character actually receives abilities', () => {
  it('stores the parsed Pipkin ability scores on the real returned character object', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    expect(result.character.abilities.str.score.value).toBe(8)
    expect(result.character.abilities.dex.score.value).toBe(14)
    expect(result.character.abilities.con.score.value).toBe(12)
    expect(result.character.abilities.int.score.value).toBe(10)
    expect(result.character.abilities.wis.score.value).toBe(18)
    expect(result.character.abilities.cha.score.value).toBe(14)
    expect(result.debug.normalizedDebugSnapshot?.abilities.str).toBe(8)
  })
})
