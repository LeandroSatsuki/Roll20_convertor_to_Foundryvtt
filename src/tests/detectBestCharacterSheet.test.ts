import { describe, expect, it } from 'vitest'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('detectBestCharacterSheet', () => {
  it('chooses the sheet with real character anchors over an image-only sheet', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        { name: 'Avatar', rows: [['https://i.imgur.com/3hiMIAQ.jpeg'], ['imagem']] },
        {
          name: 'Ficha',
          rows: [
            ['NOME DO PERSONAGEM', 'Pipkin'],
            ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5', 'RAÇA', 'Folken'],
            ['ANTECEDENTE', 'Espiao'],
            ['FORÇA', '8', 'DESTREZA', '14', 'CONSTITUIÇÃO', '12'],
            ['PERÍCIAS'],
            ['CARACTERÍSTICAS'],
            ['MOCHILA'],
            ['EQUIPAMENTO'],
            ['PONTOS DE VIDA'],
            ['SABEDORIA PASSIVA', '14'],
          ],
        },
      ]),
      'multi-sheet.xlsx',
    )

    const detection = detectBestCharacterSheet(workbook)
    expect(detection.sheetName).toBe('Ficha')
    expect(detection.confidence).toBe('high')
    expect(detection.anchorsFound.map((anchor) => anchor.label)).toContain('NOME DO PERSONAGEM')
  })
})
