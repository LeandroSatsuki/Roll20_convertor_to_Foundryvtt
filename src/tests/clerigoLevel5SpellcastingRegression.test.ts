import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('clerigo-level5ClericSpellcastingRegression', () => {
  it('keeps clerigo-level5 as a wisdom full caster cleric with d8 hit die', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const bundle = buildConversionBundle(parsed.character, parsed.debug)
    const attributes = bundle.actor.system.attributes as Record<string, unknown>
    const spells = bundle.actor.system.spells as Record<string, Record<string, unknown>>
    const classItem = bundle.actor.items.find((item) => item.type === 'class' && /Cl/i.test(item.name))

    expect(attributes.spellcasting).toBe('wis')
    expect(spells.spell1.value).toBe(4)
    expect(spells.spell2.value).toBe(3)
    expect(spells.spell3.value).toBe(2)
    expect(classItem?.system.hitDice).toBe('d8')
  })
})
