import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('manual sheet selection', () => {
  it('uses only the manually selected sheet', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        { name: 'Resumo', rows: [['PERSONAGEM', 'Outro'], ['CLASSE(S) & NIVEL(EIS)', 'Guerreiro 1'], ['FORCA', '16'], ['DESTREZA', '12'], ['CONSTITUICAO', '14'], ['CA', '12'], ['PERICIAS']] },
        { name: 'Ficha', rows: [['PERSONAGEM', 'Pipkin'], ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5'], ['RACA', 'Folken'], ['ANTECEDENTE', 'Espiao'], ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'], ['INTELIGENCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'], ['CA', '18', 'PV MAXIMO', '33', 'VELOCIDADE', '25'], ['PERICIAS']] },
      ]),
      'manual.xlsx',
    )

    const result = parseBonfireCharacterSheet(workbook, { selectedSheetName: 'Ficha' })
    expect(result.debug.selectedBy).toBe('manual')
    expect(result.debug.selectedSheetName).toBe('Ficha')
    expect(result.character.identity.name.value).toBe('Pipkin')
  })
})
