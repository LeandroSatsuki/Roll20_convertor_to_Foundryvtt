import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('sheet section boundaries', () => {
  it('stops features before equipment and resistance sections', async () => {
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
            ['CARACTERISTICAS DE CLASSE E RACA'],
            ['Canalizar Divindade'],
            ['MOCHILA'],
            ['ITEM', 'CUSTO', 'PESO'],
            ['Scale Mail', '50. gp', '45 lb'],
            ['RESISTENCIAS'],
          ],
        },
      ]),
      'boundary.xlsx',
    )

    const { character } = parseBonfireCharacterSheet(workbook)
    const featureNames = character.features.map((feature) => feature.raw)
    expect(featureNames).toContain('Canalizar Divindade')
    expect(featureNames).not.toContain('ITEM')
    expect(featureNames).not.toContain('CUSTO')
    expect(featureNames).not.toContain('Scale Mail')
    expect(featureNames).not.toContain('RESISTENCIAS')
  })
})
