import { describe, expect, it } from 'vitest'
import { getNamedRangeValue } from '../lib/sheets/templates/namedRanges'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'

describe('namedRanges', () => {
  it('resolves name, classAndLevel and proficiencyBonus', async () => {
    const workbook = await readWorkbook(
      createBonfireV21Workbook({
        namedRanges: [
          { name: 'name', ref: 'LOG!C6' },
          { name: 'classAndLevel', ref: 'LOG!T5' },
          { name: 'proficiencyBonus', ref: 'LOG!T11' },
        ],
      }),
      'named-ranges.xlsx',
    )

    expect(getNamedRangeValue(workbook, 'name')?.cells[0]?.value).toContain('Pipkin')
    expect(getNamedRangeValue(workbook, 'classAndLevel')?.cells[0]?.value).toContain('Clérigo 5')
    expect(getNamedRangeValue(workbook, 'proficiencyBonus')?.cells[0]?.value).toBe('+3')
  })

  it('records a warning when a named range is missing and falls back explicitly', async () => {
    const workbook = await readWorkbook(createBonfireV21Workbook(), 'named-range-missing.xlsx')
    const result = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })

    expect(result.character.identity.name.value).toContain('Pipkin')
    expect(result.character.warnings.some((warning) => warning.code === 'NAMED_RANGE_NOT_FOUND' && warning.fieldPath === 'identity.name')).toBe(true)
  }, 30000)
})
