import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('no signed ability scores', () => {
  it('does not turn signed values into ability scores', async () => {
    const rows = Array.from({ length: 110 }, () => Array.from({ length: 40 }, () => ''))
    rows[5][2] = 'Pipkin "Sorte Grande"'
    rows[4][19] = 'Clérigo 5'
    rows[5][19] = 'CLASSE(S) & NIVEL(EIS)'
    rows[6][19] = 'Folken Limalumes'
    rows[7][19] = 'RACA'
    rows[15][15] = 'CA'
    rows[15][16] = '18'
    rows[15][17] = 'PV MAXIMO'
    rows[15][18] = '33'
    rows[15][19] = 'VELOCIDADE'
    rows[15][20] = '25'
    rows[16][9] = 'FORCA'
    rows[16][8] = '-1'
    rows[17][9] = 'DESTREZA'
    rows[17][8] = '+2'
    rows[18][9] = 'CONSTITUICAO'
    rows[18][8] = '+1'
    rows[19][9] = 'INTELIGENCIA'
    rows[19][8] = '+0'
    rows[20][9] = 'SABEDORIA'
    rows[20][8] = '+7'
    rows[21][9] = 'CARISMA'
    rows[21][8] = '+5'
    rows[42][7] = 'PERICIAS'
    rows[44][5] = 'PERCEPCAO PASSIVA'
    rows[44][6] = '14'
    rows[42][17] = 'CARACTERISTICAS DE CLASSE E RACA'
    rows[84][15] = 'MOCHILA & EQUIPAMENTO'

    const workbook = await readWorkbook(createWorkbookData([{ name: 'LOG', rows }]), 'signed-only.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    expect(result.character.abilities.dex.score.value).not.toBe(2)
    expect(result.character.abilities.wis.score.value).not.toBe(7)
    expect(result.character.abilities.str.score.value).not.toBe(-1)
    expect(result.character.warnings.some((warning) => warning.code === 'SHEET_ABILITY_SCORE_MISSING' || warning.code === 'SHEET_ABILITY_NOT_FOUND')).toBe(true)
  })
})
