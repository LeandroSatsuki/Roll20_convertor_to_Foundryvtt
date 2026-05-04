import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('sheet URL handling', () => {
  it('does not accept an image URL as the character name', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'Ficha',
          rows: [
            ['NOME DO PERSONAGEM', 'https://i.imgur.com/3hiMIAQ.jpeg'],
            ['PERSONAGEM', 'Pipkin'],
            ['CLASSE(S) & NIVEL(EIS)', 'Clerigo 5', 'RAÇA', 'Folken'],
            ['ANTECEDENTE', 'Espiao', 'ALINHAMENTO', 'Caotico bom'],
            ['FORÇA', '8', 'DESTREZA', '14', 'CONSTITUIÇÃO', '12'],
            ['INTELIGÊNCIA', '10', 'SABEDORIA', '18', 'CARISMA', '14'],
            ['CA', '18', 'PV MAXIMO', '33', 'DESLOCAMENTO', '25'],
            ['PERÍCIAS'],
            ['Percepção', '+4'],
            ['CARACTERÍSTICAS'],
            ['MOCHILA'],
            ['EQUIPAMENTO'],
            ['PONTOS DE VIDA'],
            ['SABEDORIA PASSIVA', '14'],
          ],
        },
      ]),
      'url-name.xlsx',
    )
    const { character } = parseBonfireCharacterSheet(workbook)

    expect(character.identity.name.value).not.toBe('https://i.imgur.com/3hiMIAQ.jpeg')
    expect(character.identity.name.value).toBe('Pipkin')
    expect(character.media?.avatarUrl?.value).toBe('https://i.imgur.com/3hiMIAQ.jpeg')
    expect(character.warnings.some((warning) => warning.code === 'NAME_CELL_LOOKS_LIKE_URL')).toBe(true)
  })
})
