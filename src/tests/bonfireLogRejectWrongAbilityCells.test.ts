import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log rejects wrong ability cells', () => {
  it('does not use wrong nearby cells for wis/cha scores or mods', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)
    const wis = result.debug.abilityBlockCandidates.find((entry) => entry.ability === 'wis')
    const cha = result.debug.abilityBlockCandidates.find((entry) => entry.ability === 'cha')

    expect(result.character.abilities.wis.score.value).not.toBe(1)
    expect(result.character.abilities.cha.score.value).not.toBe(1)
    expect(result.character.abilities.wis.mod.value).not.toBe(7)
    expect(result.character.abilities.cha.mod.value).not.toBe(5)

    expect(wis?.selectedCell).not.toBe('H21')
    expect(cha?.selectedCell).not.toBe('H22')
  })
})
