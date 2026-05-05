import { describe, expect, it } from 'vitest'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'

describe('noAuxiliarySheetsInTemplate', () => {
  it('does not extract items or features from auxiliary sheets', async () => {
    const workbook = await readWorkbook(createBonfireV21Workbook({ includeAuxiliary: true }), 'auxiliary-noise.xlsx')
    const result = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const actor = mapNormalizedToFoundryActor(result.character)
    const itemNames = actor.items.map((item) => item.name)

    expect(result.debug.ignoredSheets).toEqual(expect.arrayContaining(['Attack Info', 'Gear Info', 'Race Info', 'Class Info']))
    expect(itemNames).not.toContain('Artífice')
    expect(itemNames).not.toContain('Associated Skills')
    expect(itemNames).not.toContain('bludgeoning')
    expect(itemNames).not.toContain('piercing')
  })
})
