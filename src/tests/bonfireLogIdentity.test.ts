import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log identity parsing', () => {
  it('extracts name, class, race, background and player from samples/clerigo-level5.xlsx', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    expect(result.character.identity.name.value).toBe('Pipkin "Sorte Grande"')
    expect(result.character.identity.classText.value).toBe('Clérigo 5')
    expect(result.character.identity.classes[0]).toEqual(expect.objectContaining({ name: 'Clérigo', level: 5 }))
    expect(result.character.identity.race.value).toBe('Folken Limalumes')
    expect(result.character.identity.background.value).toBe('Espião')
    expect(result.character.identity.player?.value).toBe('Satsuki')
  })
})
