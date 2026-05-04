import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('merged cells identity', () => {
  it('finds the name inherited from a merged cell above the name label', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'Ficha',
          rows: [
            ['Pipkin', '', '', ''],
            ['NOME DO PERSONAGEM'],
            ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5', 'RACA', 'Folken'],
            ['ANTECEDENTE', 'Espiao'],
            ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'],
            ['INTELIGENCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'],
            ['CA', '18', 'PV MAXIMO', '33', 'VELOCIDADE', '25'],
            ['PERICIAS'],
          ],
          merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }],
        },
      ]),
      'merged.xlsx',
    )

    const result = parseBonfireCharacterSheet(workbook)
    expect(result.character.identity.name.value).toBe('Pipkin')
    expect(result.debug.extractedFields.some((field) => field.fieldPath === 'identity.name.candidate' && field.inheritedFromMerge)).toBe(true)
  })
})
