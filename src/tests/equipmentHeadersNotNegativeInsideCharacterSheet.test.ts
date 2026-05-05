import { describe, expect, it } from 'vitest'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'
import { createWorkbookData } from './sheetTestWorkbook'

describe('equipmentHeadersNotNegativeInsideCharacterSheet', () => {
  it('does not penalize ITEM/CUSTO/PESO when they belong to the equipment section', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'LOG',
          rows: [
            ['PERSONAGEM', 'Pipkin'],
            ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5'],
            ['RACA', 'Folken'],
            ['ANTECEDENTE', 'Espiao'],
            ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'],
            ['INTELIGENCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'],
            ['CA', '18', 'PV MAXIMO', '33', 'VELOCIDADE', '25'],
            ['PERICIAS'],
            ['CARACTERISTICAS DE CLASSE E RACA'],
            ['MOCHILA & EQUIPAMENTO'],
            ['ITEM', 'CUSTO', 'PESO'],
            ['Shield', '10 gp', '6 lb'],
          ],
        },
      ]),
      'equipment-headers.xlsx',
    )

    const detection = detectBestCharacterSheet(workbook, { selectedSheetName: 'LOG' })
    const region = detection.selectedRegion

    expect(region).toBeDefined()
    expect(region?.confidence).toMatch(/^(medium|high)$/)
    expect(region?.negativeAnchors.map((anchor) => anchor.label)).not.toEqual(expect.arrayContaining(['ITEM', 'CUSTO', 'PESO']))
    expect(region?.ignoredNegativeAnchors?.map((anchor) => anchor.label)).toEqual(expect.arrayContaining(['ITEM', 'CUSTO', 'PESO']))
  })
})
