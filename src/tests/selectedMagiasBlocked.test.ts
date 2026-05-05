import { describe, expect, it } from 'vitest'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { createWorkbookData } from './sheetTestWorkbook'

describe('selectedMagiasBlocked', () => {
  it('blocks parsing when a low-confidence Magias sheet is selected manually', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'LOG',
          rows: [
            ['PERSONAGEM', 'Pipkin'],
            ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5'],
            ['RACA', 'Folken'],
            ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'],
            ['INTELIGENCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'],
            ['PV MAXIMO', '33'],
            ['PERICIAS'],
          ],
        },
        {
          name: 'Magias',
          rows: [['SPELL LIST'], ['Magic Missile'], ['Associated Skills'], ['bludgeoning'], ['piercing']],
        },
      ]),
      'magias-blocked.xlsx',
    )

    const result = parseBonfireCharacterSheet(workbook, { selectedSheetName: 'Magias' })
    const codes = result.character.warnings.map((warning) => warning.code)

    expect(result.debug.selectedSheetName).toBe('Magias')
    expect(result.debug.confidence).toBe('low')
    expect(codes).toEqual(expect.arrayContaining(['SHEET_TEMPLATE_LOW_CONFIDENCE', 'SHEET_PARSE_BLOCKED_LOW_CONFIDENCE']))
    expect(result.character.identity.name.value).toBe('')
  })
})
