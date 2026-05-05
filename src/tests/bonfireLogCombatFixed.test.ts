import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log combat fixed', () => {
  it('keeps ac, hp, speed and passive perception sane for Pipkin', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    expect(result.character.attributes.ac.value).toBe(18)
    expect(result.character.attributes.hp.max.value).toBe(33)
    expect(result.character.attributes.speed.value).toBe(25)
    expect(result.character.attributes.passivePerception.raw ?? '').not.toMatch(/n[ií]vel/i)
    expect(typeof result.character.attributes.passivePerception.value === 'number' || result.character.attributes.passivePerception.value === null).toBe(true)
  })
})
