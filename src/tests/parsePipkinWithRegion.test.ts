import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('parse Pipkin with selected region', () => {
  it('extracts identity, attributes, and combat values from the selected region', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'automatic' })

    expect(result.debug.selectedSheetName).not.toBeNull()
    expect(result.debug.selectedRegion).toBeDefined()
    expect(result.debug.extractedFields.some((field) => field.reason === 'not evaluated')).toBe(false)
    expect(result.debug.nameCandidates.length).toBeGreaterThan(0)
    expect(result.character.identity.name.value).toMatch(/Pipkin/i)
    expect(result.character.identity.classText.value).toMatch(/Cl.rigo 5|Clerigo 5/i)
    expect(result.character.identity.race.value).toMatch(/Folken/i)
    expect(result.character.abilities.str.score.value).toBe(8)
    expect(result.character.abilities.dex.score.value).toBe(14)
    expect(result.character.abilities.con.score.value).toBe(12)
    expect(result.character.abilities.int.score.value).toBe(10)
    expect(result.character.abilities.wis.score.value).toBe(18)
    expect(result.character.abilities.cha.score.value).toBe(14)
    expect(result.character.attributes.ac.value).toBe(18)
    expect(result.character.attributes.hp.max.value).toBe(33)
    expect(result.character.attributes.speed.value).toBe(25)
  })
})
