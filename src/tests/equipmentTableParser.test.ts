import { describe, expect, it } from 'vitest'
import { parseEquipmentTable } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('equipment table parser', () => {
  it('uses ITEM/CUSTO/PESO as headers and only emits item names', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'Ficha',
          rows: [
            ['MOCHILA & EQUIPAMENTO'],
            ['ITEM', 'CUSTO', 'PESO'],
            ['Scale Mail', '50. gp', '45 lb'],
            ['Shield', '10. gp', '6 lb'],
            ['Potion of Healing', 'Priceless', '#'],
            ['RESISTENCIAS'],
          ],
        },
      ]),
      'equipment.xlsx',
    )

    const values = parseEquipmentTable(workbook.sheets[0]).map((value) => value.value)
    expect(values).toEqual(['Scale Mail', 'Shield', 'Potion of Healing'])
    expect(values).not.toContain('50. gp')
    expect(values).not.toContain('45 lb')
    expect(values).not.toContain('ITEM')
    expect(values).not.toContain('#')
  })
})
