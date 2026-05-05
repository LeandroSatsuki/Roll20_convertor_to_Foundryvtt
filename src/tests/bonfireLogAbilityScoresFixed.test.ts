import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log ability scores fixed', () => {
  it('extracts the expected Pipkin scores and keeps signed values out of .score', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)
    const { abilities } = result.character

    expect(abilities.str.score.value).toBe(8)
    expect(abilities.dex.score.value).toBe(14)
    expect(abilities.con.score.value).toBe(12)
    expect(abilities.int.score.value).toBe(10)
    expect(abilities.wis.score.value).toBe(18)
    expect(abilities.cha.score.value).toBe(14)

    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
      expect(String(abilities[key].score.raw ?? '')).not.toMatch(/^[+-]/)
      expect([2, 1, 7, 5]).not.toContain(abilities[key].score.value)
    }

    expect(abilities.str.mod.value).toBe(-1)
    expect(abilities.dex.mod.value).toBe(2)
    expect(abilities.con.mod.value).toBe(1)
    expect(abilities.int.mod.value).toBe(0)
    expect(abilities.wis.mod.value).toBe(4)
    expect(abilities.cha.mod.value).toBe(2)
  })
})
