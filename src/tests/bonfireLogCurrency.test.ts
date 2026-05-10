import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('bonfire log currency parsing', () => {
  it('extracts the total gp from the coin area in samples/clerigo-level5.xlsx', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    expect(result.character.currency.gp.value).toBe(1225)
    expect(result.character.currency.gp.raw ?? '').not.toContain('50. gp')
  })

  it('does not leak item prices into gp when there is no coin total', async () => {
    const rows = Array.from({ length: 110 }, () => Array.from({ length: 40 }, () => ''))
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
    rows[16][10] = '8'
    rows[17][9] = 'DESTREZA'
    rows[17][10] = '14'
    rows[18][9] = 'CONSTITUICAO'
    rows[18][10] = '12'
    rows[19][9] = 'INTELIGENCIA'
    rows[19][10] = '10'
    rows[20][9] = 'SABEDORIA'
    rows[20][10] = '18'
    rows[21][9] = 'CARISMA'
    rows[21][10] = '14'
    rows[42][7] = 'PERICIAS'
    rows[44][5] = 'PERCEPCAO PASSIVA'
    rows[44][6] = '14'
    rows[42][17] = 'CARACTERISTICAS DE CLASSE E RACA'
    rows[84][15] = 'MOCHILA & EQUIPAMENTO'
    rows[85][15] = 'Scale Mail'
    rows[85][16] = '50. gp'
    rows[86][15] = 'Shield'
    rows[86][16] = '10. gp'

    const workbook = await readWorkbook(createWorkbookData([{ name: 'LOG', rows }]), 'Pipkin-no-coins.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    expect(result.character.currency.gp.value).toBe(0)
    expect(result.character.warnings.some((warning) => warning.code === 'CURRENCY_GP_NOT_FOUND')).toBe(true)
  })
})
