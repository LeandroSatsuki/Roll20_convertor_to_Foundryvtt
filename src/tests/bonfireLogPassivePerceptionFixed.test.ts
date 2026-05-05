import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log passive perception fixed', () => {
  it('returns a numeric passive perception and never text', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)

    expect(typeof character.attributes.passivePerception.value === 'number' || character.attributes.passivePerception.value === null).toBe(true)
    expect(String(character.attributes.passivePerception.raw ?? '')).not.toMatch(/n[ií]vel/i)
    expect(character.attributes.passivePerception.value).toBe(14)
  })
})
