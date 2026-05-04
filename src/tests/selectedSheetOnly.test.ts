import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('selected sheet only', () => {
  it('does not extract features or equipment from other sheets', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        { name: 'Ficha', rows: [['PERSONAGEM', 'Pipkin'], ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5'], ['RACA', 'Folken'], ['ANTECEDENTE', 'Espiao'], ['FORCA', '8', 'DESTREZA', '14', 'CONSTITUICAO', '12'], ['INTELIGENCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'], ['CA', '18', 'PV MAXIMO', '33', 'VELOCIDADE', '25'], ['PERICIAS'], ['CARACTERISTICAS DE CLASSE E RACA'], ['Canalizar Divindade'], ['MOCHILA & EQUIPAMENTO'], ['Shield']] },
        { name: 'Data', rows: [['CARACTERISTICAS DE CLASSE E RACA'], ['Artífice'], ['◅ Associated Skills'], ['MOCHILA & EQUIPAMENTO'], ['bludgeoning'], ['piercing']] },
      ]),
      'selected-only.xlsx',
    )

    const { character } = parseBonfireCharacterSheet(workbook, { selectedSheetName: 'Ficha' })
    const names = [...character.features.map((feature) => feature.raw), ...(character.equipment ?? []).map((item) => item.name.value)]
    expect(names).toContain('Canalizar Divindade')
    expect(names).toContain('Shield')
    expect(names).not.toContain('Artífice')
    expect(names).not.toContain('◅ Associated Skills')
    expect(names).not.toContain('bludgeoning')
    expect(names).not.toContain('piercing')
  })
})
