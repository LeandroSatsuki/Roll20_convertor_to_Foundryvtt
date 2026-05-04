import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('parse identity from anchors', () => {
  it('extracts identity values from labels instead of fixed positions', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'Ficha',
          rows: [
            ['', '', '', 'RAÇA', 'Folken'],
            ['', 'ANTECEDENTE', 'Espião'],
            ['FORÇA', '8', '', 'DESTREZA', '14'],
            ['', '', 'NOME DO PERSONAGEM', 'Pipkin Sorte Grande'],
            ['CONSTITUIÇÃO', '12', 'INTELIGÊNCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'],
            ['', 'CLASSE(S) & NIVEL(EIS)', 'Clérigo 5'],
            ['PERÍCIAS'],
            ['CARACTERÍSTICAS'],
            ['MOCHILA'],
            ['EQUIPAMENTO'],
            ['PONTOS DE VIDA'],
            ['SABEDORIA PASSIVA', '14'],
          ],
        },
      ]),
      'identity.xlsx',
    )

    const { character } = parseBonfireCharacterSheet(workbook)
    expect(character.identity.name.value).toBe('Pipkin Sorte Grande')
    expect(character.identity.classText.value).toBe('Clérigo 5')
    expect(character.identity.race.value).toBe('Folken')
    expect(character.identity.background.value).toBe('Espião')
  })
})
