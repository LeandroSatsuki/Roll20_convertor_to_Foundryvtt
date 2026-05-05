import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log currency fixed', () => {
  it('uses real gp total and not item prices', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)

    expect(result.character.currency.gp.value).toBe(1225)
    expect(result.character.currency.gp.raw ?? '').not.toContain('50. gp')
    expect(result.character.currency.gp.raw ?? '').not.toMatch(/custo/i)
  })
})
