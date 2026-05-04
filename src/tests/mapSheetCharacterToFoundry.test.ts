import { describe, expect, it } from 'vitest'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { getInvalidFoundryItemIdentifiers } from '../lib/validation/validateFoundryActor'
import { createPipkinWorkbookData } from './createPipkinWorkbook'

describe('mapSheetCharacterToFoundry', () => {
  it('builds a Foundry actor from Pipkin xlsx data', async () => {
    const workbook = await readWorkbook(createPipkinWorkbookData(), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(character)

    expect(actor.type).toBe('character')
    expect(actor.items.some((item) => item.name === 'Clérigo' && item.type === 'class')).toBe(true)
    expect((actor.system.attributes as any).spellcasting).toBe('wis')
    expect((actor.system.spells as any).spell1.value).toBe(4)
    expect((actor.system.spells as any).spell2.value).toBe(3)
    expect((actor.system.spells as any).spell3.value).toBe(2)
    expect(actor.items.some((item) => item.name === 'Canalizar Divindade')).toBe(true)
    expect(actor.items.some((item) => item.name === 'Conjuração')).toBe(true)
    expect(actor.items.some((item) => item.name === 'Shortbow')).toBe(true)
    expect(actor.items.some((item) => item.name === 'Shield')).toBe(true)
    expect(getInvalidFoundryItemIdentifiers(actor)).toEqual([])
  })
})
