import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log proficiency fixed', () => {
  it('extracts or derives proficiency bonus 3 for Clerigo 5', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    expect(result.character.proficiencyBonus.value).toBe(3)
    expect(['sheet', 'derived-from-level', 'bonfire-v2.1', undefined]).toContain(result.character.proficiencyBonus.source)
  })
})
