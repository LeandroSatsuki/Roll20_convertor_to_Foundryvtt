import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log identity fixed', () => {
  it('keeps the correct identity fields for clerigo-level5 in the explicit bonfire-log-v2 fallback', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-log-v2' })

    expect(result.debug.templateId).toBe('bonfire-log-v2')
    expect(result.debug.selectedSheetName).toBe('LOG')
    expect(result.character.identity.name.value).toBe('Pipkin "Sorte Grande"')
    expect(result.character.identity.player?.value).toBe('Satsuki')
    expect(result.character.identity.classText.value).toBe('Clérigo 5')
    expect(result.character.identity.race.value).toBe('Folken Limalumes')
    expect(result.character.identity.background.value).not.toBe('FOR')
    expect(result.character.identity.background.value).toBe('Espião')
  })
})
