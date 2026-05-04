import { describe, expect, it } from 'vitest'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('hidden sheets are ignored by default', () => {
  it('chooses the visible character sheet over a hidden auxiliary sheet', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'Ficha',
          rows: [
            ['PERSONAGEM', 'Pipkin'],
            ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5', 'RACA', 'Folken'],
            ['ANTECEDENTE', 'Espiao'],
            ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'],
            ['INTELIGENCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'],
            ['CA', '18', 'PV MAXIMO', '33', 'VELOCIDADE', '25'],
            ['PERICIAS'],
          ],
        },
        { name: 'Data', hidden: true, rows: [['Associated Skills'], ['bludgeoning'], ['piercing'], ['FORCA']] },
      ]),
      'hidden.xlsx',
    )

    const detection = detectBestCharacterSheet(workbook)
    expect(detection.sheetName).toBe('Ficha')
    expect(detection.hidden).toBe(false)
    expect(detection.confidence).toBe('high')
  })
})
